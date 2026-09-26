import { readAuto, updateAuto } from '../api.connection';
import journal from '../../services/journal';
import config from '../../services/configstore';

jest.mock('../../services/configstore', () => {
  const store = {};
  return {
    __esModule: true,
    default: {
      get: (key, fallback) => (key in store ? store[key] : fallback),
      set: (key, value) => { store[key] = value; },
    },
  };
});

const call = (handler, req) => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.send = jest.fn((payload) => {
    res.body = payload;
  });
  handler({ query: {}, body: {}, ...req }, res);
  return res;
};

const recordedSince = (from) => journal.query({}, { limit: 50 }).records.filter((entry) => entry.id > from);

beforeEach(() => journal.setLevel('info'));

describe('who opens the port unasked', () => {
  test('is manual until somebody says otherwise', () => {
    expect(call(readAuto, {}).body).toEqual({ mode: 'manual' });
  });

  test('a change is written in the journal, from what to what', () => {
    const from = journal.nextId - 1;

    call(updateAuto, { body: { mode: 'server' } });
    call(updateAuto, { body: { mode: 'server' } });

    // The second is no change, and says nothing.
    expect(recordedSince(from)).toEqual([
      expect.objectContaining({ event: 'settings', code: 'connection.auto', data: { was: 'manual', mode: 'server' } }),
    ]);
  });

  test('refuses a mode that does not exist', () => {
    expect(call(updateAuto, { body: { mode: 'always' } }).statusCode).toBe(400);
  });

  test('connecting when a panel opens is the device’s own now, not the server’s', () => {
    expect(call(updateAuto, { body: { mode: 'panel' } }).statusCode).toBe(400);
  });

  test('a `panel` left in `.cncrc` from before reads as manual', () => {
    config.set('connection.auto', 'panel');
    expect(call(readAuto, {}).body).toEqual({ mode: 'manual' });
  });
});
