import {
  CORNER_MS, cornerAt, cornerSides, loopIn, windowOfPhase,
} from '../cornerCycle';
import { methodOf, stepBeside, stepsOf } from '../probe';

jest.mock('../controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

describe('the L plate on the drawing', () => {
  test('touches Z, then X, then Y, each lit on its own', () => {
    expect(cornerAt(0.2).touch.axis).toBe('z');
    expect(cornerAt(0.56).touch.axis).toBe('x');
    expect(cornerAt(0.96).touch.axis).toBe('y');
    expect(cornerAt(0.4).touch).toBeNull();
  });

  test('the tabs follow: Z, X, Y', () => {
    expect([0.1, 0.4, 0.8].map((p) => cornerAt(p).stage)).toEqual([1, 2, 3]);
  });

  test('comes down beside the wall, below the top of the plate, before touching it', () => {
    // From the side the plate's top is at 150; beside the wall the tip is at 186.
    expect(cornerAt(0.44).side).toEqual([60, 186]);
    expect(cornerAt(0.54).side).toEqual([90, 186]);
  });

  test('shows the zero at the end', () => {
    expect(cornerAt(0.97).zero).toBe(true);
    expect(cornerAt(0.5).zero).toBe(false);
  });
});

describe('the part that plays', () => {
  test.each([
    ['z-fast', 'z'],
    ['z', 'z'],
    ['x-out', 'xOut'],
    ['x-down', 'xDown'],
    ['x-settle', 'x'],
    ['y-down', 'yDown'],
    ['y', 'y'],
    ['lift', 'whole'],
  ])('the machine\'s %s plays %s', (phase, part) => {
    expect(windowOfPhase(phase)).toBe(part);
  });

  test('loops inside its part', () => {
    const at = loopIn('x', 0);
    const later = loopIn('x', (0.6 - 0.44) * CORNER_MS * 1.5);

    expect(at).toBeCloseTo(0.44, 6);
    expect(later).toBeGreaterThanOrEqual(0.44);
    expect(later).toBeLessThan(0.6);
  });
});

describe('the corner turns it', () => {
  test('right mirrors across, back mirrors top to bottom, and the probes go the other way', () => {
    expect(cornerSides('front-left')).toMatchObject({ flipX: false, flipY: false, dirs: ['X+', 'Y+'] });
    expect(cornerSides('back-right')).toMatchObject({ flipX: true, flipY: true, dirs: ['X−', 'Y−'] });
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
