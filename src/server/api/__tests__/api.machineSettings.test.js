import { exportFile, importFile } from '../api.machineSettings';
import machineSettings from '../../services/machine-settings';

const call = (handler, req) => {
  const res = { statusCode: 200, headers: {} };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.set = jest.fn((name, value) => {
    res.headers[name] = value;
  });
  res.send = jest.fn((payload) => {
    res.body = payload;
  });
  handler({ query: {}, body: {}, ...req }, res);
  return res;
};

beforeEach(() => {
  machineSettings.open({
    copy: { values: { $110: '5000.000', $0: '10', $22: '1', $100: '250.000' }, time: '2026-09-28T10:00:00.000Z' },
    history: [],
  });
});

describe('export', () => {
  test('the settings as `$$` says them, in `$` order, as a file', () => {
    const res = call(exportFile, {});

    expect(res.body).toBe('; cncjs $$ 2026-09-28T10:00:00.000Z\n$0=10\n$22=1\n$100=250.000\n$110=5000.000\n');
    expect(res.headers['Content-Disposition']).toMatch(/attachment; filename="grbl-settings.txt"/);
  });
});

describe('import', () => {
  test('what differs from the controller, what it does not know, and how many match', () => {
    const text = '; a comment\r\n$0=10\r\n$110=3500.000\r\n$22 = 0 (homing)\r\n$400=2\r\nok\r\n$100=250';

    expect(call(importFile, { body: { text } }).body).toEqual({
      changes: [{ name: '$110', value: '3500.000' }, { name: '$22', value: '0' }],
      unknown: ['$400'],
      same: 2,
    });
  });

  test('a file that is not text is refused', () => {
    expect(call(importFile, { body: {} }).statusCode).toBe(400);
  });

  test('what an export writes, imported again, changes nothing', () => {
    const text = call(exportFile, {}).body;

    expect(call(importFile, { body: { text } }).body).toEqual({ changes: [], unknown: [], same: 4 });
  });
});
