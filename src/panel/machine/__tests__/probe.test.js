import {
  METHODS, failureKey, methodOf, optionsFor, phaseWords, stepBeside, stepsOf, wizardStep,
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
  test('the paper has no wire to test', () => {
    expect(stepsOf(methodOf('paper')).map((s) => s.id)).toEqual(['method', 'prepare', 'position', 'measure', 'result']);
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

  test('the one choice goes as its option', () => {
    expect(optionsFor(methodOf('corner'), 'back-left')).toEqual({ corner: 'back-left' });
    expect(optionsFor(methodOf('paper'), 'x-right')).toEqual({ edge: 'x-right' });
    expect(optionsFor(methodOf('z'), undefined)).toEqual({});
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
    expect(METHODS.map((m) => m.id)).toEqual(['z', 'corner', 'paper']);
    expect(Object.values(FIELDS).every((f) => ['length', 'feed'].includes(f.kind))).toBe(true);
  });
});
