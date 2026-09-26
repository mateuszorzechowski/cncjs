import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

/**
 * G-code, as the editor reads it: enough to tell a word from a comment.
 *
 * Not a parser — the server has one, and it is the one that checks a file
 * (`services/library`). This only colours: a comment, a `G`/`M` code, an axis
 * word, any other word, and the number that goes with it. Line numbers
 * (`N`) and the program markers (`%`) read as the quiet things they are.
 */
const gcode = StreamLanguage.define({
  name: 'gcode',
  token: (stream) => {
    if (stream.eatSpace()) {
      return null;
    }
    // `; to the end of the line` and `(inline)`.
    if (stream.peek() === ';') {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.peek() === '(') {
      stream.skipTo(')') ? stream.next() : stream.skipToEnd();
      return 'comment';
    }
    if (stream.eat('%')) {
      return 'meta';
    }

    const letter = stream.next().toUpperCase();
    // The number that belongs to the letter is part of the same word.
    stream.match(/^\s*[-+]?(\d+\.?\d*|\.\d+)/);

    if (letter === 'G' || letter === 'M') {
      return 'keyword';
    }
    if ('XYZABCIJKR'.includes(letter)) {
      return 'variableName';
    }
    if (letter === 'N') {
      return 'meta';
    }
    if (/[A-Z]/.test(letter)) {
      return 'number';
    }
    return null;
  },
});

/*
 * The panel's own colours, as its tokens — so the editor follows the theme
 * the way every other surface does, without a second palette. The accent
 * marks what a program *does* (G and M), the ink what it moves (axes), the
 * muted tone what is only said (comments, line numbers).
 */
const colours = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--acc)', fontWeight: '600' },
  { tag: tags.variableName, color: 'var(--ink)' },
  { tag: tags.number, color: 'var(--rapid)' },
  { tag: tags.comment, color: 'var(--mut)', fontStyle: 'italic' },
  { tag: tags.meta, color: 'var(--mut)' },
]);

// Not prose: a CSS colour — a token washed into transparency, the mix the
// Tailwind config calls `accS`/`redS`, for surfaces CodeMirror draws itself.
// eslint-disable-next-line panel/no-untranslated-text
const wash = (token, percent) => `color-mix(in srgb, var(--${token}) ${percent}%, transparent)`;

/*
 * The frame, in the same tokens. `&` is the editor's root; `.cm-*` are the
 * parts CodeMirror draws. The field colour and a hairline, like the panel's
 * other inputs; the gutter in the panel's surface so line numbers read as
 * the margin they are.
 */
const frame = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--ink)',
    backgroundColor: 'var(--field)',
    fontSize: '13px',
  },
  // No focus frame: the caret and the active line say where typing goes,
  // and a blue frame round the whole card read as a state it was in.
  '&.cm-focused': { outline: 'none' },
  // The browser's scrollbar hidden: the panel draws its own, with the
  // findings marked on it (`EditorScrollbar`).
  '.cm-scroller': { fontFamily: 'var(--num)', lineHeight: '1.6', scrollbarWidth: 'none' },
  '.cm-scroller::-webkit-scrollbar': { display: 'none' },
  // Room at the right for that scrollbar and the strip it is grabbed by —
  // wide enough for a thumb on a phone (*"opcja szybkiego scrolla"*,
  // 2026-09-26) — so it never sits on the text.
  '.cm-content': { caretColor: 'var(--acc)', paddingRight: '30px' },
  '.cm-cursor': { borderLeftColor: 'var(--acc)' },
  '.cm-gutters': {
    backgroundColor: 'var(--panel)',
    color: 'var(--mut)',
    borderRight: '1px solid var(--line)',
  },
  '.cm-activeLine': { backgroundColor: wash('acc', 6) },
  '.cm-activeLineGutter': { backgroundColor: 'var(--accS)', color: 'var(--ink)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: wash('acc', 22),
  },
  // Suggestions and the check's messages: panel surfaces, panel words.
  '.cm-tooltip': {
    backgroundColor: 'var(--panel)',
    color: 'var(--ink)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-ctl)',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  },
  '.cm-tooltip-autocomplete>ul>li': { padding: '2px 8px', fontFamily: 'var(--num)' },
  '.cm-tooltip-autocomplete>ul>li[aria-selected]': { backgroundColor: 'var(--acc)', color: '#ffffff' },
  // Muted by weight rather than by colour, so a selected row's white carries.
  '.cm-completionDetail': { marginLeft: '12px', fontStyle: 'normal', opacity: '0.7', fontFamily: "'IBM Plex Sans', system-ui, sans-serif" },
  // Narrow enough to stay over the card, the words wrapping; the fix in it
  // a panel button rather than CodeMirror's dark default.
  '.cm-tooltip-lint': { maxWidth: '360px' },
  '.cm-diagnostic': { padding: '6px 10px', whiteSpace: 'normal' },
  '.cm-diagnosticAction': {
    display: 'inline-block',
    marginTop: '6px',
    marginLeft: '0',
    padding: '4px 10px',
    border: '1px solid var(--acc)',
    borderRadius: 'var(--r-ctl)',
    backgroundColor: 'var(--accS)',
    color: 'var(--acc)',
    font: "600 12px 'IBM Plex Sans', system-ui, sans-serif",
    cursor: 'pointer',
  },
  '.cm-diagnostic-error': { borderLeft: '3px solid var(--red)' },
  '.cm-diagnostic-warning': { borderLeft: '3px solid var(--amb)' },
  // The gutter's marks: small solid dots, not the default outlined circle
  // and triangle (*"mniejsze, i lite czerwone"*, 2026-09-26).
  // Centred in the line, both ways (*"kropka wyśrodkowana na środku linii"*).
  '.cm-gutter-lint .cm-gutterElement': { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  '.cm-lint-marker': {
    content: 'normal',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
  '.cm-lint-marker-error': { content: 'normal', backgroundColor: 'var(--red)' },
  '.cm-lint-marker-warning': { content: 'normal', backgroundColor: 'var(--amb)' },
  '.cm-lintRange-error': { backgroundColor: wash('red', 12) },
  '.cm-lintRange-warning': { backgroundColor: wash('amb', 14) },
  '.cm-panels': { backgroundColor: 'var(--panel)', color: 'var(--ink)' },
  '.cm-panels-top': { borderBottom: '1px solid var(--line)' },
  '.cm-searchMatch': { backgroundColor: wash('amb', 25) },
});

export const gcodeEditing = [gcode, syntaxHighlighting(colours), frame];
