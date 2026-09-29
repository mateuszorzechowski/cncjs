import { useMemo, useRef, useState } from 'react';
import {
  acceptCompletion, completionStatus, currentCompletions, selectedCompletionIndex, setSelectedCompletion,
} from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';

/**
 * The suggestions as the panel draws them, for any CodeMirror that takes
 * them: the MDI line and the file editor (review note, 2026-09-29: *"czy
 * podpowiedzi mogą być spójne w edytorze również?"*).
 *
 * CodeMirror still works the suggestions out and moves the choice through
 * them with the arrows; its own popup is hidden (`gcode.js`, `popups`) and
 * this hands the list to React: what is offered, which is chosen, and where
 * the cursor's line is, for a list that stands beside it.
 */

const EMPTY = { options: [], selected: null, line: null };

// What the list shows, and where the line with the cursor is on the screen.
const listOf = (view) => {
  const { state } = view;
  if (completionStatus(state) !== 'active') {
    return EMPTY;
  }
  const at = view.coordsAtPos(state.selection.main.head);
  return {
    options: currentCompletions(state).map(({ label, detail }) => ({ label, detail })),
    selected: selectedCompletionIndex(state),
    line: at ? { top: at.top, bottom: at.bottom } : null,
  };
};

const sameList = (a, b) => a.selected === b.selected && a.options.length === b.options.length &&
  a.line?.top === b.line?.top && a.line?.bottom === b.line?.bottom &&
  a.options.every((option, i) => option.label === b.options[i].label && option.detail === b.options[i].detail);

/** Take the suggestion at `index`, as Enter on it would, and go on typing. */
export const takeSuggestion = (view, index) => {
  if (!view) {
    return;
  }
  view.dispatch({ effects: setSelectedCompletion(index) });
  acceptCompletion(view);
  view.focus();
};

/**
 * `[list, listening]`: the list, and the extension that keeps it — given to
 * the editor once, when it is built.
 */
export const useSuggestionList = () => {
  const [list, setList] = useState(EMPTY);
  const set = useRef(setList);
  const listening = useMemo(() => EditorView.updateListener.of((update) => {
    // Measured after the update's own layout, so a scrolled line is where it now is.
    update.view.requestMeasure({
      read: (view) => listOf(view),
      write: (next) => set.current((now) => (sameList(now, next) ? now : next)),
    });
  }), []);
  return [list, listening];
};
