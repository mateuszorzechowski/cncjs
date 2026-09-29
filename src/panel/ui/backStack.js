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
 * It was the browser's own history, a step per screen and per sheet, and it
 * did what history does: back walked through every screen visited, and a
 * sheet that closed itself to open another took back the new one's step as
 * well as its own, so the next back closed both and changed the screen.
 *
 * Now the history holds at most one step of the panel's own — a sentinel on
 * top of wherever the page was opened — while there is somewhere to go back
 * to inside the panel. Back takes it away, the panel does step 1 or 2, and
 * puts it back if there is still somewhere to go. Screens change the address
 * in place (`useScreen`), so an address still names the screen and its tab.
 */
const layers = [];
const screen = { current: null, home: 'dashboard', goHome: null };
// Our own backs, when a sentinel no longer needed is taken away: not the operator's.
let skipping = 0;

const sentinelOn = () => Boolean(window.history.state?.panelBack);

// Whether a back would still have something to do inside the panel.
const needed = (closing = 0) => layers.length - closing > 0 || (screen.current !== null && screen.current !== screen.home);

/** Put the sentinel on, when there is somewhere to go back to and it is not on already. */
const arm = (closing = 0) => {
  if (needed(closing) && !sentinelOn()) {
    window.history.pushState({ panelBack: true }, '', window.location.href);
  }
};

/** Take it away again when there is not — so the next back leaves rather than doing nothing. */
const disarm = () => {
  if (!needed() && sentinelOn()) {
    skipping += 1;
    window.history.back();
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (skipping > 0) {
      skipping -= 1;
      // Something may have opened while that back was on its way.
      arm();
      return;
    }
    const top = layers[layers.length - 1];
    if (top) {
      top.close();
      arm(1);
      return;
    }
    if (needed()) {
      screen.goHome?.();
    }
  });
}

/**
 * The screen the panel shows, and the way home — from `useScreen`, on every
 * change of screen. The address is the screen's; this keeps the sentinel on
 * while the screen is not the dashboard, and off when it is.
 */
export const backScreen = (current, goHome) => {
  screen.current = current;
  screen.goHome = goHome;
  arm();
  disarm();
};

/** While `open`, this layer is what back closes first, with `onClose`. */
const useBackCloses = (open, onClose) => {
  const closing = useRef(onClose);
  closing.current = onClose;
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const layer = { close: () => closing.current() };
    layers.push(layer);
    arm();
    return () => {
      layers.splice(layers.indexOf(layer), 1);
      // Closed by hand, or by back: the sentinel goes when nothing is left to go back to.
      disarm();
    };
  }, [open]);
};

export default useBackCloses;
