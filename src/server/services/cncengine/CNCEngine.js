import { ensureArray } from 'ensure-type';
import isEqual from 'lodash/isEqual';
import noop from 'lodash/noop';
import { SerialPort } from 'serialport';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import EventTrigger from '../../lib/EventTrigger';
import logger from '../../lib/logger';
import settings from '../../config/settings';
import store from '../../store';
import config from '../configstore';
import devices from '../devices';
import journal from '../journal';
import library from '../library';
import units from '../units';
import { commandEntry } from '../journal/commands';
import taskRunner from '../taskrunner';
import monitor from '../monitor';
import {
  GrblController,
  MarlinController,
  SmoothieController,
  TinyGController
} from '../../controllers';
import { GRBL } from '../../controllers/Grbl/constants';
import { autoMode } from './autoMode';
import { MARLIN } from '../../controllers/Marlin/constants';
import { SMOOTHIE } from '../../controllers/Smoothie/constants';
import { G2CORE, TINYG } from '../../controllers/TinyG/constants';
import {
  authorizeIPAddress,
  validateUser
} from '../../access-control';

const log = logger('service:cncengine');

/**
 * Where the last connection is kept, in `.cncrc`.
 *
 * Under `state` because that is the blob this server already persists for
 * things a client would otherwise have to remember for itself, and it is
 * served by `/api/state`.
 */
const CONNECTION_KEY = 'state.connection';

// How often the server looks for the remembered port, with `server` set.
const AUTO_POLL_MS = 5000;

/**
 * Whether a client's request may be carried out now, said out loud when not.
 *
 * Asked here, at the door, rather than inside `command`, because the server
 * calls `command` itself — a tool change, a G-code event — and a rule about
 * what a *client* may do during a program must not refuse the program's own
 * work. Only Grbl has such a rule; the other three carry on as they did.
 */
/**
 * Keep a client's command in the journal, once it has been let in.
 *
 * Here rather than in each controller, because this is where the device that
 * sent it is known and where every controller's commands pass. Which ones are
 * kept, and at what level, is `journal/commands`.
 */
const journalCommand = (socket, port, cmd, detail) => {
  const entry = commandEntry(cmd, detail);
  if (entry) {
    journal.record({ ...entry, port, device: socket.device });
  }
};

export const admits = (controller, cmd, data) => {
  const reason = controller.clientRefusal?.(cmd, data);
  if (reason) {
    controller.refuse(cmd, reason);
    return false;
  }
  return true;
};

// Case-insensitive equality checker.
// @param {string} str1 First string to check.
// @param {string} str2 Second string to check.
// @return {boolean} True if str1 and str2 are the same string, ignoring case.
const caseInsensitiveEquals = (str1, str2) => {
  str1 = str1 ? (str1 + '').toUpperCase() : '';
  str2 = str2 ? (str2 + '').toUpperCase() : '';
  return str1 === str2;
};

const isValidController = (controller) => (
  // Grbl
  caseInsensitiveEquals(GRBL, controller) ||
    // Marlin
    caseInsensitiveEquals(MARLIN, controller) ||
    // Smoothie
    caseInsensitiveEquals(SMOOTHIE, controller) ||
    // g2core
    caseInsensitiveEquals(G2CORE, controller) ||
    // TinyG
    caseInsensitiveEquals(TINYG, controller)
);

class CNCEngine {
    controllerClass = {};

    // Ports closed by hand, which `autoConnect` leaves alone until they are
    // unplugged or the server restarts.
    closedByHand = new Set();

    autoOpening = false;

    autoTimer = null;

