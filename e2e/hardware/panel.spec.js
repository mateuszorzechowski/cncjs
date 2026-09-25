const { test, expect, TEST_PORT } = require('./fixtures');

/**
 * The panel with a controller answering.
 *
 * This is the half a browser cannot reach on its own, and it is the case that
 * proves the whole chain: a second webpack entry, a second React, one socket
 * client shared with the old application, and a machine on a serial port at
 * the end of it.
 *
 * **What moves the machine here, moves it back.** Every case that jogs ends
 * with the axis where it found it, because the next one reads a position. The
 * stop is never pressed: it sends a feed hold and a soft reset, and resetting
 * the controller mid-tier would leave every case after it looking at a machine
 * that had just rebooted.
 *
 * The port is opened through the old application. The panel has had a
 * connection screen of its own since 2026-09-23 and could now open it
 * itself — worth changing, but not in the same breath as adding cases that
 * depend on the port already being open.
 */
test.describe('panel, connected', () => {
  test.skip(!TEST_PORT, 'set CNCJS_TEST_PORT to run the hardware tier');

  // The panel speaks Polish, so its landmarks are found by role rather than
  // by an English name that only ever existed in these cases.
  const bar = (page) => page.getByRole('banner');
  // Which port is open is a fact about the machine, so it moved onto the bar
  // that carries the machine — the one along the bottom is the job now.
  const workPosition = (page) => page.locator('section').filter({ hasText: /pozycja robocza/i }).first();

  /** The panel, in its own page, with the machine already connected. */
  const openPanel = async (grbl, context) => {
    await grbl.connect();
    const panel = await context.newPage();
    // Polish outright: the browser is `en-US` and these cases read the words.
    await panel.goto('/panel/?lng=pl', { waitUntil: 'domcontentloaded' });
    await expect(bar(panel)).toBeVisible({ timeout: 45000 });
    return panel;
  };

  /**
   * The panel, on the screen the jog controls are on.
   *
   * They are not on the dashboard. The mockup does not put them there, and
   * a case that reached for them on the first screen would be asserting
   * against a layout nobody drew.
   */
  const openJog = async (grbl, context) => {
    const panel = await openPanel(grbl, context);
    await panel.getByRole('navigation', { name: 'Nawigacja' })
      .getByRole('button', { name: 'Jog' }).click();
    const jogTile = panel.locator('section')
      .filter({ has: panel.getByRole('group', { name: 'Jog' }) }).first();
    await expect(jogTile).toBeVisible();
    return { panel, jogTile };
  };

  test('sees a machine that was already connected when it loaded', async ({ grbl, context }) => {
    const panel = await openPanel(grbl, context);

    // The trap this guards is the protocol, not a race. `serialport:open`
    // fires once, when the port is opened, and a page loaded afterwards never
    // hears it — so a client that only listens shows "Disconnected" beside a
    // running spindle, for as long as it stays up. The panel asks
    // `/api/controllers` once on startup instead.
    //
    // The old application does *not* do this and has the defect: load it
    // against an already-open port and its Connection widget still offers
    // "Open".
    await expect(bar(panel)).not.toContainText(/disconnected/i);
    await expect(bar(panel)).toContainText(TEST_PORT);
  });

  test('a file goes through $C, and what Grbl refused is kept with it', async ({ grbl, context }) => {
    const panel = await openPanel(grbl, context);
    const name = 'e2e-check.nc';
    // The library on the disk of whoever runs this: one file, of the case's
    // own, taken out again at the end — and its kept check with it.
    const library = (method, body) => panel.evaluate(async ([file, how, data]) => {
      const { token } = await (await fetch('/api/signin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      })).json();
      const res = await fetch(`/api/files/${file}`, {
        method: how,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: data ? JSON.stringify({ data }) : undefined,
      });
      return res.status;
    }, [name, method, body]);

    expect(await library('PUT', 'G21 G90\nG41 G1 X1\nG0 X0\n')).toBe(200);
    try {
      await panel.getByRole('navigation', { name: 'Nawigacja' }).getByRole('button', { name: 'Pliki', exact: true }).click();
      await panel.getByRole('button', { name: new RegExp(name.replace('.', '\\.')) }).click();
      // The server's own check first: G41 is not Grbl's.
      await expect(panel.getByRole('button', { name: /stan/ })).toContainText('niezgodny');

      const verify = panel.getByRole('button', { name: /Sprawdź na sterowniku/ });
      await verify.click();
      const question = panel.getByRole('dialog', { name: 'Sprawdzić program na sterowniku?' });
      await expect(question).toContainText('G54, G90, G21');
      await question.getByRole('button', { name: 'Sprawdź', exact: true }).click();

      // Measured on the bench: in and out of `$C` is a second or so, and
      // Grbl stands Idle after it — no homing lock.
      await expect(verify).toContainText('ostatnio: z błędami', { timeout: 15000 });
      await expect(bar(panel)).toContainText(/idle/i);

      await panel.getByRole('button', { name: /stan/ }).click();
      const sheet = panel.getByRole('dialog', { name: 'Kontrola pliku' });
      await expect(sheet).toContainText('error:20');
      await expect(sheet).toContainText('linia 2');
      await expect(sheet).toContainText('G41 G1 X1');
    } finally {
      await library('DELETE');
    }
  });

  test('shows the state the controller reports', async ({ grbl, context }) => {
    const panel = await openPanel(grbl, context);

    const state = await grbl.readControllerState();
    const activeState = state.controller.state.status.activeState;
    expect(activeState, 'the controller reported no active state').toBeTruthy();

    // Compared against the controller's own report rather than the literal
    // "Idle", so the case still means something on a machine in another state.
    await expect(bar(panel)).toContainText(new RegExp(activeState, 'i'));
  });

  test('reads the work position the controller reports', async ({ grbl, context }) => {
    const panel = await openPanel(grbl, context);

    const state = await grbl.readControllerState();
    const wpos = state.controller.state.status.wpos;

    // Three decimals, fixed, because a reading whose digits move as the value
    // changes cannot be read while the machine is moving — which is the only
    // time anyone looks at it.
    for (const axis of ['x', 'y', 'z']) {
      await expect(
        workPosition(panel),
        `${axis.toUpperCase()} should read what the controller reported`
      ).toContainText(Number(wpos[axis]).toFixed(3));
    }
  });

  /**
   * Jogging moves the machine, and that is the point of the case.
   *
   * On this controller nothing is attached, so the axes move in software only.
   * The jog is symmetric either way — out by one step and back by one step —
   * so the machine ends where it started whatever is bolted to it.
   */
  test('a jog moves the axis by the chosen step, and back', async ({ grbl, context }) => {
    const { jogTile } = await openJog(grbl, context);

    const positionOf = async () => {
      const state = await grbl.readControllerState();
      return parseFloat(state.controller.state.status.wpos.x);
    };

    // 1mm is the default, and it is asserted rather than assumed: the case
    // below measures against it.
    //
    // Anchored, because "1 mm" is a substring of "0.1 mm" and the unanchored
    // form quietly matched the smallest step instead of the chosen one. The
    // XY column comes first in the DOM; the Z column has its own.
    await expect(jogTile.getByRole('button', { name: /^1 mm$/ }).first())
      .toHaveAttribute('aria-pressed', 'true');

    const start = await positionOf();

    /*
     * Away from machine zero first, and back second. Not the other way round.
     *
     * The travel lies in `[-range, 0]`, so machine zero is a *corner* of the
     * envelope, not the middle of it — and with `$20=1` Grbl refuses a move
     * that leaves the envelope rather than clipping it to the edge. Opening
     * the port resets the controller to `mpos 0,0,0`, so `X+` as the first
     * move asks to go outside and the machine does nothing at all, silently.
     *
     * This case used to pass only because whoever ran it last had left the
     * machine parked somewhere in the middle. Found 2026-09-23, the first
     * time the tier was run against a freshly opened port.
     *
     * `exact`, separately, because the pad has diagonals now: the corner keys
     * are named `X+ Y+` and `X+ Y−`, so an unanchored `X+` matches three
     * buttons and Playwright refuses to click any of them. That broke the
     * moment the diagonals were added and nobody saw it, because this tier
     * needs a machine and the kickoff had it down as unmeasured.
     */
    await jogTile.getByRole('button', { name: 'X−', exact: true }).click();
    await expect.poll(positionOf, { timeout: 20000 }).toBeCloseTo(start - 1, 2);

    await jogTile.getByRole('button', { name: 'X+', exact: true }).click();
    await expect.poll(positionOf, { timeout: 20000 }).toBeCloseTo(start, 2);
  });

  test('the step control decides how far a jog goes', async ({ grbl, context }) => {
    const { jogTile } = await openJog(grbl, context);

    const positionOf = async () => {
      const state = await grbl.readControllerState();
      return parseFloat(state.controller.state.status.wpos.y);
    };

    // The smallest step, because this case is about the control mattering and
    // not about how far the machine can travel.
    await jogTile.getByRole('button', { name: /^0\.1 mm$/ }).first().click();
    const start = await positionOf();

    // Negative first, for the reason written out in the case above: machine
    // zero is a corner of the travel and `$20=1` refuses a move out of it.
    await jogTile.getByRole('button', { name: 'Y−', exact: true }).click();
    await expect.poll(positionOf, { timeout: 20000 }).toBeCloseTo(start - 0.1, 3);

    await jogTile.getByRole('button', { name: 'Y+', exact: true }).click();
    await expect.poll(positionOf, { timeout: 20000 }).toBeCloseTo(start, 3);
  });

  test('the stop can be pressed once there is something to stop', async ({ grbl, context }) => {
    const panel = await openPanel(grbl, context);

    // Enabled, and deliberately not pressed. That it becomes pressable is the
    // behaviour; what it does when pressed is covered by unit cases, because
    // a soft reset in the middle of a tier reboots the controller under every
    // case that follows.
    await expect(bar(panel).getByRole('button', { name: /^Stop$/i })).toBeEnabled();
  });

  test('zeroing is offered exactly when the machine would take the line', async ({ grbl, context }) => {
    const panel = await openPanel(grbl, context);
    await panel.getByRole('navigation', { name: 'Nawigacja' })
      .getByRole('button', { name: 'Zerowanie' }).click();

    const zeroX = panel.getByRole('button', { name: 'Zeruj X', exact: true });
    await expect(zeroX).toBeVisible();

    /*
     * The finding this case exists for, measured 2026-09-23.
     *
     * In alarm every controller the server drives begins its feeder with
     * `if (this.runner.isAlarm()) { this.feeder.reset(); return; }`. Pressing
     * Zero Z on an alarmed machine put `G10 L20 P1 Z0` on the socket, left
     * `Stopped sending G-code commands in Alarm mode` in the server log, and
     * changed no offset at all — a live-looking button swallowed in silence.
     *
     * Opening the port resets Grbl, and with `$22=1` it comes up in alarm, so
     * that is the state this tier usually finds. The assertion is the
     * *correspondence* rather than either state, because it is true in both
     * and because a case pinned to alarm would start lying the day somebody
     * unlocks the machine before running it.
     */
    const state = (await panel.getByRole('banner').innerText()).trim();
    const alarmed = /alarm/i.test(state);

    await expect(zeroX).toBeEnabled({ enabled: !alarmed });

    const note = panel.getByText(/serwer wyrzuca wiersz G-code/i);
    await expect(note).toHaveCount(alarmed ? 1 : 0);

    // And nothing was sent either way: this case reads the screen and stops.
    // `G10 L20` writes Grbl's EEPROM, and what the work zero on this machine
    // should be is not a test's decision.
  });

  test('a held jog that stops being confirmed is ended, in millimetres', async ({ grbl, context }) => {
    /*
     * The one command with no end of its own, and the only tier that can see
     * what it costs.
     *
     * Measured 2026-09-24, before there was a deadman: a wedged client held a
     * jog for 15.8 seconds and 166mm at 600 mm/min, and the only thing that
     * stopped it was the axis running out of travel. Nothing else would have
     * — `removeConnection` covers a client that goes, and a client that wedges
     * stays connected.
     *
     * A client that declares a tolerance and then never confirms is exactly a
     * wedged one, without having to wedge a browser to produce it.
     */
    const panel = await openPanel(grbl, context);

    const mposX = async () => {
      const state = await grbl.readControllerState();
      return parseFloat(state.controller.state.status.mpos.x);
    };

    const start = await mposX();

    const cut = await panel.evaluate(async ({ port, toleranceMs }) => {
      // The server serves its own socket.io client (`serveClient: true`), and
      // the panel keeps its own inside the React tree without exposing it —
      // so this is a second client rather than a reach into the first.
      await new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = '/socket.io/socket.io.js';
        tag.onload = resolve;
        tag.onerror = () => reject(new Error('the server did not serve its socket.io client'));
        document.head.appendChild(tag);
      });

      const signIn = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', password: '' }),
      });
      const { token } = await signIn.json();

      // Kept on the window so the move back at the end of the case can use the
      // same client — and therefore the same device, which is what the
      // movement lease is held against.
      const socket = window.io('/', { auth: { token, device: 'a-pendant-that-wedges' } });
      window.deadmanSocket = socket;
      await new Promise((resolve, reject) => {
        socket.on('connect', resolve);
        socket.on('connect_error', reject);
      });

      /*
       * Attached, not merely connected.
       *
       * A refusal goes to a socket in the port's room, and `open` is what
       * joins one — the server keeps no other list. A client that sends
       * commands without attaching can still move the machine and will never
       * hear a word back about it, which is worth knowing and is not what this
       * case is about.
       */
      await new Promise((resolve) => {
        socket.emit('open', port, { controllerType: 'Grbl', baudrate: 115200, rtscts: false }, resolve);
        setTimeout(resolve, 3000);
      });

      const told = new Promise((resolve) => socket.on('command:refused', resolve));

      // Negative, because machine zero is a corner of the travel and `$20=1`
      // refuses a move that leaves it rather than clipping it. And then
      // nothing: no confirmation ever follows.
      socket.emit('command', port, 'jogStart', { x: -1 }, 600, toleranceMs);

      const answer = await Promise.race([
        told,
        new Promise((resolve) => { setTimeout(() => resolve(null), 10000); }),
      ]);

      return { answer, socketId: socket.id };
    }, { port: grbl.port, toleranceMs: 300 });

    // Said rather than only logged, because the client worth telling is the
    // one whose link hiccupped and whose key is still down.
    expect(cut.answer).toEqual({ cmd: 'jogStart', reason: 'not-confirmed' });

    await expect
      .poll(async () => {
        const state = await grbl.readControllerState();
        return String(state?.controller?.state?.status?.activeState || '').toLowerCase();
      }, { timeout: 20000 })
      .toBe('idle');

    const travelled = Math.abs(await mposX() - start);

    /*
     * The number this case exists to produce. A third of a second of tolerance
     * at 600 mm/min is about 3mm of travel, plus the queue and the machine's
     * own deceleration; anything near the 166mm that was measured without a
     * deadman means it is not working.
     */
    expect(travelled).toBeGreaterThan(0);
    expect(travelled).toBeLessThan(20);

    // Written down rather than only asserted: the figure is the point of the
    // case, and a bound that passes says nothing about which side of it the
    // machine is on.
    test.info().annotations.push({
      type: 'travel after the deadman',
      description: `${travelled.toFixed(2)} mm at 600 mm/min, against 166 mm measured without one`,
    });

    // And back where it started, so the next case finds the machine where this
    // one did. The same client, because the lease belongs to the device that
    // was driving and a second one would be refused.
    await panel.evaluate(({ port, distance }) => {
      window.deadmanSocket.emit('command', port, 'jogStep', {
        dir: { x: 1 }, distance, feedrate: 600,
      });
    }, { port: grbl.port, distance: travelled });

    await expect.poll(mposX, { timeout: 20000 }).toBeCloseTo(start, 1);
  });

});
