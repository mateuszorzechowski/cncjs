import units, { unitNames, UNITS, toMm } from '..';

afterEach(() => units.open({}));

describe('a figure an operator gave', () => {
  it('is millimetres when no units are said, as every older client sends it', () => {
    expect(toMm(10, undefined)).toBe(10);
  });

  it('is turned into millimetres from inches, without floating-point dust', () => {
    expect(toMm(1, 'inch')).toBe(25.4);
    expect(toMm(0.001, 'inch')).toBe(0.0254);
  });

  it('passes through what is not a number, for the handler to refuse', () => {
    expect(toMm(undefined, 'inch')).toBeUndefined();
  });
});

describe('the rule a panel formats with', () => {
  it('starts in millimetres, not restoring', () => {
    expect(units.rule()).toMatchObject({ name: 'mm', restore: false, factor: 1 });
  });

  it('opens from what `.cncrc` kept, and ignores a unit it does not know', () => {
    units.open({ name: 'inch', restore: true });
    expect(units.rule()).toMatchObject({ name: 'inch', restore: true, modal: 'G20' });

    units.open({ name: 'furlong' });
    expect(units.rule().name).toBe('mm');
  });

  it('says so when it changes, with the whole rule', () => {
    const heard = [];
    units.on('change', (rule) => heard.push(rule));

    units.set({ name: 'inch' });
    units.set({ restore: true });

    expect(heard.map(({ name, restore }) => [name, restore])).toEqual([['inch', false], ['inch', true]]);
    units.removeAllListeners('change');
  });

  it.each(unitNames)('%s offers steps and rates a jog can use', (name) => {
    const { jog, digits } = UNITS[name];
    expect(jog.xySteps.length).toBeGreaterThan(0);
    expect(jog.zSteps.length).toBeGreaterThan(0);
    for (const axis of [jog.xy, jog.z]) {
      expect(axis.min).toBeLessThanOrEqual(axis.rate);
      expect([...jog.xySteps, ...jog.zSteps]).toContain(axis.step);
      expect(axis.rate).toBeLessThanOrEqual(axis.max);
    }
    expect(Object.keys(digits).sort()).toEqual(['feed', 'position', 'size']);
  });

  it('never offers an inch rate above the bench machine\'s 5000 mm/min', () => {
    const { xy, z } = UNITS.inch.jog;
    expect(toMm(xy.max, 'inch')).toBeLessThanOrEqual(5000);
    expect(toMm(z.max, 'inch')).toBeLessThanOrEqual(5000);
  });
});

describe("the operator's own jog steps and rates", () => {
  it('are the defaults until somebody sets them', () => {
    expect(units.rule().jog).toEqual(UNITS.mm.jog);
  });

  it('replace the steps offered, and keep the starting step when it is still offered', () => {
    const { rule } = units.setJog({ xySteps: [0.05, 1, 25] });

    expect(rule.jog.xySteps).toEqual([0.05, 1, 25]);
    expect(rule.jog.xy.step).toBe(1);
    // The other group, and the bounds of the rate, are the default's.
    expect(rule.jog.zSteps).toEqual(UNITS.mm.jog.zSteps);
    expect(rule.jog.xy.max).toBe(UNITS.mm.jog.xy.max);
  });

  it('start on the offered step nearest the default when the default is gone', () => {
    const { rule } = units.setJog({ xySteps: [0.5, 2, 20] });

    expect(rule.jog.xy.step).toBe(0.5);
  });

  it('take a starting step and a rate', () => {
    const { rule } = units.setJog({ z: { step: 5, rate: 900 } });

    expect(rule.jog.z).toMatchObject({ step: 5, rate: 900 });
  });

  it('refuse what the jog card cannot offer', () => {
    expect(units.setJog({ xySteps: [] }).error).toBeTruthy();
    expect(units.setJog({ xySteps: [1, 1] }).error).toBeTruthy();
    expect(units.setJog({ xySteps: [10, 1] }).error).toBeTruthy();
    expect(units.setJog({ xySteps: [0, 1] }).error).toBeTruthy();
    expect(units.setJog({ xySteps: [1, 2, 3, 4, 5, 6, 7] }).error).toBeTruthy();
    expect(units.setJog({ xy: { rate: UNITS.mm.jog.xy.max + 1 } }).error).toBeTruthy();
    expect(units.rule().jog).toEqual(UNITS.mm.jog);
  });

  it('are kept per unit: inches have their own', () => {
    units.setJog({ xySteps: [0.5, 5] });
    units.set({ name: 'inch' });
    expect(units.rule().jog).toEqual(UNITS.inch.jog);

    units.setJog({ xySteps: [0.01, 0.1] });
    units.set({ name: 'mm' });
    expect(units.rule().jog.xySteps).toEqual([0.5, 5]);
    expect(units.saved().jog).toEqual({ mm: { xySteps: [0.5, 5] }, inch: { xySteps: [0.01, 0.1] } });
  });

  it('go back to the defaults with null', () => {
    units.setJog({ xySteps: [0.5, 5] });
    units.setJog(null);

    expect(units.rule().jog).toEqual(UNITS.mm.jog);
    expect(units.saved().jog).toBeUndefined();
  });

  it('are read back from .cncrc, and what is not valid there is dropped', () => {
    units.open({ name: 'mm', jog: { mm: { xySteps: [2, 20] }, inch: { xySteps: ['x'] } } });

    expect(units.rule().jog.xySteps).toEqual([2, 20]);
    expect(units.saved().jog).toEqual({ mm: { xySteps: [2, 20] } });
  });
});