    listener = {
      // To everybody, not to a port's room: the journal is the server's, and
      // a panel with no port open still wants to read why the last one closed.
      journalEntry: (entry) => {
        if (this.io) {
          this.io.emit('journal:entry', entry);
        }
      },
      // To everybody: the units are the server's, and a panel with no port
      // open shows figures in them all the same.
      unitsChange: (rule) => {
        if (this.io) {
          this.io.emit('units:change', rule);
        }
      },
      // To everybody too: a file kept from the phone is on the laptop's list.
      libraryChange: () => {
        if (this.io) {
          this.io.emit('files:change');
        }
      },
      taskStart: (...args) => {
        if (this.io) {
          this.io.emit('task:start', ...args);
        }
      },
      taskFinish: (...args) => {
        if (this.io) {
          this.io.emit('task:finish', ...args);
        }
      },
      taskError: (...args) => {
        if (this.io) {
          this.io.emit('task:error', ...args);
        }
      },
      configChange: (...args) => {
        if (this.io) {
          this.io.emit('config:change', ...args);
        }
      },
      watchDirectoryChange: (...args) => {
        if (this.io) {
          this.io.emit('watchdir:change', ...args);
        }
      }
    };

    server = null;

    io = null;

    sockets = [];

    // Event Trigger
    event = new EventTrigger((event, trigger, commands) => {
      log.debug(`EventTrigger: event="${event}", trigger="${trigger}", commands="${commands}"`);
      if (trigger === 'system') {
        taskRunner.run(commands);
      }
    });

    /**
     * Remember what was last opened, and tell everybody.
     *
     * **A connection screen has to offer a choice, and the choice it should
     * offer is the one that was made.** Without this the panel falls back to
     * the first port the operating system lists — which on this bench is
     * `COM1`, an onboard port with nothing on it, while the machine is on
     * `COM3`. So every disconnect threw the selection away, and every reload
     * started from a port that has never been right.
     *
     * **Kept here rather than in a browser, because it has to be the same
     * answer for everybody.** Two pendants and the old application are the
     * ordinary case on this bench, and a memory in `localStorage` is a
     * memory per browser: connect `COM3` on the laptop, and the phone still
     * offers `COM1`. Reported by Mateusz, in those words.
     *
     * **Written when a port is opened, whether or not anything answers on it**,
     * and that was argued the other way first. A client in WSL opens `COM3`
     * as `Marlin` at 9600 within a second of every server start and wins the
     * race; on a Grbl that driver never becomes ready, so recording only a
     * controller that *answered* would keep that squatter out of the memory.
     * It also threw away the connection an operator had just made by hand:
     * connect as Marlin, get no reading, disconnect — and the screen went
     * back to offering Grbl, forgetting the attempt. Mateusz, on seeing it:
     * *"it ought to stay Marlin anyway"*.
     *
     * He is right, and the reason is which case is the ordinary one. Getting
     * a connection right is a loop — change one setting, try again — and a
     * screen that resets the other two settings between tries is fighting the
     * person using it. The squatter is a fault of this one bench, it is
     * written down, and one deliberate connection corrects the memory.
     *
     * **Remembering is not connecting.** Nothing here opens anything; the
     * screen pre-selects and the operator still presses Connect — unless
     * the operator has said otherwise in Settings (`autoMode`), which is
     * the only way a port is ever opened unasked.
     */
    /**
     * With `server`, open the remembered connection whenever it can be:
     * when the server starts, and when its port comes (back) into the list.
     *
     * Not a port somebody closed by hand: that one stays closed until its
     * cable is taken out — it leaves the list — or the server restarts, so
     * Disconnect is never undone behind the operator's back. And not a port
     * already open, by anyone.
     *
     * Opening at start is also what keeps the port from a client that
     * grabs it first with the wrong settings (the WSL client on the bench,
     * which opens COM3 as Marlin): the server is first, and that client's
     * request then clashes and is refused.
     */
    async autoConnect() {
      if (autoMode() !== 'server' || this.autoOpening) {
        return;
      }
      const last = config.get(CONNECTION_KEY, null);
      if (!last?.port) {
        return;
      }
      const listed = (await SerialPort.list().catch(() => [])).map(port => port.path);
      if (!listed.includes(last.port)) {
        this.closedByHand.delete(last.port);
        return;
      }
      if (this.closedByHand.has(last.port) || store.get(`controllers["${last.port}"]`)) {
        return;
      }
      const Controller = this.controllerClass[last.controllerType] || this.controllerClass[GRBL];
      if (!Controller) {
        return;
      }

      this.autoOpening = true;
      const controller = new Controller(this, { port: last.port, baudrate: last.baudrate, rtscts: false });
      controller.open((err = null) => {
        this.autoOpening = false;
        if (err) {
          log.warn(`Could not open ${last.port} automatically: ${err}`);
          controller.destroy();
          return;
        }
        this.event.trigger('port:open');
        journal.record({
          level: 'info',
          source: 'server',
          event: 'port',
          code: 'open',
          port: last.port,
          device: 'server',
          data: { controllerType: controller.type, baudrate: controller.options.baudrate, auto: true },
        });
        store.set(`controllers[${JSON.stringify(last.port)}]`, controller);
      });
    }

