import {
  METHODS, failureKey, mapAsk, methodOf, optionsFor, phaseWords, shapeOfKind, stepBeside, stepsOf, surfaceShifts, wireOf, wizardStep,
} from '../probe';
import { FIELDS, fieldText, fieldUnit } from '../probeFields';

jest.mock('../controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

const MM = { name: 'mm', factor: 1, digits: { position: 3, size: 1, feed: 0 } };
const INCH = { name: 'inch', factor: 1 / 25.4, digits: { position: 4, size: 2, feed: 1 } };

describe('where the wizard is', () => {
  test('the operator\'s own steps until the server has a measurement', () => {
    expect(wizardStep('wire', null)).toBe('wire');
  });

  test.each([
    ['running', 'measure'],
    ['measured', 'result'],
    ['failed', 'result'],
  ])('a measurement %s on any device shows as %s', (state, step) => {
    expect(wizardStep('method', { state })).toBe(step);
  });
});

describe('the steps a method goes through', () => {
  test('the paper has no wire to test, and its surface is chosen on a step of its own', () => {
    expect(stepsOf(methodOf('paper')).map((s) => s.id)).toEqual(['method', 'choose', 'prepare', 'position', 'measure', 'result']);
    expect(stepsOf(methodOf('paper'))[1].key).toBe('probe.step.surface');
    expect(stepBeside(methodOf('paper'), 'prepare', 1)).toBe('position');
    expect(stepBeside(methodOf('paper'), 'position', -1)).toBe('prepare');
  });

  test('a probe does', () => {
    expect(stepBeside(methodOf('z'), 'prepare', 1)).toBe('wire');
    expect(stepBeside(methodOf('corner'), 'position', -1)).toBe('wire');
  });

  test('every step until a method is picked', () => {
    expect(stepsOf(null)).toHaveLength(6);
  });

  test('the one choice goes as its option, and where Z0 goes with a method that finds a surface', () => {
    const table = { on: 'work', z0: 'table' };
    expect(optionsFor(methodOf('corner'), 'back-left', table)).toEqual({ corner: 'back-left' });
    expect(optionsFor(methodOf('paper'), 'x-right', table)).toEqual({ edge: 'x-right' });
    expect(optionsFor(methodOf('paper'), 'z', table)).toEqual({ edge: 'z', on: 'work', z0: 'table' });
    expect(optionsFor(methodOf('z'), undefined)).toEqual({ on: 'work', z0: 'top' });
  });

  test('Z0 moves by the work only when it is not where it was measured', () => {
    expect(surfaceShifts({ on: 'work', z0: 'top' })).toBe(false);
    expect(surfaceShifts({ on: 'table', z0: 'table' })).toBe(false);
    expect(surfaceShifts({ on: 'work', z0: 'table' })).toBe(true);
    expect(surfaceShifts({ on: 'table', z0: 'top' })).toBe(true);
  });
});

describe('what the tool is doing', () => {
  test.each([
    ['z-fast', 'probe.phase.fast', 'Z'],
    ['x-down', 'probe.phase.down', 'X'],
    ['y', 'probe.phase.touch', 'Y'],
    ['y-settle', 'probe.phase.settle', 'Y'],
  ])('%s', (phase, key, axis) => {
    expect(phaseWords(phase)).toEqual({ key, axis });
  });
});

describe('why it failed', () => {
  test('a plate not reached and a clip already on are told apart', () => {
    expect(failureKey('ALARM:5')).toBe('probe.failure.notFound');
    expect(failureKey('ALARM:4')).toBe('probe.failure.alreadyTouching');
  });

  test('anything else is said with its code', () => {
    expect(failureKey('error:9')).toBe('probe.failure.other');
  });
});

describe('a kept figure in a field', () => {
  test('without the zeros a reading carries', () => {
    expect(fieldText(10, 'plateThickness', MM)).toBe('10');
  });

  test('in the server\'s units', () => {
    expect(fieldText(12.7, 'plateThickness', INCH)).toBe('0.5');
    expect(fieldText(101.6, 'fast', INCH)).toBe('4');
  });

  test('with the unit it is typed in', () => {
    expect(fieldUnit('fast', MM)).toBe('mm/min');
    expect(fieldUnit('maxZ', MM)).toBe('mm');
  });

  test('every method the server may name has words, and every figure a kind', () => {
    expect(METHODS.map((m) => m.id)).toEqual(['z', 'corner', 'paper', 'height-map', 'measure']);
    expect(Object.values(FIELDS).every((f) => ['length', 'feed', 'count'].includes(f.kind))).toBe(true);
  });
});

describe('Pomiar: what is measured, then how it lies', () => {
  test('two steps of one choice, the shape', () => {
    const measure = methodOf('measure');
    expect(stepsOf(measure).map((step) => step.id)).toEqual(['method', 'choose', 'lie', 'prepare', 'wire', 'position', 'measure', 'result']);
    expect(optionsFor(measure, 'rect-outside')).toEqual({ shape: 'rect-outside' });
  });

  test('a kind picked keeps how it lay where it can', () => {
    expect(shapeOfKind('rect', 'circle-outside')).toBe('rect-outside');
    expect(shapeOfKind('width', 'circle-outside')).toBe('bar-x');
    expect(shapeOfKind('circle', 'groove-y')).toBe('circle-inside');
    expect(shapeOfKind('width', 'groove-y')).toBe('groove-y');
  });
});

describe('the height map, asked for', () => {
  const texts = {
    x: '5', y: '-5', w: '40,5', d: '20', ax: '40', ay: '0', bx: '0', by: '30', px0: '1', px1: '9', py0: '2', py1: '8', nx: '4', ny: '3',
  };

  test('by how the area is given: a corner and a size, two corners, or the program', () => {
    expect(mapAsk(texts, 'point')).toEqual({ at: { x: 5, y: -5 }, size: { x: 40.5, y: 20 }, nx: 4, ny: 3 });
    expect(mapAsk(texts, 'corners')).toEqual({ x: [40, 0], y: [0, 30], nx: 4, ny: 3 });
    expect(mapAsk(texts, 'program')).toEqual({ x: [1, 9], y: [2, 8], nx: 4, ny: 3 });
  });

  test('with what touches, so a device joining it measures the same', () => {
    const map = methodOf('height-map');
    expect(map.apart).toBe(true);
    expect(optionsFor(map, 'probe', undefined, mapAsk(texts, 'program'))).toEqual({ ...mapAsk(texts, 'program'), tool: 'probe' });
    expect(wireOf(map, 'probe')).toMatchObject({ plate: 'probe', stuck: 'probe.wire.normallyClosed' });
    expect(wireOf(methodOf('z'), undefined)).toEqual({ plate: undefined, how: undefined, stuck: undefined });
  });
});
