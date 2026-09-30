import {
  FIELDS, METHODS, failureKey, fieldText, fieldUnit, phaseWords, wizardStep,
} from '../probe';

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
