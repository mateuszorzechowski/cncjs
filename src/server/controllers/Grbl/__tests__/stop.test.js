import {
  HOLD_CEILING_SECONDS,
  HOLD_FLOOR_SECONDS,
  hasStopped,
  holdSeconds,
  slowestAcceleration,
} from '../stop';

describe('how hard this machine can brake', () => {
  // The bench machine: `$120`/`$121` 500, `$122` 300.
  const BENCH = { $120: '500.000', $121: '500.000', $122: '300.000' };

  it('takes the slowest axis, because a diagonal stops no faster than its worst', () => {
    expect(slowestAcceleration(BENCH)).toBe(300);
  });

  it('ignores an axis the firmware has not reported', () => {
    expect(slowestAcceleration({ $120: '500', $122: 'nonsense' })).toBe(500);
  });

  it.each([[undefined], [{}], [{ $120: '0' }], [{ $120: '-100' }]])(
    'says nothing rather than zero for %j',
    (settings) => {
      expect(slowestAcceleration(settings)).toBeNull();
    }
  );
});

describe('how long a hold may take', () => {
  // One status query period: the soonest a standstill can be observed.
  const LATENCY = 0.1;

  it('is the deceleration plus the cost of seeing it', () => {
    // 3000 mm/min is 50 mm/s; at 500 mm/sec² that is 0.1s of braking.
    expect(holdSeconds({ feedrate: 3000, acceleration: 500, latencySeconds: LATENCY }))
      .toBeCloseTo(0.2, 6);
  });

  it('never promises sooner than the first report could arrive', () => {
    // 60 mm/min is 1 mm/s, which brakes in 2ms — and cannot be seen that fast.
    expect(holdSeconds({ feedrate: 60, acceleration: 500, latencySeconds: LATENCY }))
      .toBe(HOLD_FLOOR_SECONDS);
  });

  it('caps a machine that would otherwise be waited on for ever', () => {
    expect(holdSeconds({ feedrate: 20000, acceleration: 1, latencySeconds: LATENCY }))
      .toBe(HOLD_CEILING_SECONDS);
  });

  it.each([
    ['no feed rate', { acceleration: 500 }],
    ['no acceleration', { feedrate: 3000 }],
    ['neither', {}],
    ['a machine at rest', { feedrate: 0, acceleration: 500 }],
  ])('gives the most patience, not the least, with %s', (_name, given) => {
    // The safe direction: an unmeasured machine is waited on, not cut short.
    expect(holdSeconds({ ...given, latencySeconds: LATENCY })).toBe(HOLD_CEILING_SECONDS);
  });

  it('is never longer than the half second it replaces was short', () => {
    expect(HOLD_CEILING_SECONDS).toBeGreaterThanOrEqual(0.5);
  });
});

describe('whether the machine has come to rest', () => {
  it.each(['Run', 'Jog', 'Home'])('%s is under way', (activeState) => {
    expect(hasStopped({ activeState })).toBe(false);
  });

  it.each(['Idle', 'Alarm', 'Sleep', 'Check', 'Door'])('%s is at rest', (activeState) => {
    expect(hasStopped({ activeState })).toBe(true);
  });

  // The distinction the whole gap exists for: resetting mid-brake abandons the
  // planner, which is what holding first was chosen to avoid.
  it('is still braking in Hold:1 and stopped in Hold:0', () => {
    expect(hasStopped({ activeState: 'Hold', subState: 1 })).toBe(false);
    expect(hasStopped({ activeState: 'Hold', subState: 0 })).toBe(true);
  });

  it('treats a Hold with no substate as still braking', () => {
    expect(hasStopped({ activeState: 'Hold' })).toBe(false);
  });

  it.each([[undefined], [{}], [{ activeState: '' }]])(
    'reads silence as still moving, for %j',
    (status) => {
      expect(hasStopped(status)).toBe(false);
    }
  );

  // Measured 2026-09-24: a jog this controller is feeding reports `Jog` with
  // `FS:0` between segments and `FS:600` again a tick later.
  it('believes a moving feed rate over the word', () => {
    expect(hasStopped({ activeState: 'Idle', feedrate: 600 })).toBe(false);
    expect(hasStopped({ activeState: 'Hold', subState: 0, feedrate: 600 })).toBe(false);
  });
});
