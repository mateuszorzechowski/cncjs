import {
  DEADMAN_CEILING_MS,
  DEADMAN_FLOOR_MS,
  deadmanMsFor,
  isAbandoned,
} from '../deadman';

describe('how long a hold may go unconfirmed', () => {
  test('is what the client asked for, when that is sensible', () => {
    // The client is the side that knows: its own timers and its own link.
    expect(deadmanMsFor(420)).toBe(420);
  });

  test('is clamped rather than trusted', () => {
    // Too small cuts off a jog nobody let go of, which teaches an operator to
    // distrust the pad; too large is not a deadman at all.
    expect(deadmanMsFor(1)).toBe(DEADMAN_FLOOR_MS);
    expect(deadmanMsFor(60000)).toBe(DEADMAN_CEILING_MS);
  });

  test('is nothing at all when the client did not ask', () => {
    /*
     * A client that has never heard of this — the old application, a script, a
     * third-party pendant — would otherwise have every hold cut short by a
     * rule it cannot satisfy. What it is left with is the travel limit, which
     * is what everybody had before.
     */
    expect(deadmanMsFor(undefined)).toBeNull();
    expect(deadmanMsFor(0)).toBeNull();
    expect(deadmanMsFor(-5)).toBeNull();
    expect(deadmanMsFor('soon')).toBeNull();
  });
});

describe('whether a hold has been abandoned', () => {
  test('only once the gap is longer than was agreed', () => {
    const jog = { deadmanMs: 300, confirmedAt: 1000 };

    expect(isAbandoned({ ...jog, now: 1299 })).toBe(false);
    expect(isAbandoned({ ...jog, now: 1300 })).toBe(false);
    expect(isAbandoned({ ...jog, now: 1301 })).toBe(true);
  });

  test('and never when there is no deadman', () => {
    // Including after an hour: a client that opted out is not held to a
    // tolerance it never declared.
    expect(isAbandoned({ deadmanMs: null, confirmedAt: 1000, now: 3600000 })).toBe(false);
  });
});
