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
