import { useEffect, useImperativeHandle, useRef } from 'react';
import { Compartment, EditorState, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { gcodeEditing } from './gcode';

const TONE_CLASS = { bad: 'cm-issue-bad', warn: 'cm-issue-warn' };

/** The lines the checks have something to say about, as line decorations. */
const issueLines = (doc, marks) => {
  const builder = new RangeSetBuilder();
  [...marks]
    .filter(({ line }) => line >= 1 && line <= doc.lines)
    .sort((a, b) => a.line - b.line)
    .forEach(({ line, tone }) => {
      const at = doc.line(line).from;
      builder.add(at, at, Decoration.line({ class: TONE_CLASS[tone] || TONE_CLASS.warn }));
    });
  return builder.finish();
};

/**
 * A G-code file, to read and to change — CodeMirror, in the panel's colours.
 *
 * Built once per file and left alone while it is typed in: the text lives in
 * the editor, not in React state, because a program is often a megabyte and
 * copying it out on every key is what makes a plain text box stutter. Whoever
 * holds `ref` asks for it when saving (`text()`), and hears only whether it
 * differs from what was opened (`onDirty`).
 *
 * `marks` are `[{ line, tone }]` — where a check found something, `bad` or
 * `warn` — and can change without rebuilding: a check finishing while the
 * file is open marks its lines where the operator is looking.
 */
const GcodeEditor = ({ initial, marks = [], readOnly = false, onDirty, label, ref }) => {
  const host = useRef(null);
  const view = useRef(null);
  const marking = useRef(new Compartment());
  const locking = useRef(new Compartment());
  const dirty = useRef(false);
  const heard = useRef(onDirty);
  heard.current = onDirty;

  useEffect(() => {
    const state = EditorState.create({
      doc: initial,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        search({ top: true }),
        highlightSelectionMatches(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        gcodeEditing,
        marking.current.of([]),
        locking.current.of(EditorState.readOnly.of(readOnly)),
        EditorView.contentAttributes.of({ 'aria-label': label }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) {
            return;
          }
          // Compared by length first: the whole text is only compared when
          // the lengths agree, which is rarely more than once per undo.
          const now = update.state.doc.length !== initial.length || update.state.doc.toString() !== initial;
          if (now !== dirty.current) {
            dirty.current = now;
            heard.current?.(now);
          }
        }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current });
    dirty.current = false;
    return () => {
      view.current.destroy();
      view.current = null;
    };
    // Built again only for another file; `readOnly` and `marks` are
    // reconfigured in place below.
  }, [initial]);

  useEffect(() => {
    const editor = view.current;
    if (editor) {
      editor.dispatch({
        effects: marking.current.reconfigure(EditorView.decorations.of(issueLines(editor.state.doc, marks))),
      });
    }
  }, [marks, initial]);

  useEffect(() => {
    view.current?.dispatch({ effects: locking.current.reconfigure(EditorState.readOnly.of(readOnly)) });
  }, [readOnly, initial]);

  useImperativeHandle(ref, () => ({
    text: () => view.current?.state.doc.toString() ?? initial,
    reset: () => {
      const editor = view.current;
      editor?.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: initial } });
    },
  }), [initial]);

  return <div ref={host} className="min-h-0 flex-1 overflow-hidden rounded-ctl border border-line" />;
};

export default GcodeEditor;
