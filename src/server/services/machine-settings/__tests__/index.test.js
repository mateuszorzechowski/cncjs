import { MachineSettings, MOST } from '..';

const AT = new Date('2026-09-26T12:00:00Z');
const LATER = new Date('2026-09-26T12:05:00Z');

const opened = (saved) => {
  const service = new MachineSettings();
  service.open(saved);
  return service;
};

afterEach(() => jest.useRealTimers());

describe('the copy', () => {
  test('is what the controller last said, with when', () => {
    const service = opened();

    service.observe('$110', '500.000', AT);
    service.observe('$111', '500.000', AT);

    expect(service.saved().copy).toEqual({ values: { '$110': '500.000', '$111': '500.000' }, time: AT.toISOString() });
  });

  test('the first reading is not a change', () => {
    const service = opened();

    expect(service.observe('$110', '500.000', AT)).toBe(null);
    expect(service.saved().history).toEqual([]);
  });

  test('a copy from `.cncrc` is what the next reading is compared with', () => {
    const service = opened({ copy: { values: { '$110': '500.000' }, time: AT.toISOString() }, history: [] });

    expect(service.observe('$110', '500.000', LATER)).toBe(null);
    expect(service.observe('$111', '400.000', LATER)).toBe(null);
  });

  test('what `.cncrc` holds is not trusted to be the right shape', () => {
    expect(opened({ copy: 'x', history: 'y' }).saved()).toEqual({ copy: { values: {}, time: null }, history: [] });
    expect(opened(undefined).saved()).toEqual({ copy: { values: {}, time: null }, history: [] });
  });
});

describe('the history', () => {
  test('a value that differs from the copy is a change, from and to', () => {
    const service = opened({ copy: { values: { '$110': '500.000' } } });
    const entries = [];
    service.on('entry', (entry) => entries.push(entry));

    service.observe('$110', '800.000', LATER);

    const entry = { time: LATER.toISOString(), name: '$110', from: '500.000', to: '800.000', device: null };
    expect(service.saved().history).toEqual([entry]);
    expect(entries).toEqual([entry]);
  });

  test('a write the panel announced is put down to its device', () => {
    const service = opened({ copy: { values: { '$110': '500.000' } } });

    service.expect('$110', 'laptop');
    service.observe('$110', '800.000', LATER);
    // Only that once: the next change of it came from somewhere else.
    service.observe('$110', '700.000', LATER);

    expect(service.saved().history.map(({ device }) => device)).toEqual(['laptop', null]);
  });

  test('a refused write is forgotten', () => {
    const service = opened({ copy: { values: { '$110': '500.000' } } });

    service.expect('$110', 'laptop');
    service.forget('$110');
    service.observe('$110', '800.000', LATER);

    expect(service.saved().history[0].device).toBe(null);
  });

  test(`keeps the last ${MOST}`, () => {
    const service = opened({ copy: { values: { '$0': '0' } } });

    for (let i = 1; i <= MOST + 5; i += 1) {
      service.observe('$0', String(i), LATER);
    }

    const { history } = service.saved();
    expect(history).toHaveLength(MOST);
    expect(history[history.length - 1].to).toBe(String(MOST + 5));
  });
});

describe('change', () => {
  test('is said once for a burst of `$$` lines', () => {
    jest.useFakeTimers();
    const service = opened();
    const said = [];
    service.on('change', (saved) => said.push(saved));

    for (let i = 0; i < 30; i += 1) {
      service.observe(`$${i}`, '1', AT);
    }
    expect(said).toEqual([]);
    jest.advanceTimersByTime(300);

    expect(said).toHaveLength(1);
    expect(Object.keys(said[0].copy.values)).toHaveLength(30);
  });
});
