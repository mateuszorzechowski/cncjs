import { checkLine } from '../lineCheck';

// What the server's file check accepts — a part of it.
const WORDS = {
  g: ['G0', 'G1', 'G2', 'G3', 'G21', 'G38.2', 'G90'],
  m: ['M3', 'M5', 'M30'],
  letters: ['F', 'G', 'I', 'J', 'K', 'M', 'N', 'P', 'R', 'S', 'T', 'X', 'Y', 'Z'],
  maxLine: 79,
};

const codes = (text) => checkLine(text, WORDS).map(({ code, word }) => [code, word]);

describe('a line as it is typed', () => {
  test('a line Grbl takes says nothing', () => {
    expect(codes('G1 X10.5 Y-3 F1500')).toEqual([]);
    expect(codes('g01 x1')).toEqual([]);
    expect(codes('G38.2 Z-5 F50')).toEqual([]);
  });

  test('a code the file check does not know', () => {
    expect(codes('G7 X1')).toEqual([['unsupported', 'G7']]);
    expect(codes('M6')).toEqual([['unsupported', 'M6']]);
  });

  test('a letter Grbl does not read, and a letter with no number', () => {
    expect(codes('G1 E5')).toEqual([['bad-word', 'E']]);
    expect(codes('G1 X')).toEqual([['no-number', 'X']]);
  });

  test('a stray character between words', () => {
    expect(codes('G1 X1 # Y2')).toEqual([['bad-word', '#']]);
  });

  test('comments are not read, and keep their place', () => {
    expect(codes('G1 X1 (E is fine here) ; and G7 here')).toEqual([]);
    const [finding] = checkLine('(note) G7', WORDS);
    expect(finding).toMatchObject({ from: 7, to: 9 });
  });

  test('a line longer than Grbl\'s buffer, counted without spaces', () => {
    expect(codes(`G1 ${'X1 '.repeat(40)}`)).toEqual([['too-long', null]]);
    expect(codes(`G1 X1${' '.repeat(100)}`)).toEqual([]);
  });

  test('cncjs\'s own commands are left to cncjs', () => {
    expect(codes('%wait')).toEqual([]);
  });

  test('says nothing before the server has said what it accepts', () => {
    expect(checkLine('G7', null)).toEqual([]);
  });
});
