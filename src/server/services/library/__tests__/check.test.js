import analyse from '../analyse';

const program = (...lines) => lines.join('\n');

/** A program that declares what it takes on, so a case sees only its own problem. */
const HEAD = 'G21 G90 G17';

const check = async (text, start) => (await analyse(text, null, start)).check;

describe('what Grbl 1.1 does not take', () => {
  test('a program it takes is ok, with nothing to say', async () => {
    expect(await check(program(HEAD, 'G0 X1 Y1', 'G1 Z-1 F100', 'G2 X2 Y2 I1 J0', 'M30'))).toEqual({ verdict: 'ok', issues: [] });
  });

  test('cutter compensation is incompatible, at its line', async () => {
    const { verdict, issues } = await check(program(HEAD, 'G41 G0 X1'));

    expect(verdict).toBe('incompatible');
    expect(issues).toEqual([{ code: 'unsupported', severity: 'incompatible', word: 'G41', line: 2, count: 1 }]);
  });

  test('G43 with H is two problems, and G43.1 none', async () => {
    const { issues } = await check(program(HEAD, 'G43 H1', 'G43.1 Z2'));

    expect(issues.map(issue => [issue.code, issue.word])).toEqual([['unsupported', 'G43'], ['bad-word', 'H']]);
  });

  test('an M-code it does not know is incompatible', async () => {
    expect((await check(program(HEAD, 'M98 P100'))).issues[0]).toMatchObject({ code: 'unsupported', word: 'M98' });
  });

  test('a printer file is incompatible by its E', async () => {
    expect((await check(program(HEAD, 'G92 E0'))).issues[0]).toMatchObject({ code: 'bad-word', word: 'E', line: 2 });
  });

  test('the same problem is said once, at its first line, with how often it comes', async () => {
    const { issues } = await check(program(HEAD, 'G0 X1', 'G64', 'G0 X2', 'G64', 'G64'));

    expect(issues).toEqual([{ code: 'unsupported', severity: 'incompatible', word: 'G64', line: 3, count: 3 }]);
  });

  test('lines are counted as the sender counts them — blank ones are not sent', async () => {
    expect((await check(program(HEAD, '', '  ', 'G41'))).issues[0].line).toBe(2);
  });
});

describe('an arc whose end is not on its circle', () => {
  test('is incompatible — the calibration file\'s own line', async () => {
    // From X20 Y-21 the radius is 29 mm, to the end 27.6 mm: `error:33`, five times on 2026-09-25.
    const { verdict, issues } = await check(program(HEAD, 'G0 X20 Y-21', 'G3 X21 Y-20 I20 J21 F300'));

    expect(verdict).toBe('incompatible');
    expect(issues).toEqual([{ code: 'arc', severity: 'incompatible', word: 'G3', line: 3, count: 1 }]);
  });

  test('0.005 mm of difference is always allowed', async () => {
    expect((await check(program(HEAD, 'G0 X0 Y0', 'G2 X10 Y0.07 I5 J0 F300'))).issues).toEqual([]);
    expect((await check(program(HEAD, 'G0 X0 Y0', 'G2 X10 Y1 I5 J0 F300'))).issues[0]).toMatchObject({ code: 'arc', word: 'G2' });
  });

  test('past that, a large circle has 0.1 % of its radius, up to 0.5 mm', async () => {
    expect((await check(program(HEAD, 'G0 X0 Y0', 'G2 X2000.4 Y0 I1000 J0 F300'))).issues).toEqual([]);
    expect((await check(program(HEAD, 'G0 X0 Y0', 'G2 X2000.6 Y0 I1000 J0 F300'))).issues[0]).toMatchObject({ code: 'arc' });
  });

  test('is measured in millimetres, as Grbl measures it', async () => {
    // 0.004 in is under the 0.005 slack as a number, and 0.1 mm as a length.
    expect((await check(program('G20 G90 G17', 'G0 X0 Y0', 'G2 X2.004 Y0 I1 J0 F10'))).issues[0]).toMatchObject({ code: 'arc' });
  });

  test('in its own plane', async () => {
    expect((await check(program('G21 G90 G18', 'G0 X0 Z0', 'G2 X10 Z0 I5 K0 F300'))).issues).toEqual([]);
    expect((await check(program('G21 G90 G18', 'G0 X0 Z0', 'G2 X10 Z1 I5 K0 F300'))).issues[0]).toMatchObject({ code: 'arc' });
  });

  test('an R arc fits its circle, unless the radius is too short to reach', async () => {
    expect((await check(program(HEAD, 'G0 X0 Y0', 'G2 X10 Y1 R5.1 F300'))).issues).toEqual([]);
    expect((await check(program(HEAD, 'G0 X0 Y0', 'G2 X10 Y0 R2 F300'))).issues[0]).toMatchObject({ code: 'arc' });
  });
});

