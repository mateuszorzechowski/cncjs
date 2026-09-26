import { autocompletion } from '@codemirror/autocomplete';
import { linter, lintGutter } from '@codemirror/lint';
import { checkLine } from './lineCheck';
import { BLOCK_KEYS, BUILTIN_KEYS, CODE_KEYS, LETTER_KEYS, checkText } from './words';
import { codeBefore, machineFigures, wordsFor } from './hints';
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

/** A letter, and — when the line's code takes it — which code it is for, first in the list. */
const letterOption = (letter, code, taken) => ({
  ...described(letter, LETTER_KEYS[letter], 'variable'),
  ...(taken ? { detail: t('editor.forCode', { what: t(LETTER_KEYS[letter]), code }), boost: 10 } : {}),
});

/** The machine's own figure as a word to type — `F5000`, `S1000` — saying where it comes from. */
const figureOptions = (letter, figures) => {
  const found = figures[letter];
  if (!found) {
    return [];
  }
  // As a word is written: `F5000`, not the settings' `5000.000`.
  const word = (value) => `${letter}${Number(value)}`;
  const options = [{ label: word(found.value), type: 'constant', detail: t('editor.machine', { setting: found.from }), boost: 5 }];
  if (found.z !== null && found.z !== undefined && Number(found.z) !== Number(found.value)) {
    options.push({ label: word(found.z), type: 'constant', detail: t('editor.machine', { setting: found.zFrom }), boost: 4 });
  }
  return options;
};

/** A ready block, whole lines, for a blank line. */
const blockOption = (block) => ({
  label: t(BLOCK_KEYS[block.id]),
  type: 'text',
  detail: block.lines.join(' · '),
  apply: block.lines.join('\n'),
});

/**
 * Suggestions for the word being typed: the G or M codes the server accepts
 * after `G`/`M`, the letters after any other, cncjs's `%` commands after `%` —
 * each with what it does. Beyond the names (night of 2026-09-26): the
 * letters the line's code takes come first and say so (after `G2`, `I` is
 * "for G2"); `F` and `S` offer the connected machine's own top figures, and
 * `G54`…`G59` say where each system is; and asked for on a blank line
 * (Ctrl+Space), ready blocks — a header, a retract, a tool change, an end.
 */
const suggest = (words, machine) => (context) => {
  const word = context.matchBefore(/[A-Za-z%][\w.]*/);
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  if (!word && context.explicit && !before.trim() && words.blocks?.length) {
    return { from: context.pos, options: words.blocks.filter((b) => BLOCK_KEYS[b.id]).map(blockOption) };
  }
  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }
  const figures = machineFigures(machine());
  const head = word.text[0].toUpperCase();
  let options;
  if (head === '%') {
    options = words.builtins.map((name) => described(name, BUILTIN_KEYS[name], 'keyword'));
  } else if (head === 'G' || head === 'M') {
    options = [...words.g, ...words.m]
      .filter((code) => code[0] === head)
      .map((code) => {
        const at = figures[code];
        return at
          ? { ...described(code, CODE_KEYS[code], 'keyword'), detail: t('editor.wcsAt', { what: t(CODE_KEYS[code]), x: at.x, y: at.y, z: at.z }) }
          : described(code, CODE_KEYS[code], 'keyword');
      });
  } else {
    const code = codeBefore(line.text.slice(0, word.from - line.from));
    const taken = wordsFor(words.params, code);
    options = [
      ...words.letters
        .filter((letter) => LETTER_KEYS[letter])
        .map((letter) => letterOption(letter, code, taken.includes(letter))),
      ...figureOptions(head, figures),
    ];
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
export const assist = (words, size, machine = () => null) => [
  autocompletion({ override: [suggest(words, machine)], activateOnTyping: true }),
  ...findings(words, size),
];

/**
 * The checks alone, for text that is read and not typed — the phone's page
 * of a file (Mateusz, 2026-09-26: *"na telefonie też chcę widzieć błędy do
 * wglądu"*): the marks in the gutter and on the scrollbar, no suggestions.
 */
export const findings = (words, size) => [
  linter(byLine(words), { delay: 150 }),
  linter(byServer, { delay: size > BIG ? SERVER_DELAY_BIG_MS : SERVER_DELAY_MS }),
  lintGutter(),
];
