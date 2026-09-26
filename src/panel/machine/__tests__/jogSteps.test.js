import { readSteps } from '../jogSteps';

describe('jog steps as typed', () => {
  test('blank fields dropped, a comma read as a point', () => {
    expect(readSteps(['0,1', '1', '', '10', ' ', ''])).toEqual([0.1, 1, 10]);
  });

  test('not steps: nothing, a zero, a repeat, out of order, not a number', () => {
    expect(readSteps(['', ''])).toBe(null);
    expect(readSteps(['0', '1'])).toBe(null);
    expect(readSteps(['1', '1'])).toBe(null);
    expect(readSteps(['10', '1'])).toBe(null);
    expect(readSteps(['1', 'x'])).toBe(null);
  });

  test('no more than the jog card lays out', () => {
    expect(readSteps(['1', '2', '3', '4', '5', '6'])).toHaveLength(6);
    expect(readSteps(['1', '2', '3', '4', '5', '6', '7'])).toBe(null);
  });
});
