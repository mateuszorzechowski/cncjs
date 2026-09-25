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
