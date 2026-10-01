import SerialConnection from './SerialConnection';
import TcpConnection, { isTcpPath } from './TcpConnection';

/** A serial port by its path, or `tcp://host:port` over the network. */
const createConnection = (options) => (isTcpPath(options?.path) ? new TcpConnection(options) : new SerialConnection(options));

export default createConnection;
