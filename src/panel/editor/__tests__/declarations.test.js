import { declarationLine, headAt, missingDeclarations, offerFor } from '../declarations';

describe('what a program leaves undeclared, and the fix', () => {
  const FINDINGS = [
    { code: 'undeclared', word: 'G20/G21', line: 5 },
    { code: 'undeclared', word: 'G90/G91', line: 5 },
    { code: 'tool-change', word: 'M6', line: 13 },
    { code: 'undeclared', word: 'G17/G18/G19', line: 10 },
    { code: 'undeclared', word: 'G20/G21', line: 40 },
  ];

  test('each undeclared group once, with the usual code for it', () => {
    expect(missingDeclarations(FINDINGS)).toEqual([
      { group: 'G20/G21', code: 'G21' },
      { group: 'G90/G91', code: 'G90' },
      { group: 'G17/G18/G19', code: 'G17' },
    ]);
  });

  test('units are the server’s: a machine kept in inches is offered G20', () => {
    expect(offerFor('G20/G21', 'G20')).toBe('G20');
    expect(missingDeclarations(FINDINGS, 'G20')[0].code).toBe('G20');
  });

  test('nothing to offer for a finding that is not a missing declaration', () => {
    expect(missingDeclarations([{ code: 'tool-change', word: 'M6' }])).toEqual([]);
  });

  test('the line goes at the very top, or after an opening %', () => {
    expect(headAt('G0 X1\n')).toBe(0);
    expect(headAt('%\nG0 X1\n')).toBe(2);
    expect(headAt('  %  program\nG0 X1\n')).toBe(13);
    expect(declarationLine(['G21', 'G90'])).toBe('G21 G90\n');
  });
});
