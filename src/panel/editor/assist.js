import { autocompletion } from '@codemirror/autocomplete';
import { linter, lintGutter } from '@codemirror/lint';
import { checkLine } from './lineCheck';
import { BUILTIN_KEYS, CODE_KEYS, LETTER_KEYS, checkText } from './words';
import { issueText } from '../ui/fileWords';
import { t } from '../i18n';

// What the file check says of a finding, as the editor's severity.
const SEVERITY = { incompatible: 'error', warning: 'warning' };

// The codes a line can be judged on by itself; the server's answer for these
// would only repeat what is already underlined.
const BY_LINE = new Set(['unsupported', 'bad-word', 'too-long', 'no-number']);

// A big program is checked by the server less eagerly: the check reads it all.
const SERVER_DELAY_MS = 800;
const SERVER_DELAY_BIG_MS = 3000;
const BIG = 200000;

const described = (label, key, type) => ({ label, type, detail: key ? t(key) : undefined });

/**
 * Suggestions for the word being typed: the G or M codes the server accepts
 * after `G`/`M`, the letters after any other, cncjs's `%` commands after `%` —
 * each with what it does.
 */
const suggest = (words) => (context) => {
  const word = context.matchBefore(/[A-Za-z%][\w.]*/);
  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }
  const head = word.text[0].toUpperCase();
  let options;
  if (head === '%') {
    options = words.builtins.map((name) => described(name, BUILTIN_KEYS[name], 'keyword'));
  } else if (head === 'G' || head === 'M') {
    options = [...words.g, ...words.m]
      .filter((code) => code[0] === head)
      .map((code) => described(code, CODE_KEYS[code], 'keyword'));
  } else {
    options = words.letters
      .filter((letter) => LETTER_KEYS[letter])
      .map((letter) => described(letter, LETTER_KEYS[letter], 'variable'));
  }
  return { from: word.from, options, validFor: /^[A-Za-z%][\w.]*$/ };
};

/** Every line, as it is typed — see `lineCheck`. */
const byLine = (words) => (view) => {
  const { doc } = view.state;
  const found = [];
  for (let number = 1; number <= doc.lines; number++) {
    const line = doc.line(number);
    for (const finding of checkLine(line.text, words)) {
      found.push({
        from: line.from + finding.from,
        to: line.from + Math.max(finding.to, finding.from + 1),
        severity: 'error',
        message: issueText(finding),
      });
    }
  }
  return found;
};

/** The whole program, by the server, once typing pauses — what needs context. */
const byServer = async (view) => {
  const { doc } = view.state;
  const { findings } = await checkText(doc.toString());
  return findings
    .filter((finding) => !BY_LINE.has(finding.code) && finding.line >= 1 && finding.line <= doc.lines)
    .map((finding) => {
      const line = doc.line(finding.line);
      return {
        from: line.from,
        to: Math.max(line.to, line.from + 1),
        severity: SEVERITY[finding.severity] || 'warning',
        message: issueText(finding),
      };
    });
};

/**
 * The editor's help, from the server's words: suggestions, and a check in two
 * speeds — each line as it is typed, and the whole program by the server's
 * own file check a moment after typing stops. Both underline in place and
 * mark the gutter; the message is on the mark and under the pointer.
 */
export const assist = (words, size) => [
  autocompletion({ override: [suggest(words)], activateOnTyping: true }),
  linter(byLine(words), { delay: 150 }),
  linter(byServer, { delay: size > BIG ? SERVER_DELAY_BIG_MS : SERVER_DELAY_MS }),
  lintGutter(),
];
