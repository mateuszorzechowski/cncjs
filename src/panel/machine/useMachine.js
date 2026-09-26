import { useCallback, useEffect, useRef, useState } from 'react';
import controller from './controller';
import { deviceId } from './device';
import { describeDevice, ownName } from './deviceName';
import { worstBeatMs } from './deadman';
import { signIn } from './session';
import { fetchOpenController } from './snapshot';
import { readMachine } from './readings';
import { measureLinkMs } from './latency';
import { closePort, openPort } from './ports';
import { t } from '../i18n';

/**
 * Everything the panel knows about the machine, as one hook.
 *
 * The socket client is the one thing taken from the old application. It is
 * framework-free — socket.io and a protocol — and rewriting it would mean
 * rewriting the part of cncjs that actually talks to a controller, which is
 * where its value is.
 *
 * The connection is opened once for the page, not once per component: several
 * tiles want the same readings and a socket each would be several sockets.
 */
export const useMachine = () => {
  /*
   * How many times the panel has tried to reach the server.
   *
   * Bumped by the retry below, and a dependency of the effect that signs in,
   * which is the whole mechanism: a new number means try again.
   */
  const [attempt, setAttempt] = useState(0);

  /*
   * The token, kept past the effect that fetched it.
   *
   * `syncOpenPort` below is called from a socket event rather than from the
   * effect, and signing in again on every one of those would be a round trip
   * for something already in hand.
   */
  const tokenRef = useRef(null);
  const [snapshot, setSnapshot] = useState(() => ({
    connection: 'connecting',
    // Knowing which port is open and being able to send to it are different
    // states, and the gap between them is real time. Until the socket has
    // attached, every control on the panel would look live and do nothing.
    attached: false,
    error: null,
    port: controller.port,
    type: controller.type,
    /** What the open port is running at. Null until a port is open. */
    baudrate: null,
    state: controller.state,
    settings: controller.settings || {},
    job: null,
    /*
     * How long this installation takes to stop a jog, in milliseconds, as
     * measured by the server: the queue it keeps ahead plus the firmware's
     * own reply time. Null until it says. See `machine/stopping`.
     */
    timing: null,
    /*
     * One-way milliseconds to the server. Zero when it is this computer,
     * which is most of the time; not zero when the server is a mini PC by
     * the machine and this is a laptop. Null until measured.
     */
    linkMs: null,
    // The program the sender is holding, as text. See the `gcode:load`
    // handler below for why a panel gets this without asking.
    gcode: null,
    /*
     * The last command the server would not carry out, and why. Null until
     * one is, which on a panel whose buttons are dark before they are pressed
     * is almost always. See `machine/refusal`.
     */
    refusal: null,
    /*
     * Where the machine can reach, as the server works it out. Null until it
     * says — which is also the answer for a controller whose firmware has no
     * such thing to report.
     */
    envelope: null,
    /*
     * The server's units and the rule for showing a millimetre in them. Not
     * the machine's: a panel with no port open shows its figures in them all
     * the same, so it is neither gated on nor cleared with the connection.
     */
    units: null,
    /*
     * Which device the server is letting move the machine, or null when
     * nobody is. Compared with this panel's own id rather than shown: a
     * pendant needs to know whether the keys under its thumb are live, not
     * whose they are. See `machine/device`.
     */
    motion: null,
    // Grbl's alarm number, or null. See `machine/alarm`.
    alarm: null,
    /*
     * This panel's own identity, so the reading above can be compared with it.
     *
     * Read once for the life of the page. It cannot change while the panel is
     * open, and a hook that read it per render would be asking storage a
     * settled question a hundred times a second.
     */
    device: deviceId(),
    /*
     * Whether a program is running, as the server's workflow reports it.
     *
     * Nothing was listening for this, which left `program-running` as a
     * refusal that could only ever arrive *after* a press. Greying out is
     * first on this panel and a message is for the race; without this reading
     * there was only the message.
     */
    workflow: 'idle',
  }));

  /**
   * Attach this socket to a port, opening it if nothing has it yet.
   *
   * One action for two callers that used to be one: the page asking to be
   * reconnected to whatever was already running, and an operator picking a
   * port on the connection screen. The server makes no distinction — `open`
   * joins the socket to the port's room and only touches the hardware if the
   * port is closed — so neither should this.
   *
   * `attached` is set here and nowhere else. It is the difference between
   * knowing a port is open and being able to send to it: `Controller.command`
   * begins `if (!this.port) return`, so a panel that set this on the snapshot
   * alone would have every control look live and do nothing.
   */
  const connect = useCallback(async (port, options) => {
    await openPort(port, options);
    setSnapshot((previous) => ({ ...previous, attached: true }));
  }, []);

  /**
   * Close the port.
   *
   * Nothing is set here: the server answers with `serialport:close`, which the
   * handler below already turns into a panel with no machine. Setting it twice
   * would mean a panel that believes itself disconnected from a port that
   * refused to close.
   */
  const disconnect = useCallback((port) => closePort(port), []);

  /*
   * Ask the server what is open and follow it.
   *
   * Three callers, and the third is the reason this is not inline in the
   * startup effect any more: a port opened or closed by *another client*.
   *
   * `serialport:open` and `serialport:close` only reach the sockets already
   * attached to that controller, so a panel that was watching nothing heard
   * nothing -- connect on the phone and the desktop went on showing
   * "Disconnected" until somebody reloaded it. The event that does reach
   * everybody is `serialport:change`, and this is what it does.
   *
   * Attaching, not merely reading: `Controller.command()` begins
   * `if (!this.port) return`, and the server sends controller updates to the
   * port's room, which a socket joins by opening. A panel that only read the
   * API would show frozen readings and swallow every jog key without a word.
   *
   * Nothing open is an answer too -- it clears the machine rather than
   * leaving the last one on screen.
   */
  const syncOpenPort = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) {
      return;
    }

    const open = await fetchOpenController(token).catch(() => null);

    if (!open) {
      setSnapshot((previous) => (previous.port
        ? { ...previous, port: '', type: '', baudrate: null, state: {}, settings: {}, machineSettings: null, attached: false }
        : previous));
      return;
    }

    setSnapshot((previous) => ({ ...previous, ...open }));

    // Caught rather than thrown on: the server answered, one port did not
    // join. The honest reading is "disconnected" and the connection screen
    // says the rest -- reporting "no server" here would blame the wrong thing.
    await connect(open.port, {
      controllerType: open.type,
      baudrate: open.baudrate,
      rtscts: open.rtscts,
    }).catch(() => {
      setSnapshot((previous) => ({ ...previous, port: '', type: '', baudrate: null, state: {} }));
    });
  }, [connect]);

  useEffect(() => {
    let live = true;

    const events = {
      'serialport:open': ({ port, controllerType, baudrate }) => {
        // The rate is carried because the connection screen shows what the
        // open port is *running at*, which is not the same as what was last
        // picked from a list -- a panel that attached to a port somebody else
        // opened never picked anything.
        setSnapshot((previous) => ({ ...previous, port, type: controllerType, baudrate }));
      },
      'serialport:close': () => {
        // Gone, and not merely quiet: the panel is no longer attached to
        // anything and its controls have to say so.
        // The readings described a machine that is no longer there. Keeping
        // them on screen would be the panel answering for a controller it can
        // no longer hear.
        setSnapshot((previous) => ({
          ...previous, port: '', type: '', baudrate: null, state: {}, attached: false,
          motion: null, workflow: 'idle', alarm: null, fileCheck: null, fits: null,
        }));
      },
      'controller:state': (type, state) => {
        setSnapshot((previous) => ({ ...previous, type, state }));
      },
      /**
       * The firmware's settings, which arrive once when the port opens and
       * again whenever they are re-read.
       *
       * The panel needs them for one thing so far: whether this machine can
       * home. That is not a preference — it is whether limit switches exist
       * and are turned on, and the only honest source is the controller.
       */
      /**
       * What a jog costs on *this* installation, measured rather than
       * assumed.
       *
       * It is the server's to measure — the queue depth depends on how
       * punctual the host computer's timers are, and the reply time on the
       * cable — and the panel's to turn into a distance, because only the
       * panel knows the feed rate in use.
       */
      'controller:timing': (timing) => {
        setSnapshot((previous) => ({ ...previous, timing }));
      },
      /**
       * Where the machine can reach, from the side that enforces it.
       *
       * The panel decoded `$130`-`$132` and the mask in `$23` for itself, to
       * bound a jog and to draw the outline — two readings of the same four
       * registers, and only one of them was the reading the machine was
       * actually held to. Now there is one, and it is the server's.
       */
      'controller:envelope': (envelope) => {
        setSnapshot((previous) => ({ ...previous, envelope }));
      },
      /**
       * A library file going through `$C`, to every device: how far it has
       * got while it runs, and nothing once it is done — the result comes
       * with the listing, kept with the file. See the server's `check-run`.
       */
      'file:check': (check) => {
        setSnapshot((previous) => ({ ...previous, fileCheck: check?.state === 'running' ? check : null }));
      },
      /**
       * Where each library file leaves the table at the current zero, worked
       * out by the server whenever the zero, the limits or the library move.
       */
      'files:fit': (fits) => {
        setSnapshot((previous) => ({ ...previous, fits: fits || null }));
      },
      'units:change': (units) => {
        setSnapshot((previous) => ({ ...previous, units: units || null }));
      },
      /**
       * Which device is allowed to move the machine.
       *
       * Two pendants and the old application in a tab is the ordinary case
       * here, and nothing arbitrated between them: a travel fired from one
       * device while another was tapping a step key put two sources of motion
       * into one planner. The server now hands movement to whoever last used
       * it, briefly, and says so — to everybody, because greying a key out is
       * something the *other* devices have to do.
       *
       * Null is a real answer and not an absence: it means nobody holds it.
       */
      'controller:motion': (device) => {
        setSnapshot((previous) => ({ ...previous, motion: device || null }));
      },
      // Which alarm, by number: the status report only ever says `Alarm`.
      'controller:alarm': (code) => {
        setSnapshot((previous) => ({ ...previous, alarm: code ?? null }));
      },
      /**
       * Whether a program is running.
       *
       * The server has broadcast this from the beginning and this panel was
       * not listening, which is why `program-running` could only ever arrive
       * as a notice after a press. Now the controls that a program owns are
       * dark while it owns them.
       */
      'workflow:state': (workflow) => {
        setSnapshot((previous) => ({ ...previous, workflow }));
      },
      'controller:settings': (type, settings) => {
        setSnapshot((previous) => ({ ...previous, type, settings }));
      },
      // The same settings described, for the Maszyna tab — see `machine/machineSettings`.
      'machine:settings': (machineSettings) => {
        setSnapshot((previous) => ({ ...previous, machineSettings }));
      },
      /**
       * How far through the job the sender is.
       *
       * It arrives on its own event rather than inside the controller state,
       * because it is the *server's* business — the controller knows only the
       * line it is executing, not how many there are.
       */
      'sender:status': (job) => {
        setSnapshot((previous) => ({ ...previous, job }));
      },
      /**
       * The loaded program, in full.
       *
       * This is the one place the server *remembers* rather than merely
       * relays. `addConnection` replays the sender's own `gcode` to a socket
       * that has just arrived, so a panel refreshed in front of a loaded job
       * is handed the whole program back without anybody uploading it again.
       * Nothing else on this socket behaves that way, and the toolpath screen
       * would be unusable if it did not.
       */
      'gcode:load': (name, gcode) => {
        setSnapshot((previous) => ({ ...previous, gcode: { name, gcode } }));
      },
      'gcode:unload': () => {
        setSnapshot((previous) => ({ ...previous, gcode: null }));
      },

      /**
       * A command this panel sent that the server will not carry out.
       *
       * Only ever the race — a control is dark before it is pressed, so the
       * press that gets this far was live when the thumb came down and was
       * not by the time it landed.
       *
       * Counted, because two identical refusals are two presses. Without a
       * number that changes, the second one is the same object as the first
       * and nothing downstream can tell it happened at all.
       */
      // Whole: a settings write says which setting was refused, and what went before it.
      'command:refused': (refused) => {
        setSnapshot((previous) => ({
          ...previous,
          refusal: { ...refused, seq: (previous.refusal?.seq ?? 0) + 1 },
        }));
      },

      /*
       * The socket going away, which nothing was listening for.
       *
       * This is the bug that let the panel lie. Every reading here arrives as
       * an event, so a socket that stops delivering them leaves the last one
       * frozen on screen -- *"jak wylaczyles serwer to dalej mialem status
       * polaczono"* (2026-09-23). Next to a spindle that is the worst thing
       * this panel can do: a chip reading Connected over a link that has been
       * gone for a minute, and controls that look live.
       *
       * It also explains the other half of the same report, a disconnect on
       * one device not reaching another. socket.io reconnects on its own, and
       * the socket it brings back is a *new* one on the server, attached to
       * no port and in no room -- so the panel would go on showing a machine
       * it could no longer hear from or send to.
       *
       * `failed` rather than a flag of its own, because the retry below
       * already knows what to do with it: five seconds later it signs in
       * again, asks what is open and attaches to it. Everything the panel
       * shows is cleared with it, since none of it can be confirmed.
       */
      /*
       * A port opened or closed by somebody else.
       *
       * The only port event the server broadcasts to every socket rather than
       * to the room of whoever is already attached -- so it is the only one a
       * panel watching nothing can hear. Connect on the phone and the desktop
       * followed along only after a reload: *"jak na telefonie klikne polacz
       * to na komputerze nie widze dopoki nie odswieze strony"* (2026-09-23).
       *
       * The payload says which port and whether it is in use, and neither is
       * enough to act on: `inuse` is the server's view of every client, not
       * of this one, and this panel may already hold a different port. So it
       * asks rather than infers.
       */
      'serialport:change': () => {
        syncOpenPort();
      },

      disconnect: () => {
        setSnapshot((previous) => ({
          ...previous,
          connection: 'failed',
          error: null,
          attached: false,
          port: '',
          type: '',
          baudrate: null,
          state: {},
          settings: {},
          machineSettings: null,
          job: null,
          motion: null,
          workflow: 'idle',
          alarm: null,
        }));
      },
    };

    const subscribe = () => {
      Object.entries(events).forEach(([name, handler]) => controller.addListener(name, handler));
    };
    const unsubscribe = () => {
      Object.entries(events).forEach(([name, handler]) => controller.removeListener(name, handler));
    };

    subscribe();

    signIn()
      .then(({ token }) => {
        if (!live) {
          return;
        }
        tokenRef.current = token;

        // The identity the movement lease is held against. Sent at the
        // handshake rather than with each command: it is who this client is,
        // not what it is asking for, and the server reads it once.
        // With the name it goes by and what the user agent says of it, so
        // the journal names it from the first entry (`services/devices`);
        // the model follows once asked for (`useDeviceName`).
        const { name, system, browser, model } = describeDevice({ userAgent: window.navigator.userAgent });
        const auth = { token, device: deviceId(), deviceName: ownName() || name, deviceInfo: { system, browser, model } };
        controller.connect('', { auth }, () => {
          if (live) {
            setSnapshot((previous) => ({ ...previous, connection: 'open' }));
          }
        });

        // Ask once what is already open. Without this the panel shows
        // "Disconnected" beside a running machine for as long as the page
        // stays up, because the event that would have told it fired before
        // this page existed. See `syncOpenPort`, which is also what a port
        // opened on another device now runs through.
        //
        // Not chained into the `catch` below: it handles its own failures,
        // and a port that would not join is not a server that is not there.
        syncOpenPort();
      })
      .catch((error) => {
        if (live) {
          setSnapshot((previous) => ({ ...previous, connection: 'failed', error: error.message }));
        }
      });

    return () => {
      live = false;
      unsubscribe();
    };
  }, [connect, syncOpenPort, attempt]);

  /*
   * Try again, for as long as there is nothing there.
   *
   * A panel that cannot reach its server on the first try used to stay dead
   * until somebody reloaded the page — which on a phone, in a pocket, with
   * the garage PC still booting, means the pendant looks broken at exactly
   * the moment it is being picked up. Installed as an application it is
   * worse: there is no address bar to reload from.
   *
   * Only from `failed`. `connecting` is a request already in flight and
   * `open` is a live socket that socket.io reconnects on its own; retrying
   * either would be a second connection racing the first.
   *
   * Five seconds, flat. Exponential backoff is for a server under load that
   * has asked to be left alone — this one is a mini PC that is either off or
   * on, and the operator is standing in front of the machine waiting. A
   * predictable "it comes back within five seconds of the server doing" is
   * worth more here than sparing a request.
   */
  useEffect(() => {
    if (snapshot.connection !== 'failed') {
      return undefined;
    }

    const timer = setTimeout(() => {
      // Said before it is tried, so the chip stops reading "no server" the
      // moment something is being done about it.
      setSnapshot((previous) => ({ ...previous, connection: 'connecting', error: null }));
      setAttempt((count) => count + 1);
    }, 5000);

    return () => clearTimeout(timer);
  }, [snapshot.connection]);

  /*
   * Time the link, now and every half minute, for as long as there is one.
   *
   * Not once: a panel is carried around a workshop and a link that was fast
   * at the bench is not the link it has by the machine. Not often either —
   * five round trips is enough to be worth trusting and too many to repeat
   * for no reason.
   *
   * Keyed on being attached rather than started inside the attach, because
   * attaching is now something an operator can do twice: a timer started by
   * the second connection would leave the first one's running, and a panel
   * that has been reconnected three times would be measuring the link three
   * times a half-minute.
   */
  useEffect(() => {
    if (!snapshot.attached) {
      return undefined;
    }

    let live = true;
    const timeTheLink = () => {
      measureLinkMs().then((linkMs) => {
        if (live && linkMs !== null) {
          setSnapshot((previous) => ({ ...previous, linkMs }));
        }
      });
    };

    timeTheLink();
    const timer = setInterval(timeTheLink, 30000);

    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [snapshot.attached]);

  const machine = readMachine(snapshot);

  // The one place a state key becomes a word. `readings` is the tier Jest
  // runs, so it names the state and stops; everything downstream reads
  // `status.word` exactly as it did before.
  return {
    ...machine,
    /*
     * How punctual this panel's own confirmations of a held jog have been.
     *
     * Not part of `readings`, and deliberately: that tier is a pure function
     * of the snapshot and runs with no browser, while this is a measurement
     * the page has been accumulating since it loaded. Read at render rather
     * than stored, because nothing needs to re-render when it changes — the
     * one place it is shown is opened on demand.
     */
    beatMs: worstBeatMs(),
    status: {
      ...machine.status,
      word: machine.status.key ? t(machine.status.key) : machine.status.word,
    },
    // What the connection screen does. Nothing else calls these, and nothing
    // else may: opening a port from two places is two panels disagreeing
    // about which machine this is.
    connect,
    disconnect,
  };
};

export default useMachine;
