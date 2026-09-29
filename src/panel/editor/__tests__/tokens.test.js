import { tokensOf } from '../tokens';

const kinds = (text) => tokensOf(text).filter(({ kind }) => kind).map(({ text: piece, kind }) => [piece, kind]);

describe('G-code split for colouring', () => {
  test('codes, axes, other words, and the number with each', () => {
    expect(kinds('G0 X-10.5 F500')).toEqual([['G0', 'keyword'], ['X-10.5', 'variableName'], ['F500', 'number']]);
  });

  test('comments of both kinds, line numbers and the program marker', () => {
    expect(kinds('N10 G1 (cut) Z-1 ; down')).toEqual([
      ['N10', 'meta'], ['G1', 'keyword'], ['(cut)', 'comment'], ['Z-1', 'variableName'], ['; down', 'comment'],
    ]);
    expect(kinds('%')).toEqual([['%', 'meta']]);
  });

  test('the pieces put back together are the line, $ commands included', () => {
    for (const line of ['$X', 'g91 g0 x1', '(open comment', 'M3 S1000']) {
      expect(tokensOf(line).map(({ text }) => text).join('')).toBe(line);
    }
  });
});
