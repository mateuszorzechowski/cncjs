import probe, { FIELDS, paramsPatch, probeParams } from '..';
import { read, update } from '../../../api/api.probe';
import config from '../../configstore';

jest.mock('../../configstore', () => ({ set: jest.fn(), get: jest.fn() }));

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
  probe.open({});
  config.set.mockClear();
});

describe('the probe figures', () => {
  test('are the defaults until somebody sets one, with a short fence', () => {
    expect(probe.params()).toMatchObject({ maxZ: 15, maxXY: 15, fast: 100, slow: 25, retract: 2 });
  });

  test('are kept in millimetres whatever they were given in', () => {
    probe.set({ plateThickness: 0.5, fast: 4 }, 'inch');

    expect(probe.params()).toMatchObject({ plateThickness: 12.7, fast: 101.6 });
  });

  test('only what was set is kept, so a new default reaches the rest', () => {
    probe.set({ wallX: 8 }, 'mm');

    expect(probe.saved()).toEqual({ wallX: 8 });
  });

  test.each([
    ['a figure outside its bounds', { maxZ: 500 }, 'maxZ'],
    ['a slow touch faster than the fast one', { slow: 150 }, 'slow'],
    ['a figure that is not one', { plateThickness: 'thick' }, 'plateThickness'],
  ])('refuses %s, names it, and keeps nothing', (_why, patch, name) => {
    probe.set({ wallY: 7 }, 'mm');

    expect(probe.set(patch, 'mm')).toMatchObject({ error: expect.any(String), name });
    expect(probe.saved()).toEqual({ wallY: 7 });
  });

  test('refuses a setting there is no such thing as', () => {
    expect(paramsPatch({ turbo: 1 })).toMatchObject({ error: expect.any(String) });
  });

  test('null is back to the defaults', () => {
    probe.set({ depth: 3 }, 'mm');
    probe.set(null);

    expect(probe.params()).toEqual(probeParams());
  });

  test('what .cncrc holds is checked like a request', () => {
    probe.open({ maxZ: -4, retract: 3 });

    expect(probe.params().maxZ).toBe(FIELDS.maxZ.value);
  });
});

describe('the probe figures, over the API', () => {
  test('are read with what each method uses', () => {
    const { body } = call(read, {});

    expect(body.params.maxZ).toBe(15);
    expect(body.methods.z.fields).toContain('plateThickness');
    expect(body.methods.corner.options.corner).toContain('front-left');
  });

  test('are changed and written down, so a restart keeps them', () => {
    const res = call(update, { body: { params: { toolDiameter: 3.175 }, units: 'mm' } });

    expect(res.body.params.toolDiameter).toBe(3.175);
    expect(config.set).toHaveBeenCalledWith('probe', { toolDiameter: 3.175 });
  });

  test('a wrong one is refused by name, and nothing is written', () => {
    const res = call(update, { body: { params: { retract: 0 }, units: 'mm' } });

    expect(res.statusCode).toBe(400);
    expect(res.body.name).toBe('retract');
    expect(config.set).not.toHaveBeenCalled();
  });
});
