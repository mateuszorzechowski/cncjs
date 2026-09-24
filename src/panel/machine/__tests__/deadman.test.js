import {
  BEAT_MS,
  TOLERANCE_START_MS,
  jogToleranceMs,
  observeBeatGap,
  toleranceMsFor,
} from '../deadman';

// The module holds one figure for the page, which is the point of it, so each
// test pushes enough gaps to overwrite whatever the last one left. Same shape
// as `host-timing`'s tests on the server.
const feed = (gapMs, count = 200) => {
  for (let i = 0; i < count; i += 1) {
    observeBeatGap(gapMs);
  }
};

describe('before this browser has measured itself', () => {
  test('a stated value stands, rather than one taken from the first beat', () => {
    /*
     * The first beats of a session are a browser that has just finished
     * loading a page, which is the least typical moment of its life. The
     * server made the same choice for the jog lead, after a startup
     * measurement read 16ms one boot and 40ms the next.
     */
    expect(toleranceMsFor({ worstGapMs: undefined })).toBe(TOLERANCE_START_MS);
    expect(toleranceMsFor({ worstGapMs: 0, linkMs: 60 })).toBe(TOLERANCE_START_MS);
  });

  test('and it is clear of the rhythm it has to survive', () => {
    // Two beats, so one that goes missing is not the end of a jog nobody let
    // go of.
    expect(TOLERANCE_START_MS).toBeGreaterThan(BEAT_MS * 2);
  });
});

describe('once it has', () => {
  test('the tolerance is twice the worst beat, plus the link', () => {
    // One beat's worth so a single late beat is survivable and two in a row
    // are not, and the crossing because a beat has to get there before it
    // counts.
    expect(toleranceMsFor({ worstGapMs: 130, linkMs: 0 })).toBe(260);
    expect(toleranceMsFor({ worstGapMs: 130, linkMs: 63 })).toBe(386);
  });

  test('the worst gap decides it, not the typical one', () => {
    /*
     * The opposite of the choice the jog lead makes from the same machinery,
     * and deliberately: a lead sized too large costs stopping distance on
     * every jog, while a tolerance sized too large costs only the difference
     * between catching a wedged client in 400ms and catching it in 600ms. A
     * tolerance sized too small cuts off a jog nobody let go of.
     */
    feed(100, 199);
    observeBeatGap(420);

    expect(jogToleranceMs(0)).toBe(840);
  });

  test('a link is counted when there is one and not guessed at when there is not', () => {
    feed(100);

    // Null until the link has been timed, which reads as nothing rather than
    // as a guess — and on the one computer that runs both, nothing is right.
    expect(jogToleranceMs(null)).toBe(200);
    expect(jogToleranceMs(63)).toBe(326);
  });

  test('a gap that is not a gap is not a measurement', () => {
    feed(100);

    observeBeatGap(0);
    observeBeatGap(-5);
    observeBeatGap(Number.NaN);

    expect(jogToleranceMs(0)).toBe(200);
  });
});
