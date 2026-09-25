/**
 * One line of G-code, checked as it is typed — what can be said of a line
 * without the lines before it.
 *
 * The words are the server's (`GET /api/editor/words`): which G and M codes
 * the file check accepts, which letters, how long a line may be. So this and
 * the file check cannot disagree about whether `G7` is a code; what needs
 * the program around it — an arc that misses its circle, units never set —
 * is the server's, a moment later (`POST /api/editor/check`).
 *
 * Findings are `{ from, to, code, word }`, offsets within the line, with the
 * file check's codes, plus `no-number`: a letter with nothing after it,
 * which Grbl refuses as a bad number format.
 */

// A comment is blanked rather than removed, so offsets stay the line's own.
const blank = (text) => text
  .replace(/\([^)]*\)?/g, (comment) => ' '.repeat(comment.length))
  .replace(/;.*$/, (comment) => ' '.repeat(comment.length));

// `G01` is `G1`, `G38.20` is `G38.2`: the code a number names.
const codeOf = (letter, number) => `${letter}${String(Number(number))}`;

const WORD = /([A-Za-z])\s*([-+]?(?:\d+\.?\d*|\.\d+))?/g;

export const checkLine = (text, words) => {
  if (!words) {
    return [];
  }
  const found = [];
  const bare = blank(text);

  // cncjs's own commands are cncjs's to judge.
  if (bare.trim().startsWith('%')) {
    return found;
  }

  const letters = new Set(words.letters);
  const codes = new Set([...words.g, ...words.m]);
  let covered = 0;

  for (const match of bare.matchAll(WORD)) {
    const [whole, raw, number] = match;
    const from = match.index;
    const to = from + whole.length;
    // Anything between words that is neither space nor a word is a character
    // Grbl will not read.
    const between = bare.slice(covered, from);
    const stray = between.search(/\S/);
    if (stray >= 0) {
      found.push({ from: covered + stray, to: covered + stray + 1, code: 'bad-word', word: between.trim()[0] });
    }
    covered = to;

    const letter = raw.toUpperCase();
    if (!letters.has(letter)) {
      found.push({ from, to, code: 'bad-word', word: letter });
    } else if (number === undefined) {
      found.push({ from, to, code: 'no-number', word: letter });
    } else if ((letter === 'G' || letter === 'M') && !codes.has(codeOf(letter, number))) {
      found.push({ from, to, code: 'unsupported', word: codeOf(letter, number) });
    }
  }
  const rest = bare.slice(covered).search(/\S/);
  if (rest >= 0) {
    found.push({ from: covered + rest, to: covered + rest + 1, code: 'bad-word', word: bare.slice(covered).trim()[0] });
  }

  // What reaches Grbl's buffer is the line without spaces or comments.
  if (bare.replace(/\s+/g, '').length > words.maxLine) {
    found.push({ from: 0, to: text.length, code: 'too-long', word: null });
  }
  return found;
};
