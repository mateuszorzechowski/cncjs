import { useEffect, useRef } from 'react';

/*
 * What back does on the panel — the browser's button, a phone's back gesture.
 *
 * **One back, one thing, on a fixed path home** (Mateusz, 2026-09-29: *"jeden
 * gest jeden arkusz"*; *"wstecz ma nawigować stałą ścieżką do ekranu głównego,
 * a nie do poprzedniego elementu historii"*):
 *
 *   1. the layer opened last — a sheet, or the phone menu raised — closes,
 *      and only it: a sheet opened from a sheet goes back to the first;
 *   2. with nothing open, a screen other than the dashboard goes to the
 *      dashboard — from anywhere, whatever was visited before;
 *   3. on the dashboard with nothing open, back leaves the panel.
 *
 * **Every step of history is put there by a tap, never by back.** Chrome on
 * Android skips, on back, an entry a page added without a user's gesture: a
 * step re-added while handling back was jumped over, and the second back
 * after closing a sheet left the app instead of closing the first sheet
 * (measured on Mateusz's phone, 2026-09-29). So a step is pushed when a layer
 * opens or a screen other than the dashboard is gone to — both follow a tap —
 * and back only ever takes steps away.
 *
 * `entries` mirrors the steps above where the page was opened, oldest first:
 * a layer's, or the screen's (at most one: "not on the dashboard"). A layer
 * closed by hand takes its step back when it is the newest; under a newer
 * one it cannot, and its step is left dead — back passes over it.
 */
const entries = [];
const screen = { current: null, home: 'dashboard', goHome: null };
// Our own backs, taking a closed layer's step away: not the operator's.
let skipping = 0;
let next = 1;

const push = (entry) => {
  window.history.pushState({ panelBack: entry.id }, '', window.location.href);
  entries.push(entry);
};

/** Take `entry`'s step away if it is the newest; otherwise leave it dead. */
const retire = (entry) => {
  const at = entries.indexOf(entry);
  if (at < 0) {
    return;
  }
  if (at === entries.length - 1 && window.history.state?.panelBack === entry.id) {
    entries.pop();
    skipping += 1;
    window.history.back();
  } else {
    entry.dead = true;
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (skipping > 0) {
      skipping -= 1;
      return;
    }
    const entry = entries.pop();
    if (!entry) {
      return;
    }
    if (entry.dead) {
      // A step nothing stands behind any more: this back is for the next one.
      window.history.back();
      return;
    }
    if (entry.layer) {
      entry.layer.popped = true;
      entry.layer.close();
      return;
    }
    screen.goHome?.();
  });
}

const screenEntry = () => entries.find((entry) => entry.screen && !entry.dead);

/*
 * A page opened on another screen — an address, a reload — has no tap to put
 * its step there with, so it is put there on the first one.
 */
let waiting = null;
const onFirstTouch = () => {
  if (waiting) {
    return;
  }
  waiting = () => {
    window.removeEventListener('pointerdown', waiting, true);
    waiting = null;
    if (screen.current !== screen.home && !screenEntry()) {
      push({ id: next++, screen: true });
    }
  };
  window.addEventListener('pointerdown', waiting, true);
};

/**
 * The screen the panel shows, and the way home — from `useScreen`, on every
 * change of screen. Away from the dashboard there is one step to go back
 * home with; on it, none.
 */
export const backScreen = (current, goHome, { first = false } = {}) => {
  screen.current = current;
  screen.goHome = goHome;
  const kept = screenEntry();
  if (current !== screen.home && !kept) {
    if (first) {
      onFirstTouch();
    } else {
      push({ id: next++, screen: true });
    }
  } else if (current === screen.home && kept) {
    retire(kept);
  }
};

/** While `open`, this layer is what back closes first, with `onClose`. */
const useBackCloses = (open, onClose) => {
  const closing = useRef(onClose);
  closing.current = onClose;
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const layer = { popped: false, close: () => closing.current() };
    const entry = { id: next++, layer };
    push(entry);
    return () => {
      // Closed by hand: its step goes, now or as a dead one.
      if (!layer.popped) {
        retire(entry);
      }
    };
  }, [open]);
};

export default useBackCloses;
