import { useEffect, useRef } from 'react';
import { completionStatus } from '@codemirror/autocomplete';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { gcodeLine } from './gcode';

/*
 * One line: a newline typed or pasted is not taken. Enter sends instead.
 */
const oneLine = EditorState.transactionFilter.of((tr) => (tr.newDoc.lines > 1 ? [] : tr));

const locked = (disabled) => [EditorState.readOnly.of(disabled), EditorView.editable.of(!disabled)];

/**
 * The line typed at the MDI screen: the editor's colours and suggestions in
 * a field of the panel's own (review notes, 2026-09-29: *"kolorowa
 * składnia"*, *"autocomplete?"*). A plain input could do neither.
 *
 * Controlled like an input — `value` and `onChange` — so the screen's
 * history can put a line back. Enter sends and up/down walk the history,
 * except while the list of suggestions is open, where they pick from it.
 * `help` is the suggestions extension, handed in once the server's words
 * have arrived.
 */
const MdiLine = ({ value, onChange, onSend, onWalk, disabled, label, hint, help }) => {
  const host = useRef(null);
  const view = useRef(null);
  const locking = useRef(new Compartment());
  const helping = useRef(new Compartment());
  // Read through refs, so the editor is built once and never rebuilt for a
  // new handler.
  const heard = useRef({ onChange, onSend, onWalk });
  heard.current = { onChange, onSend, onWalk };

  useEffect(() => {
    const idle = (state) => completionStatus(state) !== 'active';
    const keys = Prec.highest(keymap.of([
      { key: 'Enter', run: (v) => (idle(v.state) ? (heard.current.onSend(v.state.doc.toString()), true) : false) },
      { key: 'ArrowUp', run: (v) => (idle(v.state) ? (heard.current.onWalk(-1), true) : false) },
      { key: 'ArrowDown', run: (v) => (idle(v.state) ? (heard.current.onWalk(1), true) : false) },
    ]));
    view.current = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          keys,
          oneLine,
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          gcodeLine,
          placeholder(hint),
          helping.current.of(help ?? []),
          locking.current.of(locked(disabled)),
          EditorView.contentAttributes.of({
            'aria-label': label, enterkeyhint: 'send', autocapitalize: 'characters', autocorrect: 'off', spellcheck: 'false',
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              heard.current.onChange(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    return () => {
      view.current.destroy();
      view.current = null;
    };
    // Built once; the rest is reconfigured below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A line put back from the history, or cleared after sending.
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value }, selection: { anchor: value.length } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: locking.current.reconfigure(locked(disabled)) });
  }, [disabled]);

  useEffect(() => {
    view.current?.dispatch({ effects: helping.current.reconfigure(help ?? []) });
  }, [help]);

  return (
    <div
      ref={host}
      className={[
        'flex h-chiph min-w-0 flex-1 items-center rounded-ctl border border-line bg-field px-3 text-note focus-within:border-acc',
        disabled ? 'opacity-45' : '',
      ].join(' ')}
    />
  );
};

export default MdiLine;
