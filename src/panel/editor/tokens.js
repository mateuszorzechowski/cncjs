/**
 * G-code split into the kinds the panel colours, one tokenizer for every
 * place that shows a line: the editor (`gcode.js` drives CodeMirror with it)
 * and the MDI console, which colours what was sent the same way (review note,
 * 2026-09-29: *"czy tutaj nie powinno być kolorowej składni?"*).
 *
 * Kinds are CodeMirror's tag names: `keyword` a `G`/`M` code, `variableName`
 * an axis word, `number` any other word, `comment`, and `meta` for a line
 * number or a `%`. Null is plain text — a space, or a character that is not
 * a word.
 */

const NUMBER = /^\s*[-+]?(\d+\.?\d*|\.\d+)/;

/** The token starting at `pos`: its kind and where it ends. */
export const tokenAt = (text, pos) => {
  const rest = text.slice(pos);
  const space = /^\s+/.exec(rest);
  if (space) {
    return { kind: null, end: pos + space[0].length };
  }
  // `; to the end of the line` and `(inline)`.
  if (rest[0] === ';') {
    return { kind: 'comment', end: text.length };
  }
  if (rest[0] === '(') {
    const close = rest.indexOf(')');
    return { kind: 'comment', end: close < 0 ? text.length : pos + close + 1 };
  }
  if (rest[0] === '%') {
    return { kind: 'meta', end: pos + 1 };
  }

  const letter = rest[0].toUpperCase();
  // The number that belongs to the letter is part of the same word.
  const number = NUMBER.exec(rest.slice(1));
  const end = pos + 1 + (number ? number[0].length : 0);

  if (letter === 'G' || letter === 'M') {
    return { kind: 'keyword', end };
  }
  if ('XYZABCIJKR'.includes(letter)) {
    return { kind: 'variableName', end };
  }
  if (letter === 'N') {
    return { kind: 'meta', end };
  }
  if (/[A-Z]/.test(letter)) {
    return { kind: 'number', end };
  }
  return { kind: null, end };
};

/** A whole line as `{ text, kind }` pieces, in order. */
export const tokensOf = (text) => {
  const pieces = [];
  let pos = 0;
  while (pos < text.length) {
    const { kind, end } = tokenAt(text, pos);
    pieces.push({ text: text.slice(pos, end), kind });
    pos = end;
  }
  return pieces;
};
