import { read, update } from '../api.units';
import units from '../../services/units';
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

beforeEach(() => {
  units.open({});
  config.set.mockClear();
});

describe('the units, over the API', () => {
  test('are read as the whole rule', () => {
    expect(call(read, {}).body).toMatchObject({ name: 'mm', restore: false, factor: 1 });
  });

  test('are changed and written down, so a restart keeps them', () => {
    const res = call(update, { body: { name: 'inch', restore: true } });

    expect(res.body).toMatchObject({ name: 'inch', restore: true, modal: 'G20' });
    expect(config.set).toHaveBeenCalledWith('units', { name: 'inch', restore: true });
  });

  test('one half can be changed without the other', () => {
    call(update, { body: { restore: true } });

    expect(units.rule()).toMatchObject({ name: 'mm', restore: true });
  });

  test.each([
    ['a unit that does not exist', { name: 'furlong' }],
    ['a switch that is not a switch', { restore: 'yes' }],
  ])('refuses %s, and keeps nothing', (_why, body) => {
    const res = call(update, { body });

    expect(res.statusCode).toBe(400);
    expect(config.set).not.toHaveBeenCalled();
  });
});

describe('the jog steps, over the API', () => {
  test('are set for the units in force and written down', () => {
    const res = call(update, { body: { jog: { xySteps: [0.5, 5, 50] } } });

    expect(res.statusCode).toBe(200);
    expect(res.body.jog.xySteps).toEqual([0.5, 5, 50]);
    expect(config.set).toHaveBeenLastCalledWith('units', expect.objectContaining({ jog: { mm: { xySteps: [0.5, 5, 50] } } }));
  });

  test('refuse steps that are not rising numbers above nought, and change nothing', () => {
    const res = call(update, { body: { jog: { xySteps: [5, 1] } } });

    expect(res.statusCode).toBe(400);
    expect(units.rule().jog.xySteps).toEqual([0.1, 1, 10, 50]);
  });
});
