import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { gcodeEditing } from './gcode';
import EditorScrollbar from './EditorScrollbar';

/**
 * A G-code file, to read and to change — CodeMirror, in the panel's colours.
 *
 * Built once per file and left alone while it is typed in: the text lives in
 * the editor, not in React state, because a program is often a megabyte and
 * copying it out on every key is what makes a plain text box stutter. Whoever
 * holds `ref` asks for it when saving (`text()`), and hears only whether it
 * differs from what was opened (`onDirty`).
 *
 * `extensions` are what the editor is given besides reading and writing —
 * the suggestions and the checks (`assist`), fixed for the file.
 */
/*
 * Read-only is not typed into and not typed at: `readOnly` alone keeps the
 * text editable to the browser, so a tap on a phone brought the keyboard up
 * over a file nobody may change (Mateusz, 2026-09-25). `editable` off as
 * well — the text can still be scrolled, selected and searched.
 */
const locked = (readOnly) => [EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)];

const GcodeEditor = ({ initial, extensions = [], readOnly = false, onDirty, label, ref }) => {
  const host = useRef(null);
  const view = useRef(null);
  const locking = useRef(new Compartment());
  const helping = useRef(new Compartment());
  const dirty = useRef(false);
  const heard = useRef(onDirty);
  heard.current = onDirty;
  // The view once built, and a count of its changes, for the scrollbar.
  const [built, setBuilt] = useState(null);
  const [tick, setTick] = useState(0);

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
        helping.current.of(extensions),
        locking.current.of(locked(readOnly)),
        EditorView.contentAttributes.of({ 'aria-label': label }),
        EditorView.updateListener.of((update) => {
          // The text, its findings or its height changed: the scrollbar's
          // marks are counted again.
          if (update.docChanged || update.geometryChanged || update.transactions.some((tr) => tr.effects.length)) {
            setTick((n) => n + 1);
          }
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
    setBuilt(view.current);
    dirty.current = false;
    return () => {
      view.current.destroy();
      view.current = null;
      setBuilt(null);
    };
    // Built again only for another file; `readOnly` and `extensions` are
    // reconfigured in place below.
  }, [initial]);

  useEffect(() => {
    view.current?.dispatch({ effects: locking.current.reconfigure(locked(readOnly)) });
  }, [readOnly, initial]);

  // The help can arrive after the file — the server's words are asked for
  // separately — and is put in without touching what has been typed.
  useEffect(() => {
    view.current?.dispatch({ effects: helping.current.reconfigure(extensions) });
  }, [extensions, initial]);

  useImperativeHandle(ref, () => ({
    text: () => view.current?.state.doc.toString() ?? initial,
    // Back to the file as opened: the text, the cursor at the top, and the
    // editor let go of, so nothing about it looks still in the middle of
    // being changed.
    reset: () => {
      const editor = view.current;
      if (!editor) {
        return;
      }
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: initial },
        selection: { anchor: 0 },
        scrollIntoView: true,
      });
      editor.contentDOM.blur();
    },
  }), [initial]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-ctl border border-line">
      <div ref={host} className="min-h-0 min-w-0 flex-1" />
      {built ? <EditorScrollbar view={built} tick={tick} /> : null}
    </div>
  );
};

export default GcodeEditor;
