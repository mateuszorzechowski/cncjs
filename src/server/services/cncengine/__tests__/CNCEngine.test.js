import CNCEngine from '../CNCEngine';
import config from '../../configstore';

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
