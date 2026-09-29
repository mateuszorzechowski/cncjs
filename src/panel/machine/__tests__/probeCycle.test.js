import {
  CYCLE_MS, CYCLE_ORDER, FIGURES, PLATE_TOP, STOP_MS, cycleAt, figureOfPhase, gapAt, sceneAt,
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

  test('shows the arrow of every move, the short back-off too', () => {
    const into = CYCLE_ORDER.indexOf('retract') * span + CYCLE_MS * 0.4;

    expect(sceneAt('retract', CYCLE_MS * 0.4).arrow).toBeNull();
    // Up, from the plate, lengthened to be read.
    expect(cycleAt(into).scene.arrow).toEqual({ from: PLATE_TOP, to: PLATE_TOP - 24 });
  });
});
