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
    const empty = { copy: { values: {}, time: null }, history: [], drafts: {} };
    expect(opened({ copy: 'x', history: 'y', drafts: 'z' }).saved()).toEqual(empty);
    expect(opened(undefined).saved()).toEqual(empty);
  });
});

describe('the history', () => {
  // A reading of `$$` is put down when it is over.
  const read = (service, lines, now = LATER) => {
    for (const [name, value] of lines) {
      service.observe(name, value, now);
    }
    service.flush();
    return service.saved().history;
  };

  test('a value that differs from the copy is a change, from and to — and said at once, for the journal', () => {
    const service = opened({ copy: { values: { '$110': '500.000' } } });
    const said = [];
    service.on('entry', (entry) => said.push(entry));

    const history = read(service, [['$110', '800.000']]);

    expect(said).toEqual([{ time: LATER.toISOString(), name: '$110', from: '500.000', to: '800.000', device: null }]);
    expect(history).toEqual([{
      id: 1, time: LATER.toISOString(), source: 'external', device: null, changes: [{ name: '$110', from: '500.000', to: '800.000' }],
    }]);
  });

  test('nothing is put down until the reading is over', () => {
    const service = opened({ copy: { values: { '$110': '500.000' } } });

    service.observe('$110', '800.000', LATER);

    expect(service.saved().history).toEqual([]);
  });

  test('one write is one entry, with every change it made, put down to its device', () => {
    const service = opened({ copy: { values: { '$110': '500.000', '$111': '500.000', '$0': '10' } } });

    service.expect(['$110', '$111'], 'laptop');
    const history = read(service, [['$0', '10'], ['$110', '800.000'], ['$111', '700.000']]);

    expect(history).toEqual([{
      id: 1,
      time: LATER.toISOString(),
      source: 'panel',
      device: 'laptop',
      changes: [{ name: '$110', from: '500.000', to: '800.000' }, { name: '$111', from: '500.000', to: '700.000' }],
    }]);
  });

  test('what else changed in the same reading goes with the write, marked unexpected', () => {
    // Grbl turns `$20` off by itself when `$22` is — and `$20` comes first.
    const service = opened({ copy: { values: { '$20': '1', '$22': '1' } } });

    service.expect(['$22'], 'laptop');
    const [entry] = read(service, [['$20', '0'], ['$22', '0']]);

    expect(entry.source).toBe('panel');
    expect(entry.changes).toEqual([
      { name: '$22', from: '1', to: '0' },
      { name: '$20', from: '1', to: '0', expected: false },
    ]);
  });

  test('a reading no write expected is one entry from outside the panel', () => {
    const service = opened({ copy: { values: { '$20': '1', '$25': '500.000' } } });

    const history = read(service, [['$20', '0'], ['$25', '600.000']]);

    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(expect.objectContaining({ source: 'external', device: null }));
    expect(history[0].changes.map(({ name }) => name)).toEqual(['$20', '$25']);
  });

  test('a write is expected only once: the next change of it came from somewhere else', () => {
    const service = opened({ copy: { values: { '$110': '500.000' } } });

    service.expect(['$110'], 'laptop');
    read(service, [['$110', '800.000']]);
    const history = read(service, [['$110', '700.000']]);

    expect(history.map(({ id, source, device }) => [id, source, device])).toEqual([[1, 'panel', 'laptop'], [2, 'external', null]]);
  });

  test('a refused write is forgotten', () => {
    const service = opened({ copy: { values: { '$110': '500.000' } } });

    service.expect(['$110'], 'laptop');
    service.forget('$110');

    expect(read(service, [['$110', '800.000']])[0].source).toBe('external');
  });

  test('a reading that changed nothing puts nothing down', () => {
    const service = opened({ copy: { values: { '$110': '500.000' } } });

    expect(read(service, [['$110', '500.000']])).toEqual([]);
  });

  test('numbers go on from the history kept in `.cncrc`', () => {
    const kept = { id: 7, time: AT.toISOString(), source: 'external', device: null, changes: [{ name: '$0', from: '9', to: '10' }] };
    const service = opened({ copy: { values: { '$0': '10' } }, history: [kept] });

    const history = read(service, [['$0', '11']]);

    expect(history.map(({ id }) => id)).toEqual([7, 8]);
  });

  test('a history kept one value an entry is read as readings: 100 ms apart or less, and a device makes it a write', () => {
    const at = (ms) => new Date(Date.parse('2026-09-26T16:20:00Z') + ms).toISOString();
    const service = opened({
      history: [
        { time: at(0), name: '$1', from: '25', to: '26', device: 'A' },
        { time: at(20), name: '$110', from: '5000.000', to: '5100.000', device: 'A' },
        // The same device putting it back, one write later.
        { time: at(150), name: '$1', from: '26', to: '25', device: 'A' },
        { time: at(5000), name: '$20', from: '1', to: '0', device: null },
        { time: at(5001), name: '$22', from: '1', to: '0', device: 'B' },
        { time: at(60000), name: '$25', from: '500.000', to: '600.000', device: null },
      ],
    });

    expect(service.saved().history).toEqual([
      {
        id: 1,
        time: at(0),
        source: 'panel',
        device: 'A',
        changes: [{ name: '$1', from: '25', to: '26' }, { name: '$110', from: '5000.000', to: '5100.000' }],
      },
      { id: 2, time: at(150), source: 'panel', device: 'A', changes: [{ name: '$1', from: '26', to: '25' }] },
      {
        id: 3,
        time: at(5000),
        source: 'panel',
        device: 'B',
        changes: [{ name: '$20', from: '1', to: '0', expected: false }, { name: '$22', from: '1', to: '0' }],
      },
      { id: 4, time: at(60000), source: 'external', device: null, changes: [{ name: '$25', from: '500.000', to: '600.000' }] },
    ]);
  });

  test(`keeps the last ${MOST} entries`, () => {
    const service = opened({ copy: { values: { '$0': '0' } } });

    for (let i = 1; i <= MOST + 5; i += 1) {
      read(service, [['$0', String(i)]]);
    }

    const { history } = service.saved();
    expect(history).toHaveLength(MOST);
    expect(history[history.length - 1]).toEqual(expect.objectContaining({ id: MOST + 5, changes: [{ name: '$0', from: String(MOST + 4), to: String(MOST + 5) }] }));
  });
});

