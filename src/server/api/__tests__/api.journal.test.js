import { fetch, updateSettings } from '../api.journal';
import journal from '../../services/journal';
import config from '../../services/configstore';

jest.mock('../../services/configstore', () => ({ set: jest.fn(), get: jest.fn() }));

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

beforeEach(() => journal.setLevel('info'));

describe('reading the journal', () => {
  test('filters by the query, newest first, with the level it keeps', () => {
    journal.record({ level: 'error', source: 'controller', event: 'alarm', code: 'ALARM:1' });
    journal.record({ level: 'info', source: 'server', event: 'program', code: 'start' });

    const res = call(fetch, { query: { level: 'warn', limit: '10' } });

    expect(res.statusCode).toBe(200);
    expect(res.body.records[0]).toMatchObject({ code: 'ALARM:1' });
    expect(res.body.records.every((entry) => entry.level === 'error' || entry.level === 'warn')).toBe(true);
    expect(res.body.level).toBe('info');
  });

  test('an unknown level is an error, not an empty page', () => {
    expect(call(fetch, { query: { level: 'verbose' } }).statusCode).toBe(400);
  });
});

describe('the level kept', () => {
  test('is changed and written down, so a restart keeps it', () => {
    const res = call(updateSettings, { body: { level: 'debug' } });

    expect(res.body).toEqual({ level: 'debug' });
    expect(journal.threshold).toBe('debug');
    expect(config.set).toHaveBeenCalledWith('journal.level', 'debug');
  });

  test('refuses a level that does not exist', () => {
    const res = call(updateSettings, { body: { level: 'loud' } });

    expect(res.statusCode).toBe(400);
    expect(journal.threshold).toBe('info');
  });
});
