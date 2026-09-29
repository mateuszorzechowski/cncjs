import {
  BEFORE_MM, CORNER_MS, ZERO_FROM, cornerAt, cornerReadout, cornerSides, figureAt, loopIn, windowOfPhase,
} from '../cornerCycle';
import { methodOf, stepBeside, stepsOf } from '../probe';

jest.mock('../controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

describe('the L plate on the drawing', () => {
  test('touches each wall twice, fast and then slow, Z then X then Y', () => {
    const lit = [0.13, 0.19, 0.42, 0.48, 0.76, 0.82].map((p) => cornerAt(p).touch?.axis);

    expect(lit).toEqual(['z', 'z', 'x', 'x', 'y', 'y']);
    expect(cornerAt(0.15).touch).toBeNull();
  });

  test('backs off between the two touches', () => {
    expect(cornerAt(0.15).side[1]).toBeLessThan(150);
    expect(cornerAt(0.44).top[0]).toBeLessThan(90);
  });

  test('the tabs follow: Z, X, Y', () => {
    expect([0.1, 0.4, 0.8].map((p) => cornerAt(p).stage)).toEqual([1, 2, 3]);
  });

  test('comes down beside the wall, below the top of the plate, before touching it', () => {
    // From the side the plate's top is at 150; beside the wall the tip is at 186.
    expect(cornerAt(0.34).side).toEqual([60, 186]);
  });

  test('shows the zero at the end', () => {
    expect(cornerAt(0.95).zero).toBe(true);
    expect(cornerAt(0.5).zero).toBe(false);
  });

  test('says the value of the part passing', () => {
    expect(figureAt(0.08)).toBe('fast');
    expect(figureAt(0.25)).toBe('clear');
    expect(figureAt(0.3)).toBe('depth');
    expect(figureAt(0.95)).toBe('cornerThickness');
  });
});

describe('the part that plays', () => {
  test.each([
    ['z-fast', 'zFast'],
    ['z', 'zSlow'],
    ['x-out', 'xOut'],
    ['x-down', 'xDown'],
    ['x-settle', 'xBack'],
    ['y-down', 'yDown'],
    ['y', 'ySlow'],
    ['lift', 'lift'],
  ])('the machine\'s %s plays %s', (phase, part) => {
    expect(windowOfPhase(phase)).toBe(part);
  });

  test('loops inside its part', () => {
    const later = loopIn('x', (0.5 - 0.34) * CORNER_MS * 1.5);

    expect(loopIn('x', 0)).toBeCloseTo(0.34, 6);
    expect(later).toBeGreaterThanOrEqual(0.34);
    expect(later).toBeLessThan(0.5);
  });
});

describe('the corner turns it', () => {
  test('right mirrors across, back mirrors top to bottom, and the probes go the other way', () => {
    expect(cornerSides('front-left')).toMatchObject({ flipX: false, flipY: false, dirs: ['X+', 'Y+'] });
    expect(cornerSides('back-right')).toMatchObject({ flipX: true, flipY: true, dirs: ['X−', 'Y−'] });
  });
});

describe('the example\'s X, Y and Z', () => {
  const mm = { wallX: 10, wallY: 10, cornerThickness: 10 };

  test('against the old zero before it is written', () => {
    const read = cornerReadout(cornerAt(0), 'front-left', mm);

    expect(read.after).toBe(false);
    expect(read.x).toBeCloseTo(35 + BEFORE_MM.x, 6);
  });

  test('once written, the tool over the plate reads as far as it is from the corner', () => {
    const read = cornerReadout(cornerAt(ZERO_FROM + 0.05), 'front-left', mm);

    // Over the Y wall, 30 in from the corner; out in front of it; 30 up (60 px at half a mm each).
    expect(read).toMatchObject({ after: true });
    expect(read.x).toBeCloseTo(30, 6);
    expect(read.y).toBeCloseTo(-42, 6);
    expect(read.z).toBeCloseTo(30, 6);
  });

  test('a right corner reads X the other way', () => {
    const left = cornerReadout(cornerAt(0.95), 'front-left', mm);
    const right = cornerReadout(cornerAt(0.95), 'front-right', mm);

    expect(right.x).toBeCloseTo(-left.x, 6);
  });
});

describe('the corner\'s steps', () => {
  test('the corner is chosen first, on a step of its own, named for it', () => {
    const corner = methodOf('corner');

    expect(stepsOf(corner).map((s) => s.id)).toEqual(['method', 'choose', 'prepare', 'wire', 'position', 'measure', 'result']);
    expect(stepsOf(corner)[1].key).toBe('probe.step.corner');
    expect(stepBeside(corner, 'method', 1)).toBe('choose');
    expect(stepBeside(corner, 'prepare', -1)).toBe('choose');
  });
});
