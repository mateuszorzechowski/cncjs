import net from 'net';
import TcpConnection from '../TcpConnection';
import SerialConnection from '../SerialConnection';
import createConnection from '../create-connection';

/** A server that says hello, and keeps what it is sent. */
const listen = () => new Promise((resolve) => {
  const got = [];
  const server = net.createServer((socket) => {
    socket.write('Grbl 1.1h [\'$\' for help]\r\n');
    socket.on('data', (data) => got.push(data.toString()));
  });
  server.listen(0, '127.0.0.1', () => resolve({ server, got, path: `tcp://127.0.0.1:${server.address().port}` }));
});

const open = (connection) => new Promise((resolve) => connection.open(resolve));

describe('TcpConnection', () => {
  let bench;

  beforeEach(async () => {
    bench = await listen();
  });

  afterEach(() => new Promise((resolve) => bench.server.close(resolve)));

  test('reads whole lines and writes through the filter', async () => {
    const connection = new TcpConnection({ path: bench.path, baudRate: 115200, writeFilter: (data) => data.toUpperCase() });
    const lines = [];
    connection.on('data', (line) => lines.push(line));

    expect(await open(connection)).toBeNull();
    expect(connection.isOpen).toBe(true);

    connection.write('$x\n');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lines).toEqual(['Grbl 1.1h [\'$\' for help]\r']);
    expect(bench.got.join('')).toBe('$X\n');

    await new Promise((resolve) => connection.close(resolve));
    expect(connection.isOpen).toBe(false);
  });

  test('a server that is not there is the answer to open, not an event', async () => {
    const connection = new TcpConnection({ path: 'tcp://127.0.0.1:1' });
    const errors = [];
    connection.on('error', (err) => errors.push(err));

    const err = await open(connection);

    expect(err.code).toBe('ECONNREFUSED');
    expect(errors).toEqual([]);
    expect(connection.isOpen).toBe(false);
  });

  test('refuses a path that is not tcp://host:port', () => {
    expect(() => new TcpConnection({ path: 'COM3' })).toThrow(TypeError);
    expect(() => new TcpConnection({ path: 'tcp://localhost' })).toThrow(TypeError);
  });

  test('one rule picks the connection by its path', () => {
    expect(createConnection({ path: bench.path })).toBeInstanceOf(TcpConnection);
    expect(createConnection({ path: 'COM3', baudRate: 115200 })).toBeInstanceOf(SerialConnection);
  });
});
