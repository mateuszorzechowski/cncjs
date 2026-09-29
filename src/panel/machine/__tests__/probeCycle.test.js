import {
  CYCLE_MS, FIGURES, PLATE_TOP, figureOfPhase, gapAt, sceneAt,
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
