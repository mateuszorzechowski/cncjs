import { PARAMS, check, readyBlocks, words } from '../api.editor';
import { G_CODES, LETTERS, M_CODES } from '../../services/library/check';
import units from '../../services/units';

const call = async (handler, req) => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.send = jest.fn((payload) => {
    res.body = payload;
  });
  await handler({ query: {}, body: {}, ...req }, res);
  return res;
};

describe("the editor's vocabulary", () => {
  test('is the file check\'s own: codes, letters, the longest line, cncjs commands', async () => {
    const { body } = await call(words, {});
    expect(body.g).toContain('G2');
    expect(body.g).not.toContain('G7');
    expect(body.m).toContain('M30');
    expect(body.letters).toContain('X');
    expect(body.maxLine).toBe(79);
    expect(body.builtins).toEqual(['%wait', '%msg']);
  });
});

describe('what the editor offers after a code, and ready blocks', () => {
  afterEach(() => units.open({}));

  test('an arc takes its end, its centre or radius, a feed; a dwell its seconds', () => {
    expect(PARAMS.G2).toEqual(expect.arrayContaining(['X', 'Y', 'I', 'J', 'R', 'F']));
    expect(PARAMS.G4).toEqual(['P']);
    expect(PARAMS.M3).toEqual(['S']);
  });

  test('every code and letter in it is one the file check accepts', () => {
    for (const [code, letters] of Object.entries(PARAMS)) {
      expect(G_CODES.has(code) || M_CODES.has(code)).toBe(true);
      letters.forEach((letter) => expect(LETTERS.has(letter)).toBe(true));
    }
  });

  test('the retract goes to the top of Z in machine coordinates, whichever way Z homes', () => {
    expect(readyBlocks(0).find((b) => b.id === 'retract').lines).toEqual(['G53 G0 Z0']);
    expect(readyBlocks(150).find((b) => b.id === 'retract').lines).toEqual(['G53 G0 Z150']);
    expect(readyBlocks(0).find((b) => b.id === 'end').lines).toEqual(['M5', 'G53 G0 Z0', 'M30']);
  });

  test('with no machine to ask, no retract anywhere rather than a guessed one', () => {
    const blocks = readyBlocks(null);
    expect(blocks.map((b) => b.id)).toEqual(['header', 'toolChange', 'end']);
    expect(blocks.flatMap((b) => b.lines).some((line) => line.includes('G53'))).toBe(false);
  });

  test('the header declares the server’s units', () => {
    units.open({ name: 'inch' });
    expect(readyBlocks(null)[0].lines).toEqual(['G20 G90 G17 G94']);
  });

  test('are in the vocabulary', async () => {
    const { body } = await call(words, {});
    expect(body.params.G3).toContain('R');
    expect(body.blocks[0].id).toBe('header');
  });
});

describe('checking text that has not been saved', () => {
  test('gives every finding at its own line, with its severity', async () => {
    const text = ['G21 G90 G17', 'G7', 'G1 X1 Y1 F500', 'G3 X21 Y-20 I20 J21', 'G7'].join('\n');
    const { body } = await call(check, { body: { text } });

    // G7 twice, each at its own line — not grouped as the file card does.
    expect(body.findings.map(({ line, code, severity }) => [line, code, severity])).toEqual([
      [2, 'unsupported', 'incompatible'],
      [4, 'arc', 'incompatible'],
      [5, 'unsupported', 'incompatible'],
    ]);
    expect(body.more).toBe(false);
  });

  test('names the line as the editor numbers it, blank lines counted', async () => {
    // The file check counts as the sender does, skipping blank lines; the
    // editor underlines the file's own line.
    const text = ['G21 G90 G17', '', '(a comment)', 'G7', '', '   ', 'G7'].join('\n');
    const { body } = await call(check, { body: { text } });
    expect(body.findings.map(({ line }) => line)).toEqual([4, 7]);
  });

  test('refuses what is not text', async () => {
    expect((await call(check, { body: { text: 5 } })).statusCode).toBe(400);
  });
});
