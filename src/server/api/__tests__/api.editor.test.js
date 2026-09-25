import { check, words } from '../api.editor';

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
