import { codeBefore, machineFigures, wordsFor } from '../hints';

describe('which code the words being typed belong to', () => {
  test('the last G or M code before the cursor, named as the server names it', () => {
    expect(codeBefore('G2 X10 Y5 ')).toBe('G2');
    expect(codeBefore('g02 x1 ')).toBe('G2');
    expect(codeBefore('G90 G38.2 Z-5 ')).toBe('G38.2');
    expect(codeBefore('M3 ')).toBe('M3');
  });

  test('nothing in a comment counts, and a line without a code has none', () => {
    expect(codeBefore('X10 (G2 here is a comment) ')).toBe(null);
    expect(codeBefore('X10 ; G3 ')).toBe(null);
    expect(codeBefore('')).toBe(null);
  });

  test('the words a code takes are the server’s list', () => {
    const params = { G2: ['X', 'I', 'J', 'R'], G4: ['P'] };
    expect(wordsFor(params, 'G2')).toEqual(['X', 'I', 'J', 'R']);
    expect(wordsFor(params, 'G1')).toEqual([]);
    expect(wordsFor(params, null)).toEqual([]);
  });
});

describe("the machine's own figures", () => {
  const COM3 = {
    settings: { $110: '5000.000', $111: '5000.000', $112: '3000.000', $30: '1000' },
    parameters: { G54: { x: '-518.728', y: '-309.044', z: '-71.468' }, G55: { x: '0.000', y: '0.000', z: '0.000' } },
  };

  test('the top feed of the table and of Z, and the top spindle speed, as the machine said them', () => {
    expect(machineFigures(COM3)).toMatchObject({
      F: { value: '5000.000', from: '$110', z: '3000.000', zFrom: '$112' },
      S: { value: '1000', from: '$30' },
    });
  });

  test('where each coordinate system is', () => {
    expect(machineFigures(COM3).G54).toEqual({ x: '-518.728', y: '-309.044', z: '-71.468' });
    expect(machineFigures(COM3).G56).toBeUndefined();
  });

  test('nothing, with no machine', () => {
    expect(machineFigures(null)).toEqual({});
    expect(machineFigures({ settings: {} })).toEqual({});
  });
});
