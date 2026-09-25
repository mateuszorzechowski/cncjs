/*
 * The panel in any state, without asking the machine for it.
 *
 * The left half of the review overlay. Mateusz, 2026-09-24: *"menedżer stanów
 * aplikacji, żebym nie musiał strzelać do serwera, ale mógł przetestować stany
 * alarmów, wartości, ładować predefiniowany program"*. A bare Arduino can be
 * put in one alarm out of ten; the other nine, a program at 60%, a lease held
 * by another pendant — those were a script against the server each, or not
 * seen at all.
 *
 * **How.** Every reading on the panel arrives as an event on one object, the
 * socket controller, which the development build hands over as
 * `window.__panelController`. While a simulation is on:
 *
 * - the machine's own events are held back at the socket, so the real status
 *   report four times a second does not overwrite what is being looked at;
 * - what is set here is handed to the panel as those same events;
 * - what the panel sends — a press of Odblokuj, a jog — goes nowhere and is
 *   listed here instead. Nothing reaches the machine, so nothing can move it
 *   or write to its EEPROM.
 *
 * Switching off replays the last real event of each kind, and the panel is
 * back on the machine. A page reload keeps the simulation — the overlay
 * reloads the page itself whenever the bundle changes.
 *
 * Loaded by `design-review-overlay.js`; served by `design-review.js`.
 */
