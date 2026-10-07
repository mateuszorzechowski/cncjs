import {
  METHODS, choiceOf, failureKey, kindsOf, mapAsk, methodOf, methodOfRun, optionsFor, pairEnds, pairOf, phaseWords, saveProbe, serverOf, shapeOfKind, stepBeside, stepIdsOf, stepsOf, surfaceShifts, wireOf, wizardStep,
} from '../probe';
import { FIELDS, fieldText, fieldUnit } from '../probeFields';

jest.mock('../../../machine/controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

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
    // Sonda 3D's zero in the first row; the height map and Pomiar in the second (the sense report, 2026-10-05).
    expect(METHODS.map((m) => m.id)).toEqual(['z', 'corner', 'paper', 'probe3d', 'height-map', 'measure']);
    expect(METHODS.filter((m) => m.apart).map((m) => m.id)).toEqual(['height-map', 'measure']);
    expect(serverOf(methodOf('probe3d'))).toBe('measure');
    expect(Object.values(FIELDS).every((f) => ['length', 'feed', 'count'].includes(f.kind))).toBe(true);
  });
});

describe('Pomiar: what is measured, then how it lies', () => {
  test('two steps of one choice, the shape', () => {
    const probe3d = methodOf('probe3d');
    expect(stepsOf(probe3d, 'rect-outside').map((step) => step.id)).toEqual(['method', 'choose', 'lie', 'prepare', 'wire', 'position', 'measure', 'result']);
    expect(optionsFor(probe3d, 'circle-outside')).toEqual({ shape: 'circle-outside' });
  });

  test("how it lies, only where there is something to pick: a height's two surfaces skip it, a distance's ends do not", () => {
    const measure = methodOf('measure');
    const ids = (choice) => stepIdsOf(measure, choice);
    expect(ids('height')).toEqual(['method', 'choose', 'prepare', 'wire', 'position', 'measure', 'result']);
    expect(ids('distance:circle-inside:edge-front')).toContain('lie');
    expect(stepBeside(measure, 'choose', 1, 'height')).toBe('prepare');
    expect(stepBeside(measure, 'prepare', -1, 'height')).toBe('choose');
    expect(stepBeside(measure, 'choose', 1, 'distance:circle-inside:circle-inside')).toBe('lie');
  });

  test('a rectangle asks for one pass, whatever the figure kept: its walls are square to the axes (report #29)', () => {
    const probe3d = methodOf('probe3d');
    expect(optionsFor(probe3d, 'rect-inside')).toEqual({ shape: 'rect-inside', holePasses: 1 });
    expect(optionsFor(probe3d, 'bar-y')).toEqual({ shape: 'bar-y', holePasses: 1 });
    expect(optionsFor(probe3d, 'circle-inside')).toEqual({ shape: 'circle-inside' });
    expect(optionsFor(probe3d, 'edge-front')).toEqual({ shape: 'edge-front' });
  });

  test('a kind picked keeps how it lay where it can', () => {
    expect(shapeOfKind('rect', 'circle-outside')).toBe('rect-outside');
    // A groove and a bar are a rectangle's one axis: the same kind.
    expect(shapeOfKind('rect', 'groove-y')).toBe('groove-y');
    expect(shapeOfKind('circle', 'groove-y')).toBe('circle-inside');
  });

  test('each tile offers its own kinds: the zeros, or the measurements', () => {
    expect(kindsOf('probe3d').map((kind) => kind.id)).toEqual(['circle', 'rect', 'edge', 'corner']);
    // Trimmed to what an operator needs (Mateusz, 2026-10-06): no ovality, no rectangle at an angle, no slot.
    expect(kindsOf('measure').map((kind) => kind.id)).toEqual(['distance', 'height']);
    expect(methodOf('measure').choice.list.map((shape) => shape.id)).toEqual(['distance', 'height']);
  });
});

describe('a distance', () => {
  const measure = methodOf('measure');

  test('its two ends in the one choice, asked for apart, and back again', () => {
    const choice = shapeOfKind('distance', 'circle-inside');
    expect(pairOf(choice)).toEqual({ shape: 'distance', a: 'circle-inside', b: 'circle-inside' });
    const options = optionsFor(measure, 'distance:edge-front:circle-outside');
    expect(options).toEqual({ shape: 'distance', a: 'edge-front', b: 'circle-outside' });
    expect(choiceOf(measure, options)).toBe('distance:edge-front:circle-outside');
    expect(pairOf('circle-inside')).toBeNull();
  });

  test('a corner is one cycle of Sonda 3D: its two edges named as the ends of a pair for the result', () => {
    expect(optionsFor(methodOf('probe3d'), 'corner-out-front-left')).toEqual({ shape: 'corner-out-front-left' });
    expect(pairOf('corner-out-front-left')).toBeNull();
    expect(pairEnds({ shape: 'corner-out-front-left' })).toEqual({ a: 'edge-left', b: 'edge-front' });
    expect(pairEnds({ shape: 'corner-in-back-right' })).toEqual({ a: 'wall-right', b: 'wall-back' });
    expect(pairEnds({ shape: 'distance', a: 'edge-front', b: 'circle-inside' })).toEqual({ a: 'edge-front', b: 'circle-inside' });
  });

  test('a measurement the server runs is shown with the tile it belongs to', () => {
    expect(methodOfRun('measure', { shape: 'corner-in-front-left' }).id).toBe('probe3d');
    expect(methodOfRun('measure', { shape: 'circle-inside' }).id).toBe('probe3d');
    expect(methodOfRun('measure', { shape: 'distance', a: 'circle-inside', b: 'edge-front' }).id).toBe('measure');
    expect(methodOfRun('measure', { shape: 'height', a: 'surface', b: 'surface' }).id).toBe('measure');
    expect(methodOfRun('z', {}).id).toBe('z');
  });

  test('a height: two surfaces, a pair with nothing to pick — no one surface of its own (report #27)', () => {
    expect(shapeOfKind('height', 'circle-inside')).toBe('height');
    expect(optionsFor(measure, 'height')).toEqual({ shape: 'height', a: 'surface', b: 'surface' });
  });

  test('its first end measured, the wizard goes into place over the second', () => {
    expect(wizardStep('result', { state: 'between' })).toBe('position');
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

describe('the figures, confirmed', () => {
  afterEach(() => {
    delete global.fetch;
  });

  test('an empty one is refused here, named, and nothing is sent: as a number it would be 0 (audit K7)', async () => {
    global.fetch = jest.fn();
    await expect(saveProbe({ wallX: '', wallY: '10' }, MM)).rejects.toMatchObject({ name: 'wallX' });
    await expect(saveProbe({ lift: '  ' }, MM)).rejects.toMatchObject({ name: 'lift' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('the rest go as numbers, a comma read as a point', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ params: {} }) }));
    await saveProbe({ wallX: '7,5' }, MM);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ params: { wallX: 7.5 }, units: 'mm' });
  });
});