describe('a line too long for the buffer', () => {
  const letters = (n) => `G1 X${'1'.repeat(n - 3)}`; // `G1X` and the digits, without the space

  test('79 characters fit and 80 do not', async () => {
    expect((await check(program(HEAD, letters(79)))).issues).toEqual([]);
    expect((await check(program(HEAD, letters(80)))).issues).toEqual([
      { code: 'too-long', severity: 'incompatible', word: null, line: 2, count: 1 },
    ]);
  });

  test('is counted without spaces and comments, which Grbl drops', async () => {
    expect((await check(program(HEAD, `G1 X1 Y1 (${'c'.repeat(90)})`, `G1   X2    Y2 ; ${'c'.repeat(90)}`))).issues).toEqual([]);
  });
});

describe('what cncjs sends but does not come from the file', () => {
  test('a % line is cncjs\'s own command, however long', async () => {
    expect((await check(program(HEAD, '%wait', `%msg ${'Put the long tool in and zero it. '.repeat(3)}`))).issues).toEqual([]);
  });

  test('a line with an expression is filled in only as it is sent', async () => {
    // Read as it stands, `probe1` is an E word.
    expect((await check(program(HEAD, '%probe1 = 5', 'G0 Z[probe1 + 2]'))).issues).toEqual([]);
  });
});

describe('what runs but is worth knowing', () => {
  test('M6 stops the program for a tool change', async () => {
    const { verdict, issues } = await check(program(HEAD, 'T2 M6'));

    expect(verdict).toBe('warnings');
    expect(issues).toEqual([{ code: 'tool-change', severity: 'warning', word: 'M6', line: 2, count: 1 }]);
  });

  test('M7 is not in the default build', async () => {
    expect((await check(program(HEAD, 'M7'))).issues[0]).toMatchObject({ code: 'mist', severity: 'warning' });
  });

  test('incompatible outweighs a warning', async () => {
    expect((await check(program(HEAD, 'M6', 'G41'))).verdict).toBe('incompatible');
  });
});

describe('what the program takes from the one before', () => {
  test('units and distance, once, at the first move that takes them on trust', async () => {
    const { issues } = await check(program('G1 Z1 F3000', 'G0 X2', 'G90', 'G21', 'G0 X1'));

    expect(issues).toEqual([
      { code: 'undeclared', severity: 'warning', word: 'G20/G21', line: 1, count: 1 },
      { code: 'undeclared', severity: 'warning', word: 'G90/G91', line: 1, count: 1 },
    ]);
  });

  test('set on the line that moves is set in time', async () => {
    expect((await check(program('G21 G90 G0 X1'))).issues).toEqual([]);
  });

  test('a line with no move takes nothing on trust', async () => {
    expect((await check(program('G4 P1', 'M3 S1000', 'G21 G90', 'G0 X1'))).issues).toEqual([]);
  });

  test('the plane only for a program with arcs, at its first arc', async () => {
    expect((await check(program('G21 G90', 'G0 X1', 'G1 X2 F100'))).issues).toEqual([]);
    expect((await check(program('G21 G90', 'G0 X1', 'G2 X3 I1 J0 F100'))).issues).toEqual([
      { code: 'undeclared', severity: 'warning', word: 'G17/G18/G19', line: 3, count: 1 },
    ]);
  });

  test('what the start events set before every program is set', async () => {
    expect((await check(program('G0 X1', 'G2 X3 I1 J0 F100'), 'G21\nG90 G17 ; every program')).issues).toEqual([]);
  });
});
