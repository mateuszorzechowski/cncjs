import { useEffect, useRef } from 'react';

/*
 * Back closes the last thing opened over the screen — a sheet, or the phone
 * menu raised — and only that (Mateusz, 2026-09-28: *"zamykanie arkuszy
 * gestem też"*, *"wstecz ma zamykać tylko ostatni arkusz"*, *"menu też ma
 * zwijać wstecz"*).
 *
 * Each open layer puts one entry in the browser's history at the address it
 * opened over; the browser's back — the button, or a phone's back gesture —
 * takes that entry away, and the layer opened last closes. Closed any other
 * way, a layer takes its own entry back, and the step back that costs is not
 * a back anybody asked for: `skipping` lets it pass without closing the
 * layer under it. One stack for sheets and the menu, in the order they opened.
 */
const layers = [];
let skipping = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (skipping > 0) {
      skipping -= 1;
      return;
    }
    layers[layers.length - 1]?.close();
  });
}

/** While `open`, this layer has a step of history, and back closes it with `onClose`. */
const useBackCloses = (open, onClose) => {
  const closing = useRef(onClose);
  closing.current = onClose;
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const entry = { panelLayer: Math.random() };
    window.history.pushState(entry, '');
    const layer = {
      popped: false,
      close: () => {
        layer.popped = true;
        closing.current();
      },
    };
    layers.push(layer);
    return () => {
      layers.splice(layers.indexOf(layer), 1);
      // Closed by hand: take its step back, unless a new screen has been put on top of it.
      if (!layer.popped && window.history.state?.panelLayer === entry.panelLayer) {
        skipping += 1;
        window.history.back();
      }
    };
  }, [open]);
};

export default useBackCloses;
