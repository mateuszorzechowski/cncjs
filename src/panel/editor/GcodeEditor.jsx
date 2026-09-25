import { useEffect, useImperativeHandle, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { gcodeEditing } from './gcode';

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
const GcodeEditor = ({ initial, extensions = [], readOnly = false, onDirty, label, ref }) => {
  const host = useRef(null);
  const view = useRef(null);
  const locking = useRef(new Compartment());
  const helping = useRef(new Compartment());
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
        helping.current.of(extensions),
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
    // Built again only for another file; `readOnly` and `extensions` are
    // reconfigured in place below.
  }, [initial]);

  useEffect(() => {
    view.current?.dispatch({ effects: locking.current.reconfigure(EditorState.readOnly.of(readOnly)) });
  }, [readOnly, initial]);

  // The help can arrive after the file — the server's words are asked for
  // separately — and is put in without touching what has been typed.
  useEffect(() => {
    view.current?.dispatch({ effects: helping.current.reconfigure(extensions) });
  }, [extensions, initial]);

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
