import {
  BEFORE_MM, CYCLE_MS, CYCLE_ORDER, FIGURES, PLATE_TOP, STOP_MS, cycleAt, figureOfPhase, gapAt, readoutAt, sceneAt,
} from '../probeCycle';

const at = (fraction) => fraction * CYCLE_MS;

describe('the tool on the drawing', () => {
  test('waits, comes down onto the plate, and rests on it', () => {
    const { frames } = FIGURES.fast;

    expect(gapAt(frames, 0.1)).toBe(84);
    expect(gapAt(frames, 0.425)).toBeCloseTo(42, 6);
    expect(gapAt(frames, 0.9)).toBe(0);
  });

  test('an arrow shows the move while it is under way, to where it ends', () => {
    expect(sceneAt('fast', at(0.3)).arrow).toEqual({ from: PLATE_TOP - gapAt(FIGURES.fast.frames, 0.3), to: PLATE_TOP });
    expect(sceneAt('fast', at(0.9)).arrow).toBeNull();
  });

  test('the travel limit is the same move without the arrow — it is the distance that counts', () => {
    expect(sceneAt('maxZ', at(0.3)).arrow).toBeNull();
  });

  test('a touch lights the contact', () => {
    expect(sceneAt('slow', at(0.9)).contact).toBe(true);
    expect(sceneAt('slow', at(0.05)).contact).toBe(false);
  });

  test('the plate\'s thickness brings the Z0 line in', () => {
    expect(sceneAt('plateThickness', at(0.1)).zero).toBe(0);
    expect(sceneAt('plateThickness', at(0.6)).zero).toBe(1);
  });

  test('loops', () => {
    expect(sceneAt('lift', at(1.3)).gap).toBeCloseTo(sceneAt('lift', at(0.3)).gap, 6);
  });
});

describe('what the machine is doing, as a part of the cycle', () => {
  test.each([
    ['z-fast', 'fast', 1],
    ['z-back', 'retract', 2],
    ['z-settle', 'retract', 2],
    ['z', 'slow', 2],
    ['lift', 'lift', 3],
  ])('%s plays %s, stage %i', (phase, figure, stage) => {
    expect(figureOfPhase(phase)).toBe(figure);
    expect(FIGURES[figure].stage).toBe(stage);
  });
});

describe('the whole cycle, with no figure in hand', () => {
  const span = CYCLE_MS + STOP_MS;

  test('plays each part in the order the machine runs them, and starts again', () => {
    expect(CYCLE_ORDER.map((_, i) => cycleAt(i * span + 10).name)).toEqual(['fast', 'retract', 'slow', 'plateThickness', 'lift']);
    expect(cycleAt(CYCLE_ORDER.length * span + 10).name).toBe('fast');
  });

  test('stops on the last frame of each part before the next', () => {
    const end = sceneAt('fast', CYCLE_MS - 1).gap;

    expect(cycleAt(CYCLE_MS + STOP_MS / 2).scene.gap).toBe(end);
    expect(cycleAt(CYCLE_MS + STOP_MS / 2).name).toBe('fast');
  });

  test('shows the arrow of a move while it moves, shrinking to where it goes', () => {
    const at = (fraction) => cycleAt(CYCLE_ORDER.indexOf('lift') * span + CYCLE_MS * fraction).scene.arrow;
    const length = (arrow) => Math.abs(arrow.to - arrow.from);

    expect(at(0.25).to).toBe(PLATE_TOP - 56);
    expect(length(at(0.25))).toBeGreaterThan(length(at(0.45)));
    // Nearly there, and before it moves: no arrow.
    expect(at(0.58)).toBeNull();
    expect(at(0.1)).toBeNull();
  });
});

describe('the Z the example reads, before and after the zero', () => {
  const mm = { retract: 2, lift: 10, plateThickness: 10 };

  test('against the old zero while it is being found', () => {
    expect(readoutAt('fast', 0, mm)).toEqual({ z: BEFORE_MM, after: false });
    expect(readoutAt('retract', 14, mm).z).toBeCloseTo(BEFORE_MM + 2, 6);
  });

  test('against the new one once written: the plate at the touch, and the lift above it', () => {
    expect(readoutAt('plateThickness', 0, mm)).toEqual({ z: 10, after: true });
    expect(readoutAt('lift', 56, mm).z).toBeCloseTo(20, 6);
  });
});

describe('the Z travel limit', () => {
  test('is drawn with no plate to touch, and ends in the alarm', () => {
    const going = sceneAt('maxZ', CYCLE_MS * 0.4);
    const there = sceneAt('maxZ', CYCLE_MS * 0.9);

    expect(going).toMatchObject({ ghost: true, alarm: false, contact: false });
    expect(there).toMatchObject({ ghost: true, alarm: true, contact: false, gap: 0 });
  });
});
