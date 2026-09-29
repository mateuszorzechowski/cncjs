import { useEffect, useRef, useState } from 'react';
import {
  acceptCompletion, completionStatus, currentCompletions, selectedCompletionIndex, setSelectedCompletion,
} from '@codemirror/autocomplete';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import FadeScroller from '../ui/FadeScroller';
import { gcodeLine } from './gcode';

/*
 * One line: a newline typed or pasted is not taken. Enter sends instead.
 */
const oneLine = EditorState.transactionFilter.of((tr) => (tr.newDoc.lines > 1 ? [] : tr));

// Dead as a disabled input is, and said so to whatever reads the field.
const locked = (disabled) => [
  EditorState.readOnly.of(disabled),
  EditorView.editable.of(!disabled),
  EditorView.contentAttributes.of({ 'aria-disabled': String(disabled) }),
];

// What the list shows: the suggestions CodeMirror worked out, and which is chosen.
const listOf = (state) => (completionStatus(state) === 'active'
  ? { options: currentCompletions(state).map(({ label, detail }) => ({ label, detail })), selected: selectedCompletionIndex(state) }
  : { options: [], selected: null });

const sameList = (a, b) => a.selected === b.selected && a.options.length === b.options.length &&
  a.options.every((option, i) => option.label === b.options[i].label && option.detail === b.options[i].detail);

/**
 * The line typed at the MDI screen: the editor's colours and suggestions in
 * a field of the panel's own (review notes, 2026-09-29: *"kolorowa
 * składnia"*, *"autocomplete?"*). A plain input could do neither.
 *
 * Controlled like an input — `value` and `onChange` — so the screen's
 * history can put a line back. Enter sends and up/down walk the history,
 * except while the suggestions are open, where they move through them.
 * `help` is the suggestions extension, handed in once the server's words
 * have arrived.
 *
 * **The list is the panel's, not CodeMirror's.** Its own popup opened below
 * a line at the foot of the screen — off it — at the cursor, narrow, with
 * the browser's scrollbar (review notes: *"podpowiedzi wchodzą pod ekran"*,
 * *"customowy scroll"*, *"dropdown na całą szerokość inputa"*). CodeMirror
 * still works the suggestions out and moves the choice; this draws them over
 * the field, as wide as it, in a `FadeScroller`, rows a finger's height
 * where there is no pointer (`touch`).
 */
const MdiLine = ({ value, onChange, onSend, onWalk, disabled, label, hint, help, touch = false }) => {
  const host = useRef(null);
  const view = useRef(null);
  const locking = useRef(new Compartment());
  const helping = useRef(new Compartment());
  const chosen = useRef(null);
  const [list, setList] = useState({ options: [], selected: null });
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
            const next = listOf(update.state);
            setList((now) => (sameList(now, next) ? now : next));
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

  // The chosen suggestion kept in view as the arrows move through them.
  useEffect(() => {
    chosen.current?.scrollIntoView?.({ block: 'nearest' });
  }, [list.selected]);

  // A tap takes the suggestion, as Enter on it would, and typing goes on.
  const take = (index) => {
    const editor = view.current;
    editor.dispatch({ effects: setSelectedCompletion(index) });
    acceptCompletion(editor);
    editor.focus();
  };

  return (
    <div className="relative flex min-w-0 flex-1">
      {list.options.length ? (
        // Its thumb inside it, wherever the phone puts other thumbs (`FadeScroller`).
        <div data-thumb-inside="" className="absolute inset-x-0 bottom-full z-20 mb-2 flex max-h-[var(--listMax)] flex-col rounded-ctl border border-line bg-panel py-1 [--thumbGutter:0px]">
          <FadeScroller>
            <ul className="m-0 list-none p-0" role="listbox" aria-label={label}>
              {list.options.map((option, index) => {
                const on = index === list.selected;
                return (
                  <li
                    key={option.label}
                    ref={on ? chosen : undefined}
                    role="option"
                    aria-selected={on}
                    // Pressing a row must not take the focus from the line.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => take(index)}
                    className={[
                      'flex cursor-pointer gap-3 px-3',
                      touch ? 'min-h-11 items-center' : 'items-baseline py-1.5',
                      on ? 'bg-acc text-white' : 'text-ink hover:bg-accS',
                    ].join(' ')}
                  >
                    <span className="shrink-0 font-num text-base">{option.label}</span>
                    {option.detail ? <span className={`min-w-0 truncate text-note ${on ? '' : 'text-mut'}`}>{option.detail}</span> : null}
                  </li>
                );
              })}
            </ul>
          </FadeScroller>
        </div>
      ) : null}
      <div
        ref={host}
        className={[
          'flex h-chiph min-w-0 flex-1 items-center rounded-ctl border border-line bg-field px-3 text-note focus-within:border-acc',
          disabled ? 'opacity-45' : '',
        ].join(' ')}
      />
    </div>
  );
};

export default MdiLine;
