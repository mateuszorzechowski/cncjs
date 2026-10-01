import { EventEmitter } from 'events';
import net from 'net';
import { ReadlineParser } from '@serialport/parser-readline';

/**
 * A controller over TCP instead of a serial port — the Grbl simulator, or a
 * board behind a network bridge. The path is `tcp://host:port`; everything
 * a controller uses of `SerialConnection` works the same, and the baud rate
 * means nothing here.
 */

const PREFIX = 'tcp://';

export const isTcpPath = (path) => typeof path === 'string' && path.startsWith(PREFIX);

const toIdent = (options) => {
  const { path } = { ...options };
  return JSON.stringify({ type: 'socket', path: path });
};

class TcpConnection extends EventEmitter {
    type = 'socket';

    parser = null;

    socket = null;

    writeFilter = (data) => data;

    eventListener = {
      data: (data) => {
        this.emit('data', data);
      },
      close: (hadError) => {
        this.emit('close', hadError ? new Error(`Connection to "${this.settings.path}" failed`) : undefined);
      },
      error: (err) => {
        this.emit('error', err);
      }
    };

    constructor(options) {
      super();

      const { writeFilter, ...rest } = { ...options };

      if (writeFilter) {
        if (typeof writeFilter !== 'function') {
          throw new TypeError(`"writeFilter" must be a function: ${writeFilter}`);
        }

        this.writeFilter = writeFilter;
      }

      const { hostname, port } = isTcpPath(rest.path) ? new URL(rest.path) : {};
      if (!hostname || !port) {
        throw new TypeError(`"path" must be tcp://host:port: ${rest.path}`);
      }

      Object.defineProperties(this, {
        settings: {
          enumerable: true,
          value: { ...rest, host: hostname, port: Number(port) },
          writable: false
        }
      });
    }

    get ident() {
      return toIdent(this.settings);
    }

    get isOpen() {
      return Boolean(this.socket && this.socket.readyState === 'open');
    }

    get isClose() {
      return !this.isOpen;
    }

    // @param {function} callback The error-first callback.
    open(callback) {
      if (this.socket) {
        callback(new Error(`Cannot open "${this.settings.path}"`));
        return;
      }

      const socket = net.connect({ host: this.settings.host, port: this.settings.port });
      this.socket = socket;

      // Until it is open, a failure is the open's answer, not an event.
      const failed = (err) => {
        this.socket = null;
        callback(err);
      };
      socket.once('error', failed);
      socket.once('connect', () => {
        socket.removeListener('error', failed);
        socket.setNoDelay(true);
        socket.on('close', this.eventListener.close);
        socket.on('error', this.eventListener.error);
        this.parser = socket.pipe(new ReadlineParser({ delimiter: '\n' }));
        this.parser.on('data', this.eventListener.data);
        callback(null);
      });
    }

    // @param {function} callback The error-first callback.
    close(callback) {
      if (!this.socket) {
        callback && callback(new Error(`Cannot close "${this.settings.path}"`));
        return;
      }

      const socket = this.socket;
      socket.removeListener('close', this.eventListener.close);
      socket.removeListener('error', this.eventListener.error);
      if (this.parser) {
        this.parser.removeListener('data', this.eventListener.data);
      }
      socket.once('close', () => callback && callback(null));
      socket.destroy();

      this.socket = null;
      this.parser = null;
    }

    write(data, context) {
      if (!this.socket) {
        return;
      }

      data = this.writeFilter(data, context);

      this.socket.write(data);
    }
}

export { toIdent };
export default TcpConnection;