    rememberConnection(connection) {
      if (isEqual(config.get(CONNECTION_KEY, null), connection)) {
        return;
      }

      config.set(CONNECTION_KEY, connection);
      log.debug(`Remembered connection: ${JSON.stringify(connection)}`);

      if (this.io) {
        this.io.emit('connection:last', connection);
      }
    }

    // @param {object} server The HTTP server instance.
    // @param {string} controller Specify CNC controller.
    start(server, controller = '') {
      // Fallback to an empty string if the controller is not valid
      if (!isValidController(controller)) {
        controller = '';
      }

      // Grbl
      if (!controller || caseInsensitiveEquals(GRBL, controller)) {
        this.controllerClass[GRBL] = GrblController;
      }
      // Marlin
      if (!controller || caseInsensitiveEquals(MARLIN, controller)) {
        this.controllerClass[MARLIN] = MarlinController;
      }
      // Smoothie
      if (!controller || caseInsensitiveEquals(SMOOTHIE, controller)) {
        this.controllerClass[SMOOTHIE] = SmoothieController;
      }
      // TinyG / G2core
      if (!controller || caseInsensitiveEquals(G2CORE, controller) || caseInsensitiveEquals(TINYG, controller)) {
        this.controllerClass[TINYG] = TinyGController;
      }

      if (Object.keys(this.controllerClass).length === 0) {
        throw new Error(`No valid CNC controller specified (${controller})`);
      }

      const loadedControllers = Object.keys(this.controllerClass);
      log.debug(`Loaded controllers: ${loadedControllers}`);

      this.stop();

      taskRunner.on('start', this.listener.taskStart);
      taskRunner.on('finish', this.listener.taskFinish);
      taskRunner.on('error', this.listener.taskError);
      config.on('change', this.listener.configChange);
      monitor.on('change', this.listener.watchDirectoryChange);
      journal.on('entry', this.listener.journalEntry);
      library.on('change', this.listener.libraryChange);
      units.on('change', this.listener.unitsChange);

      // System Trigger: Startup
      this.event.trigger('startup');

      this.server = server;
      this.io = new SocketIOServer(this.server, {
        serveClient: true,
        path: '/socket.io',

        /*
         * How long a client may go on believing in a link that is gone.
         *
         * socket.io's defaults are 25s between pings and 20s to answer one,
         * so a *silent* loss -- a phone carried out of range, a mini PC
         * unplugged -- took up to 45 seconds to notice. A browser tab can
         * afford that. A pendant showing "Connected" and live coordinates for
         * three quarters of a minute after the machine stopped answering
         * cannot, and it is the one failure that looks exactly like
         * everything being fine.
         *
         * 10 and 8 puts the worst case at 18 seconds. A killed server is
         * still instant either way, because the socket closes.
         *
         * The cost is a packet every ten seconds per client on a LAN, which
         * is nothing next to the status reports already flowing.
         */
        pingInterval: 10000,
        pingTimeout: 8000,
      });

      this.io.use(async (socket, next) => {
        try {
          // IP Address Access Control
          const ipaddr = socket.handshake.address;
          await authorizeIPAddress(ipaddr);

          // Socket.IO v4 carries credentials in `handshake.auth`, but the
          // query string is still read as well: pendants and other third-party
          // clients pass the token that way, and it is also what a URL opened
          // by hand will carry.
          const token = socket.handshake.auth?.token || socket.handshake.query?.token;
          let user = {};
          if (token) {
            user = jwt.verify(token, settings.secret) || {};
          }

          // User Validation
          await validateUser(user);

          // Replaces `socket.decoded_token` from socketio-jwt, which pinned an
          // old jsonwebtoken and spoke the v2 middleware idiom.
          socket.user = user;
        } catch (err) {
          log.warn(err);
          next(err);
          return;
        }

        next();
      });

      // Now that there is somewhere to say a port opened.
      this.autoTimer = setInterval(() => this.autoConnect(), AUTO_POLL_MS);
      this.autoConnect();

      this.io.on('connection', (socket) => {
        const address = socket.handshake.address;
        const user = socket.user || {};

        /*
         * Which device this is, as distinct from which socket.
         *
         * socket.io issues a new id every time a client reconnects, and a
         * phone carried around a workshop reconnects — so anything that has to
         * outlive a dropped connection cannot be keyed on the socket. The
         * movement lease is the first such thing: held against a socket id it
         * would be lost by its own owner, mid-jog, to itself.
         *
         * The client says who it is and the server takes its word for it.
         * There is nothing to secure here — a device that lied would be
         * claiming the right to move a machine it can already move — and the
         * alternative, an address, is one identity for every tab on a computer
         * and a different one for the same phone on a different network.
         *
         * **The socket id is the fallback, not a shared null.** A client that
         * sends nothing — the old application, a script — is still one client
         * and still holds its own lease; it just cannot survive its own
         * reconnection, which is exactly the behaviour there was before.
         */
        socket.device = socket.handshake.auth?.device || socket.handshake.query?.device || socket.id;
        // And what it says of itself, with the address it came from — so the
        // journal names it rather than showing its id (`services/devices`).
        if (socket.handshake.auth?.device) {
          const { deviceName, deviceInfo } = socket.handshake.auth;
          devices.seen(socket.device, { ...(deviceInfo || {}), name: deviceName, ip: address });
        }
        log.debug(`New connection from ${address}: id=${socket.id}, user.id=${user.id}, user.name=${user.name}`);

        // Add to the socket pool
        this.sockets.push(socket);

        socket.emit('startup', {
          loadedControllers: Object.keys(this.controllerClass),

          // User-defined baud rates and ports
          baudrates: ensureArray(config.get('baudrates', [])),
          ports: ensureArray(config.get('ports', [])),

          // What was last opened, so a screen that has to offer a choice can
          // offer the one that was made. See `rememberConnection`.
          lastConnection: config.get(CONNECTION_KEY, null),
        });

        // The units rule on arrival, so a panel's first figure is already in
        // them rather than in millimetres until somebody changes the setting.
        socket.emit('units:change', units.rule());

        socket.on('disconnect', () => {
          log.debug(`Disconnected from ${address}: id=${socket.id}, user.id=${user.id}, user.name=${user.name}`);

          const controllers = store.get('controllers', {});
          Object.keys(controllers).forEach(port => {
            const controller = controllers[port];
            if (!controller) {
              return;
            }
            controller.removeConnection(socket);
          });

          // Remove from socket pool
          this.sockets.splice(this.sockets.indexOf(socket), 1);
        });

        // List the available serial ports
        socket.on('list', () => {
          log.debug(`socket.list(): id=${socket.id}`);

          SerialPort.list()
            .then(ports => {
              ports = ports.concat(ensureArray(config.get('ports', [])));

              const controllers = store.get('controllers', {});
              const portsInUse = Object.keys(controllers)
                .filter(port => {
                  const controller = controllers[port];
                  return controller && controller.isOpen();
                });

              ports = ports.map(port => {
                return {
                  port: port.path,
                  manufacturer: port.manufacturer,
                  inuse: portsInUse.indexOf(port.path) >= 0
                };
              });

              socket.emit('serialport:list', ports);
            })
            .catch(err => {
              log.error(err);
            });
        });

        /**
         * Answer immediately, so a client can time the round trip.
         *
         * How long it takes to stop a jog includes getting the word to this
         * process at all, and that is not always nothing: the server is
         * meant to run on a machine of its own with the panel on somebody
         * else's laptop, where releasing a key crosses a network before it
         * reaches the serial port. On the same computer this measures as
         * zero and costs nothing.
         *
         * It answers on the socket that carries the jog commands, because
         * an HTTP request would measure a different connection.
         */
        socket.on('latency', (callback = noop) => {
          if (typeof callback === 'function') {
            callback();
          }
        });

        // Open serial port
        socket.on('open', (port, options, callback = noop) => {
          if (typeof callback !== 'function') {
            callback = noop;
          }

          log.debug(`socket.open("${port}", ${JSON.stringify(options)}): id=${socket.id}`);

          let controller = store.get(`controllers["${port}"]`);

          /*
           * A port that is already open belongs to whoever opened it.
           *
           * Attaching to one is ordinary and stays ordinary -- a second
           * pendant, the old application and a script can all watch the same
           * machine. Asking for *different* settings while attaching is not:
           * the options below are read only when the controller is
           * constructed, so the request used to be dropped on the floor and
           * answered with success. A client would ask for 9600/Marlin, get
           * 115200/Grbl, and have no way to find out.
           *
           * With one client that is a puzzle. With several it is two panels
           * disagreeing about what the machine is, which is the state a
           * pendant must never be in -- reported by Mateusz on 2026-09-23
           * after opening COM1 while COM3 was still running.
           *
           * Said as an error rather than obeyed: re-opening a live port would
           * drop somebody else's connection, possibly mid-job. Close it
           * first, deliberately, or attach on its terms.
           */
          if (controller && controller.isOpen()) {
            const running = controller.options || {};
            const wanted = { ...options };
            const clash = [
              ['controllerType', wanted.controllerType, controller.type],
              ['baudrate', wanted.baudrate, running.baudrate],
            ].find(([, asked, actual]) => (
              asked !== undefined && asked !== null && String(asked) !== String(actual)
            ));

            if (clash) {
              const [setting, asked, actual] = clash;
              log.warn(`socket.open(): serial port "${port}" is already open with `
                + `${setting}=${actual}, refusing ${setting}=${asked}: id=${socket.id}`);

              /*
               * A plain object, not an `Error`.
               *
               * socket.io encodes the callback's arguments as JSON, and an
               * Error has no enumerable properties -- it arrives as `{}`, so
               * every refusal in this file reaches its client as a failure
               * with no reason attached. The panel turns this into a
               * sentence in the operator's own language; it cannot do that
               * with prose, and prose is all an Error would have carried
               * even if it survived.
               */
              callback({
                code: 'port-settings-clash',
                port,
                setting,
                actual: String(actual),
                asked: String(asked),
              });
              return;
            }
          }

          if (!controller) {
            let { controllerType = GRBL, baudrate, rtscts, pin } = { ...options };

            if (controllerType === 'TinyG2') {
              // TinyG2 is deprecated and will be removed in a future release
              controllerType = TINYG;
            }

            const Controller = this.controllerClass[controllerType];
            if (!Controller) {
              const err = `Not supported controller: ${controllerType}`;
              log.error(err);
              callback(new Error(err));
              return;
            }

            const engine = this;
            controller = new Controller(engine, {
              port: port,
              baudrate: baudrate,
              rtscts: !!rtscts,
              pin,
            });
          }

          controller.addConnection(socket);

          if (controller.isOpen()) {
            // Join the room
            socket.join(port);

            callback(null);
            return;
          }

          controller.open((err = null) => {
            if (err) {
              callback(err);
              return;
            }

            // System Trigger: Open a serial port
            this.event.trigger('port:open');

            journal.record({
              level: 'info',
              source: 'server',
              event: 'port',
              code: 'open',
              port,
              device: socket.device,
              data: { controllerType: controller.type, baudrate: controller.options.baudrate },
            });

            this.rememberConnection({
              port,
              controllerType: controller.type,
              baudrate: controller.options.baudrate,
            });

            if (store.get(`controllers["${port}"]`)) {
              log.error(`Serial port "${port}" was not properly closed`);
            }
            store.set(`controllers[${JSON.stringify(port)}]`, controller);

            // Join the room
            socket.join(port);

            callback(null);
          });
        });

        // Close serial port
        socket.on('close', (port, callback = noop) => {
          if (typeof callback !== 'function') {
            callback = noop;
          }

          log.debug(`socket.close("${port}"): id=${socket.id}`);

          const controller = store.get(`controllers["${port}"]`);
          if (!controller) {
            const err = `Serial port "${port}" not accessible`;
            log.error(err);
            callback(new Error(err));
            return;
          }

          // System Trigger: Close a serial port
          this.event.trigger('port:close');

          journal.record({ level: 'info', source: 'server', event: 'port', code: 'close', port, device: socket.device });
          this.closedByHand.add(port);

          // Leave the room
          socket.leave(port);

          controller.close(err => {
            // Remove controller from store
            store.unset(`controllers[${JSON.stringify(port)}]`);

            // Destroy controller
            controller.destroy();

            callback(null);
          });
        });

        socket.on('command', (port, cmd, ...args) => {
          log.debug(`socket.command("${port}", "${cmd}"): id=${socket.id}`);

          const controller = store.get(`controllers["${port}"]`);
          if (!controller || controller.isClose()) {
            log.error(`Serial port "${port}" not accessible`);
            return;
          }

          /*
           * Who asked, for the one command that outlives the request.
           *
           * A held jog is started by one client and ends when *that* client
           * lets go, so the controller has to know whose it is — otherwise a
           * disconnect can only be treated as "somebody left", and stopping
           * the jog on that is wrong the moment a second device is attached.
           * Measured on this network: a phone's socket reconnecting killed a
           * jog another client was holding, 0.8s into it.
           *
           * Set around the call rather than passed as an argument, because
           * `command` is the shared shape of all four controllers and three of
           * them have no use for it. Safe because the handlers that read it run
           * synchronously before their first `await`.
           */
          controller.commandSocket = socket;
          try {
            if (admits(controller, cmd)) {
              journalCommand(socket, port, cmd, cmd === 'gcode' ? { line: args[0] } : undefined);
              controller.command.apply(controller, [cmd].concat(args));
            }
          } finally {
            controller.commandSocket = null;
          }
        });

        socket.on('write', (port, data, context = {}) => {
          log.debug(`socket.write("${port}", "${data}", ${JSON.stringify(context)}): id=${socket.id}`);

          const controller = store.get(`controllers["${port}"]`);
          if (!controller || controller.isClose()) {
            log.error(`Serial port "${port}" not accessible`);
            return;
          }

          controller.commandSocket = socket;
          try {
            if (admits(controller, 'write', data)) {
              journalCommand(socket, port, 'write', { line: String(data).trim() });
              controller.write(data, context);
            }
          } finally {
            controller.commandSocket = null;
          }
        });

        socket.on('writeln', (port, data, context = {}) => {
          log.debug(`socket.writeln("${port}", "${data}", ${JSON.stringify(context)}): id=${socket.id}`);

          const controller = store.get(`controllers["${port}"]`);
          if (!controller || controller.isClose()) {
            log.error(`Serial port "${port}" not accessible`);
            return;
          }

          controller.commandSocket = socket;
          try {
            if (admits(controller, 'write', data)) {
              journalCommand(socket, port, 'write', { line: String(data).trim() });
              controller.writeln(data, context);
            }
          } finally {
            controller.commandSocket = null;
          }
        });
      });
    }

    stop() {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
      if (this.io) {
        this.io.close();
        this.io = null;
      }
      this.sockets = [];
      this.server = null;

      taskRunner.removeListener('start', this.listener.taskStart);
      taskRunner.removeListener('finish', this.listener.taskFinish);
      taskRunner.removeListener('error', this.listener.taskError);
      config.removeListener('change', this.listener.configChange);
      monitor.removeListener('change', this.listener.watchDirectoryChange);
      journal.removeListener('entry', this.listener.journalEntry);
      library.removeListener('change', this.listener.libraryChange);
      units.removeListener('change', this.listener.unitsChange);
    }
}

export default CNCEngine;