describe('the changes waiting to be written', () => {
  test('are set, taken back one by one, and cleared, and kept in `.cncrc`', () => {
    jest.useFakeTimers();
    const service = opened();
    const said = [];
    service.on('change', (saved) => said.push(saved.drafts));

    service.draft({ set: { $110: { text: '3500', raw: false }, $22: { text: '0', raw: true } } });
    service.draft({ set: { $22: null } });
    jest.advanceTimersByTime(300);

    expect(service.saved().drafts).toEqual({ $110: { text: '3500', raw: false } });
    expect(said).toEqual([{ $110: { text: '3500', raw: false } }]);
    expect(service.draft({ clear: true, set: { $0: { text: '12' } } })).toEqual({ $0: { text: '12', raw: false } });
  });

  test('only a `$` setting with a text is taken', () => {
    const service = opened();

    service.draft({ set: { $110: { text: 3500 }, foo: { text: '1' }, $0: 'x', $1: { text: '26' } } });

    expect(service.saved().drafts).toEqual({ $1: { text: '26', raw: false } });
  });

  test('come back from `.cncrc`, checked the same way', () => {
    const service = opened({ drafts: { $110: { text: '3500', raw: false }, bad: { text: '1' } } });

    expect(service.saved().drafts).toEqual({ $110: { text: '3500', raw: false } });
  });

  test('pruned by the rule the caller gives, saying whether any went', () => {
    const service = opened({ drafts: { $110: { text: '3500' }, $111: { text: '5000' } } });

    expect(service.prune((name) => name !== '$111')).toBe(true);
    expect(service.saved().drafts).toEqual({ $110: { text: '3500', raw: false } });
    expect(service.prune(() => true)).toBe(false);
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
