import { SerialPort } from 'serialport';
import CNCEngine, { admits } from '../CNCEngine';
import config from '../../configstore';
import store from '../../../store';

jest.mock('serialport', () => ({ SerialPort: { list: jest.fn() } }));

jest.mock('../../configstore', () => {
  const store = {};
  return {
    __esModule: true,
    default: {
      get: (key, fallback) => (key in store ? store[key] : fallback),
      set: (key, value) => { store[key] = value; },
      has: (key) => key in store,
      clear: () => Object.keys(store).forEach((key) => delete store[key]),
    },
  };
});

const CONNECTION_KEY = 'state.connection';
const COM3 = { port: 'COM3', controllerType: 'Grbl', baudrate: 115200 };

describe('remembering what was last opened', () => {
  let engine;
  let sent;

  beforeEach(() => {
    config.clear();
    engine = new CNCEngine();
    sent = [];
    engine.io = { emit: (event, payload) => sent.push({ event, payload }) };
  });

  test('is written where the server can find it again', () => {
    /*
     * Not in a browser, and that is the point. Two pendants and the old
     * application are the ordinary case on this bench, so a choice kept in
     * one browser is a choice the next device does not have — connect `COM3`
     * on the laptop and the phone is still offering `COM1`.
     */
    engine.rememberConnection(COM3);

    expect(config.get(CONNECTION_KEY)).toEqual(COM3);
  });

  test('is told to everybody, not to the port room', () => {
    // A client that has this screen open should follow without reloading,
    // and a client holding nothing is in no room to be told through.
    engine.rememberConnection(COM3);

    expect(sent).toEqual([{ event: 'connection:last', payload: COM3 }]);
  });

  test('opening the same port again says nothing', () => {
    /*
     * Every open would otherwise rewrite `.cncrc` and wake every client, and
     * re-attaching to a port that is already open is the ordinary case — a
     * panel does it on every reload.
     */
    engine.rememberConnection(COM3);
    engine.rememberConnection({ ...COM3 });

    expect(sent).toHaveLength(1);
  });

  test('a different port replaces the last one', () => {
    engine.rememberConnection(COM3);
    engine.rememberConnection({ port: 'COM1', controllerType: 'Marlin', baudrate: 9600 });

    expect(config.get(CONNECTION_KEY)).toEqual({
      port: 'COM1', controllerType: 'Marlin', baudrate: 9600,
    });
    expect(sent).toHaveLength(2);
  });

  test('nothing has been opened yet is an answer of its own', () => {
    // The screen falls back to its defaults rather than to a guess, and
    // `startup` carries null rather than an empty object that reads as one.
    expect(config.get(CONNECTION_KEY, null)).toBeNull();
  });
});

describe('a client request at the door', () => {
  const controllerSaying = (reason) => {
    const refused = [];
    return {
      refused,
      clientRefusal: jest.fn(() => reason),
      refuse: (cmd, why) => refused.push({ cmd, why }),
    };
  };

  test('goes through when the controller has nothing against it', () => {
    const controller = controllerSaying(null);

    expect(admits(controller, 'jogStep')).toBe(true);
    expect(controller.refused).toEqual([]);
  });

  test('is turned away, and told why, when the controller refuses it', () => {
    const controller = controllerSaying('program-running');

    expect(admits(controller, 'write', 'G10 L20 P1 Z0\n')).toBe(false);
    expect(controller.clientRefusal).toHaveBeenCalledWith('write', 'G10 L20 P1 Z0\n');
    expect(controller.refused).toEqual([{ cmd: 'write', why: 'program-running' }]);
  });

  test('goes through on a controller that has no such rule', () => {
    // Marlin, Smoothie and TinyG carry on as they always have.
    expect(admits({ refuse: jest.fn() }, 'gcode')).toBe(true);
  });
});

describe('opening the port unasked', () => {
  let engine;
  let opened;

  // A controller that opens at once, and remembers that it did.
  const FakeController = function FakeController(engine_, options) {
    this.type = 'Grbl';
    this.options = options;
    this.open = (done) => {
      opened.push(options);
      done(null);
    };
    this.destroy = jest.fn();
  };

  const listing = (...paths) => SerialPort.list.mockResolvedValue(paths.map((path) => ({ path })));

  beforeEach(() => {
    config.clear();
    store.unset('controllers');
    engine = new CNCEngine();
    engine.controllerClass = { Grbl: FakeController };
    engine.io = { emit: jest.fn() };
    opened = [];
    config.set(CONNECTION_KEY, COM3);
  });

  afterEach(() => store.unset('controllers'));

  test('does nothing by default: opening a port is the operator\'s decision', async () => {
    listing('COM3');
    await engine.autoConnect();
    expect(opened).toEqual([]);
  });

  test('with `server`, opens the remembered port as it was last opened', async () => {
    config.set('connection.auto', 'server');
    listing('COM3');

    await engine.autoConnect();

    expect(opened).toEqual([{ port: 'COM3', baudrate: 115200, rtscts: false }]);
    expect(store.get('controllers["COM3"]')).toBeTruthy();
  });

  test('not a port that is not there', async () => {
    config.set('connection.auto', 'server');
    listing('COM1');
    await engine.autoConnect();
    expect(opened).toEqual([]);
  });

  test('not one closed by hand — until it is unplugged and plugged back in', async () => {
    config.set('connection.auto', 'server');
    engine.closedByHand.add('COM3');

    listing('COM3');
    await engine.autoConnect();
    expect(opened).toEqual([]);

    // Out of the list: the cable came out, and the hand's say is spent.
    listing();
    await engine.autoConnect();
    listing('COM3');
    await engine.autoConnect();
    expect(opened).toHaveLength(1);
  });

  test('not one already open', async () => {
    config.set('connection.auto', 'server');
    store.set('controllers["COM3"]', { isOpen: () => true });
    listing('COM3');
    await engine.autoConnect();
    expect(opened).toEqual([]);
  });

  test('with `panel`, leaves it to the panel', async () => {
    config.set('connection.auto', 'panel');
    listing('COM3');
    await engine.autoConnect();
    expect(opened).toEqual([]);
  });
});