(() => {
  const HOST = window.__reviewHost
    || `${window.location.protocol}//${window.location.hostname}:8765`;
  const controller = window.__panelController;
  const KEEP = 'rv-sim';

  // The events that describe the machine. Everything else — the socket's own
  // comings and goings, the journal — carries on as normal.
  const MACHINE_EVENTS = [
    'serialport:open', 'serialport:close', 'serialport:change',
    'controller:state', 'controller:settings', 'controller:alarm', 'controller:motion',
    'controller:envelope', 'workflow:state', 'sender:status', 'feeder:status',
    'gcode:load', 'gcode:unload', 'command:refused',
  ];

  // What the panel is told on the way out when reality never said otherwise.
  const QUIET = {
    'controller:alarm': [null],
    'controller:motion': [null],
    'workflow:state': ['idle'],
    'sender:status': [{ total: 0, sent: 0, received: 0 }],
    'gcode:unload': [],
  };

  const STATES = ['Idle', 'Run', 'Hold', 'Jog', 'Home', 'Alarm', 'Door', 'Check', 'Sleep'];
  const ALARMS = [['', 'bez numeru (blokada bazowania)'],
    ...Array.from({ length: 10 }, (_, i) => [String(i + 1), `ALARM:${i + 1}`])];
  const REFUSALS = ['alarm', 'no-wcs', 'no-travel', 'out-of-envelope', 'no-room', 'program-running',
    'jogging', 'machine-moving', 'held-elsewhere', 'not-confirmed', 'unknown-command'];
  const WCS = ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'];

  const defaults = () => ({
    on: false,
    open: true,
    server: 'ok',
    port: 'open',
    state: 'Idle',
    alarm: '',
    wpos: { x: '0.000', y: '0.000', z: '0.000' },
    mpos: { x: '0.000', y: '0.000', z: '0.000' },
    feedrate: 0,
    spindle: 0,
    tool: '0',
    ov: [100, 100, 100],
    wcs: 'G54',
    units: 'G21',
    program: '',
    workflow: 'idle',
    percent: 0,
    motion: false,
  });

  let sim = defaults();
  try { sim = { ...sim, ...JSON.parse(window.sessionStorage.getItem(KEEP) || '{}') }; } catch (err) { /* private mode */ }
  // Stored by the first version as a boolean.
  if (typeof sim.port === 'boolean') { sim.port = sim.port ? 'open' : 'closed'; }
  const save = () => {
    try { window.sessionStorage.setItem(KEEP, JSON.stringify(sim)); } catch (err) { /* private mode */ }
  };

  // ---- the seam ------------------------------------------------------------

  const real = {};
  const sent = [];
  let program = null;
  let portName = null;

  /*
   * Hand an event to the panel exactly as the controller would, including the
   * few fields the controller keeps on itself — `controller.port` above all,
   * since `command()` does nothing without it.
   */
  const dispatch = (name, ...args) => {
    if (name === 'serialport:open') {
      controller.port = args[0].port;
      controller.type = args[0].controllerType;
    }
    if (name === 'serialport:close') {
      controller.port = '';
      controller.type = '';
      controller.state = {};
    }
    if (name === 'controller:state') {
      controller.type = args[0];
      controller.state = { ...args[1] };
    }
    if (name === 'workflow:state') {
      controller.workflow.state = args[0];
    }
    (controller.listeners[name] || []).slice().forEach((listener) => {
      try { listener(...args); } catch (err) { console.error(`[stany] ${name}`, err); }
    });
  };

  /*
   * Hold the machine's events back at the socket while a simulation is on.
   *
   * Through the socket's public `listeners`/`off`/`on`, and again for every
   * socket the panel opens later — it reconnects on its own after a drop.
   * The last one of each kind is kept either way, so switching off can put
   * the real machine back.
   */
  const gate = (socket) => {
    if (!socket || socket.rvGated) { return; }
    socket.rvGated = true;
    MACHINE_EVENTS.forEach((name) => {
      const handlers = socket.listeners(name);
      socket.off(name);
      handlers.forEach((handler) => socket.on(name, (...args) => {
        real[name] = args;
        if (name === 'gcode:load') { delete real['gcode:unload']; }
        if (name === 'gcode:unload') { delete real['gcode:load']; }
        if (!sim.on) { handler(...args); }
      }));
    });
  };

  /*
   * A new socket is the panel coming back from a drop — a simulated one
   * included. On the way back it asks the server over HTTP what is open,
   * which cannot be held back, so the simulation is put in again after.
   */
  const connect = controller.connect.bind(controller);
  controller.connect = (...args) => {
    connect(...args);
    gate(controller.socket);
    if (sim.on) { setTimeout(() => apply(), 1500); }
  };
  gate(controller.socket);

  // What the panel says on the way out goes to the list, not to the machine.
  const outgoing = (name, original) => (...args) => {
    if (!sim.on) { return original(...args); }
    sent.unshift(`${new Date().toLocaleTimeString()}  ${name} ${args.filter((a) => typeof a !== 'function').map((a) => JSON.stringify(a)).join(' ')}`);
    sent.length = Math.min(sent.length, 12);
    drawSent();
    // A port asked for is a port had: the connection screen waits on this.
    const callback = args.find((a) => typeof a === 'function');
    if (name === 'openPort' && callback) { callback(null); }
    return undefined;
  };
  ['command', 'write', 'writeln', 'openPort', 'closePort'].forEach((name) => {
    controller[name] = outgoing(name, controller[name].bind(controller));
  });

  /*
   * The server, as the panel finds it: signing in is the first thing the
   * panel does, and again every five seconds while it has nothing. Refused,
   * the panel says "Brak serwera"; never answered, it says "Łączenie". Only
   * that one request — everything else goes through.
   */
  const realFetch = window.fetch.bind(window);
  const waiting = [];
  window.fetch = (input, init) => {
    const url = String((input && input.url) || input);
    if (sim.on && sim.server !== 'ok' && url.includes('/api/signin')) {
      if (sim.server === 'down') { return Promise.reject(new TypeError('Failed to fetch')); }
      return new Promise((resolve, reject) => waiting.push({
        go: () => realFetch(input, init).then(resolve, reject),
        fail: () => reject(new TypeError('Failed to fetch')),
      }));
    }
    return realFetch(input, init);
  };
  const release = () => waiting.splice(0).forEach((request) => request.go());
  const refuse = () => waiting.splice(0).forEach((request) => request.fail());

  // ---- what is shown -------------------------------------------------------

  const grblState = () => {
    const base = controller.state && controller.state.status ? controller.state : (real['controller:state'] || [])[1] || {};
    return {
      ...base,
      status: {
        ...(base.status || {}),
        activeState: sim.state === 'none' ? undefined : sim.state,
        subState: 0,
        wpos: { ...sim.wpos },
        mpos: { ...sim.mpos },
        ov: [...sim.ov],
        feedrate: Number(sim.feedrate),
        spindle: Number(sim.spindle),
      },
      parserstate: {
        ...(base.parserstate || {}),
        modal: { ...((base.parserstate || {}).modal || {}), wcs: sim.wcs, units: sim.units },
        tool: String(sim.tool),
      },
    };
  };

  const job = () => {
    if (!program) { return { total: 0, sent: 0, received: 0 }; }
    const received = Math.round((program.total * sim.percent) / 100);
    return {
      name: program.name,
      total: program.total,
      sent: received,
      received,
      startTime: sim.workflow === 'idle' ? 0 : Date.now() - 60000,
      elapsedTime: sim.workflow === 'idle' ? 0 : 60000,
      remainingTime: sim.workflow === 'idle' ? 0 : Math.round(((100 - sim.percent) / Math.max(sim.percent, 1)) * 60000),
      finishTime: sim.percent >= 100 ? Date.now() : 0,
    };
  };

  // Everything set here, told to the panel. Light enough to call on every
  // change — the program is only handed over when it changes.
  const apply = () => {
    if (!sim.on || sim.server !== 'ok' || sim.port !== 'open' || !controller.port) { return; }
    dispatch('controller:state', 'Grbl', grblState());
    dispatch('controller:alarm', sim.state === 'Alarm' && sim.alarm ? Number(sim.alarm) : null);
    dispatch('controller:motion', sim.motion ? 'inny-panel' : null);
    dispatch('workflow:state', sim.workflow);
    dispatch('sender:status', job());
  };

  /*
   * The port, in the three states the panel tells apart: attached, known but
   * not attached ("Przypinanie"), and none ("Brak portu").
   *
   * Back to open goes the way the panel reopens anything: it hears that a
   * port changed, asks the server what is open, and attaches — the attach
   * being `openPort`, answered here while simulating. `serialport:open` alone
   * would leave it knowing the port and not attached to it. Needs a port
   * that is really open on the server.
   */
  const portTo = (target) => {
    portName = controller.port || portName || 'COM3';
    if (target === 'closed' || target === 'attaching') {
      dispatch('serialport:close', { port: portName });
    }
    if (target === 'attaching') {
      dispatch('serialport:open', { port: portName, controllerType: 'Grbl', baudrate: 115200 });
    }
    if (target === 'open') {
      controller.port = portName;
      controller.type = 'Grbl';
      dispatch('serialport:change', {});
      setTimeout(apply, 800);
    }
  };

  /*
   * The server gone, or not answering. The panel is told its socket dropped
   * and finds the rest out for itself: it retries every five seconds, and
   * the sign-in it retries with is refused or left hanging above. "Łączenie"
   * therefore shows at the first retry, up to five seconds after the click.
   * Back to "ok", the next retry gets through and the panel reattaches.
   */
  const serverTo = (target) => {
    if (target === 'ok') {
      release();
      return;
    }
    // A sign-in left hanging would hold the panel on "Łączenie" for good.
    if (target === 'down' && waiting.length) {
      refuse();
      return;
    }
    dispatch('disconnect', 'simulated');
  };

  const loadProgram = async (name) => {
    sim.program = name;
    save();
    if (!name) {
      program = null;
      dispatch('gcode:unload');
      apply();
      return;
    }
    const text = await (await fetch(`${HOST}/programs/${encodeURIComponent(name)}`)).text();
    program = { name: name.split('/').pop(), total: text.split('\n').filter((line) => line.trim()).length };
    dispatch('gcode:load', program.name, text);
    apply();
  };

  const start = () => {
    // Begin from what the machine is showing, so switching on changes nothing
    // until something is changed.
    const status = (controller.state && controller.state.status) || {};
    if (!sim.on && status.activeState) {
      sim.state = status.activeState;
      if (status.wpos) { sim.wpos = { ...status.wpos }; }
      if (status.mpos) { sim.mpos = { ...status.mpos }; }
      if (status.ov) { sim.ov = [...status.ov]; }
    }
    sim.on = true;
    save();
    apply();
    if (sim.program) { loadProgram(sim.program); }
  };

  const stop = () => {
    sim.on = false;
    save();
    Object.keys(QUIET).forEach((name) => {
      if (name === 'gcode:unload' && real['gcode:load']) { return; }
      if (!real[name]) { dispatch(name, ...QUIET[name]); }
    });
    MACHINE_EVENTS.forEach((name) => {
      // Not the port events: replayed in list order, an old close would
      // follow an open. The port is put back below.
      if (real[name] && !name.startsWith('serialport:') && name !== 'command:refused') { dispatch(name, ...real[name]); }
    });
    // A port or a server taken away by the simulation is still there: attach
    // again, for real this time.
    if (sim.port !== 'open') { portTo('open'); }
    if (sim.server !== 'ok') { release(); }
    /*
     * And ask the server where things stand now. A machine that is sitting
     * still says nothing — Grbl in alarm sends no new status — so the last
     * event held back may be from before the page loaded, or there may be
     * none at all. Measured: without this the panel stayed on the simulated
     * RUN and 123.456 after switching off.
     */
    fetch('/api/controllers').then((r) => r.json()).then(([open]) => {
      if (!open || sim.on) { return; }
      dispatch('controller:state', open.controller.type, open.controller.state);
      dispatch('workflow:state', (open.workflow && open.workflow.state) || 'idle');
      dispatch('sender:status', open.sender || QUIET['sender:status'][0]);
    }).catch(() => {});
  };

  // ---- the panel on the left -------------------------------------------------

  const style = document.createElement('style');
  /*
   * Small enough to fit a laptop screen without scrolling — *"pomniejsz
   * nakładkę, żeby się bez scrolla zmieściła"* (2026-09-24). What the
   * switch does is said in its tooltip rather than in a paragraph.
   */
  style.textContent = `
    #rv-states { position: fixed; z-index: 2147483000; left: 0; top: 0; bottom: 0; width: 214px;
      overflow: hidden auto; box-sizing: border-box; background: #171d25; color: #e6ecf3;
      border-right: 1px solid #3a424c; padding: 6px; font: 11px/1.25 system-ui, sans-serif;
      box-shadow: 6px 0 24px rgba(0,0,0,.4); display: flex; flex-direction: column; gap: 4px; }
    #rv-states * { box-sizing: border-box; }
    #rv-states.shut { width: 30px; padding: 6px 3px; }
    #rv-states.shut > :not(.head) { display: none; }
    #rv-states.shut .head .title { writing-mode: vertical-rl; }
    #rv-states .head { display: flex; gap: 4px; align-items: center; }
    #rv-states.shut .head { flex-direction: column; }
    #rv-states .title { font-weight: 700; letter-spacing: .08em; text-transform: uppercase; flex: 1; }
    #rv-states fieldset { border: 1px solid #3a424c; border-radius: 4px; margin: 0; padding: 2px 5px 5px;
      display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    #rv-states fieldset[disabled] { opacity: .45; }
    #rv-states legend { color: #8b97a6; padding: 0 3px; text-transform: uppercase; letter-spacing: .08em; font-size: 9px; }
    #rv-states .row { display: flex; gap: 3px; align-items: center; min-width: 0; }
    #rv-states .row > span { width: 52px; color: #8b97a6; flex: none; }
    #rv-states input, #rv-states select, #rv-states button { font: inherit; color: #e6ecf3; background: #0e1319;
      border: 1px solid #3a424c; border-radius: 3px; padding: 2px 4px; min-width: 0; height: 20px; }
    #rv-states input[type=number], #rv-states input[type=text] { flex: 1; width: 0; font-family: 'IBM Plex Mono', monospace; }
    #rv-states select, #rv-states input[type=range] { flex: 1; width: 0; }
    #rv-states input[type=range] { padding: 0; }
    #rv-states input[type=checkbox] { height: auto; }
    #rv-states > select, #rv-states fieldset > select { width: 100%; flex: none; }
    #rv-states button { cursor: pointer; background: #2c323a; }
    #rv-states button.on { background: #1b5e34; border-color: #2f9e56; color: #d6f5e2; }
    #rv-states .chips { display: flex; flex-wrap: wrap; gap: 2px; }
    #rv-states .chips button { padding: 1px 5px; }
    #rv-states .chips button.pick { background: #1557c0; border-color: #1557c0; }
    #rv-states .sent { font: 10px/1.3 'IBM Plex Mono', monospace; color: #8b97a6; white-space: pre-wrap;
      word-break: break-all; max-height: 80px; overflow-y: auto; }
  `;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.id = 'rv-states';
  const axes = (key) => ['x', 'y', 'z'].map((a) => `<input type="text" data-pos="${key}.${a}" title="${a.toUpperCase()}">`).join('');
  box.innerHTML = `
    <div class="head">
      <span class="title">Stany</span>
      <button id="rv-sim" title="Symulacja odcina panel od maszyny w obie strony: nic, co tu ustawisz, nie idzie do serwera, a nic, co naciśniesz w panelu, nie idzie do maszyny."></button>
      <button id="rv-shut" title="Zwiń / rozwiń">◂</button>
    </div>
    <fieldset data-sim>
      <legend>Połączenie</legend>
      <div class="row"><span>Serwer</span><div class="chips" data-group="server"><button data-v="ok">Jest</button><button data-v="connecting" title="Pokazuje się przy pierwszej próbie, do 5 s">Łączenie</button><button data-v="down">Brak</button></div></div>
      <div class="row"><span>Port</span><div class="chips" data-group="port"><button data-v="open">Otwarty</button><button data-v="attaching">Przypinanie</button><button data-v="closed">Brak</button></div></div>
    </fieldset>
    <fieldset data-sim>
      <legend>Stan maszyny</legend>
      <div class="chips" data-group="state">${STATES.map((s) => `<button data-v="${s}">${s}</button>`).join('')}<button data-v="none" title="Port otwarty, a sterownik nic nie zgłosił">brak odczytu</button></div>
      <div class="row"><span>Alarm</span><select id="rv-alarm">${ALARMS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
    </fieldset>
    <fieldset data-sim>
      <legend>Wartości</legend>
      <div class="row"><span>Robocza</span>${axes('wpos')}</div>
      <div class="row"><span>Maszyn.</span>${axes('mpos')}</div>
      <div class="row"><span>Posuw</span><input type="number" id="rv-feed" step="100"></div>
      <div class="row"><span>Wrzeciono</span><input type="number" id="rv-spindle" step="1000"></div>
      <div class="row"><span>Narzędzie</span><input type="number" id="rv-tool" min="0"></div>
      <div class="row"><span>Korekty %</span><input type="number" data-ov="0" title="posuw"><input type="number" data-ov="1" title="szybki"><input type="number" data-ov="2" title="wrzeciono"></div>
      <div class="row"><span>Układ</span><select id="rv-wcs">${WCS.map((w) => `<option>${w}</option>`).join('')}</select>
        <select id="rv-units"><option value="G21">mm</option><option value="G20">cale</option></select></div>
    </fieldset>
    <fieldset data-sim>
      <legend>Program</legend>
      <select id="rv-program"><option value="">— bez programu —</option></select>
      <div class="chips" data-group="workflow"><button data-v="idle">Stoi</button><button data-v="running">Jedzie</button><button data-v="paused">Pauza</button></div>
      <div class="row"><span>Postęp <b id="rv-pct"></b></span><input type="range" id="rv-percent" min="0" max="100"></div>
    </fieldset>
    <fieldset data-sim>
      <legend>Inne</legend>
      <label class="row"><input type="checkbox" id="rv-motion"> Ruch trzyma inny panel</label>
      <div class="row"><select id="rv-refusal">${REFUSALS.map((r) => `<option>${r}</option>`).join('')}</select><button id="rv-refuse">Odmów</button></div>
    </fieldset>
    <fieldset data-sim>
      <legend>Panel wysłał — zatrzymane</legend>
      <div class="sent" id="rv-sent"></div>
    </fieldset>`;
  document.body.appendChild(box);

  const $ = (sel) => box.querySelector(sel);
  const $$ = (sel) => Array.from(box.querySelectorAll(sel));

  function drawSent() {
    $('#rv-sent').textContent = sent.length ? sent.join('\n') : '—';
  }

  const draw = () => {
    box.classList.toggle('shut', !sim.open);
    $('#rv-shut').textContent = sim.open ? '◂' : '▸';
    $('#rv-sim').textContent = sim.on ? 'Symulacja' : 'Maszyna';
    $('#rv-sim').classList.toggle('on', sim.on);
    $$('fieldset[data-sim]').forEach((f) => { f.disabled = !sim.on; });
    const chosen = { server: sim.server, port: sim.port, state: sim.state, workflow: sim.workflow };
    $$('[data-group]').forEach((group) => {
      group.querySelectorAll('button').forEach((b) => b.classList.toggle('pick', b.dataset.v === chosen[group.dataset.group]));
    });
    $('#rv-alarm').value = sim.alarm;
    $('#rv-alarm').disabled = sim.state !== 'Alarm';
    $$('[data-pos]').forEach((input) => {
      const [key, axis] = input.dataset.pos.split('.');
      if (document.activeElement !== input) { input.value = sim[key][axis]; }
    });
    $$('[data-ov]').forEach((input) => { input.value = sim.ov[input.dataset.ov]; });
    $('#rv-feed').value = sim.feedrate;
    $('#rv-spindle').value = sim.spindle;
    $('#rv-tool').value = sim.tool;
    $('#rv-wcs').value = sim.wcs;
    $('#rv-units').value = sim.units;
    $('#rv-program').value = sim.program;
    $('#rv-percent').value = sim.percent;
    $('#rv-pct').textContent = `${sim.percent}%`;
    $('#rv-motion').checked = sim.motion;
    drawSent();
    if (window.__reviewRelayout) { window.__reviewRelayout(); }
  };

  window.__reviewStatesWidth = () => (sim.open ? 214 : 30);

  const change = (update) => {
    update();
    save();
    draw();
    apply();
  };

  $('#rv-shut').addEventListener('click', () => { sim.open = !sim.open; save(); draw(); });
  $('#rv-sim').addEventListener('click', () => { if (sim.on) { stop(); } else { start(); } draw(); });
  $$('[data-group]').forEach((group) => group.addEventListener('click', (event) => {
    const v = event.target.dataset && event.target.dataset.v;
    if (v === undefined) { return; }
    change(() => {
      if (group.dataset.group === 'server') { sim.server = v; serverTo(v); }
      if (group.dataset.group === 'port') { sim.port = v; portTo(v); }
      if (group.dataset.group === 'state') { sim.state = v; }
      if (group.dataset.group === 'workflow') { sim.workflow = v; }
    });
  }));
  $('#rv-alarm').addEventListener('change', (e) => change(() => { sim.alarm = e.target.value; }));
  $$('[data-pos]').forEach((input) => input.addEventListener('change', () => change(() => {
    const [key, axis] = input.dataset.pos.split('.');
    const value = Number(input.value);
    sim[key][axis] = Number.isFinite(value) ? value.toFixed(3) : input.value;
  })));
  $$('[data-ov]').forEach((input) => input.addEventListener('change', () => change(() => {
    sim.ov[input.dataset.ov] = Number(input.value) || 0;
  })));
  $('#rv-feed').addEventListener('change', (e) => change(() => { sim.feedrate = Number(e.target.value) || 0; }));
  $('#rv-spindle').addEventListener('change', (e) => change(() => { sim.spindle = Number(e.target.value) || 0; }));
  $('#rv-tool').addEventListener('change', (e) => change(() => { sim.tool = e.target.value || '0'; }));
  $('#rv-wcs').addEventListener('change', (e) => change(() => { sim.wcs = e.target.value; }));
  $('#rv-units').addEventListener('change', (e) => change(() => { sim.units = e.target.value; }));
  $('#rv-percent').addEventListener('input', (e) => change(() => { sim.percent = Number(e.target.value); }));
  $('#rv-motion').addEventListener('change', (e) => change(() => { sim.motion = e.target.checked; }));
  $('#rv-program').addEventListener('change', (e) => loadProgram(e.target.value).then(draw));
  $('#rv-refuse').addEventListener('click', () => {
    dispatch('command:refused', { cmd: 'jogStart', reason: $('#rv-refusal').value });
  });

  fetch(`${HOST}/programs`).then((r) => r.json()).then((names) => {
    $('#rv-program').insertAdjacentHTML('beforeend', names.map((n) => `<option>${n}</option>`).join(''));
    $('#rv-program').value = sim.program;
  }).catch(() => {});

  draw();

  /*
   * After a reload the panel asks the server over HTTP what is open, and that
   * answer is not an event and cannot be held back. So the simulation is put
   * in once the page has settled, and again a moment later for a slow answer.
   */
  if (sim.on) {
    setTimeout(() => {
      if (sim.server !== 'ok') { serverTo(sim.server); }
      if (sim.port !== 'open') { portTo(sim.port); }
      apply();
      if (sim.program) { loadProgram(sim.program); }
    }, 1500);
    setTimeout(apply, 4000);
  }
})();
