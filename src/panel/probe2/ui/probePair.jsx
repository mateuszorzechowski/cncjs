import {
  createContext, useCallback, useContext, useLayoutEffect, useMemo, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { placeTags } from './probeLabels';

/*
 * Two views of a probing step drawn side by side — from above and from the
 * side — telling each other what they cover, so a label with no room in its
 * own view may stand in the other's free edge (Mateusz, 2026-10-02: "jeśli
 * etykieta byłaby w stanie wyjść poza swoją połowę ... połącz rysunki").
 *
 * Each view publishes, in screen pixels, its own box and what in it a label
 * must keep off: its lines and the tool, and the labels it placed inside
 * itself. A label that crosses into the other view is placed against those;
 * nothing inside a view is placed against the other's crossing labels, so
 * neither waits on the other.
 */
export const PairContext = createContext(null);

const round = (rect) => rect.map((v) => Math.round(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The store a pair of views shares: `{ seen, publish, layer, setLayer }` —
 * `layer` the drawing over both views the crossing labels go into, each view
 * still clipped to its own box.
 */
export const usePair = () => {
  const [seen, setSeen] = useState({});
  const [layer, setLayer] = useState(null);
  const publish = useCallback((id, what) => setSeen((all) => (same(all[id], what) ? all : { ...all, [id]: what })), []);
  return useMemo(() => ({
    seen, publish, layer, setLayer,
  }), [seen, publish, layer]);
};

/** The two views side by side, and over them the layer their crossing labels stand in. */
export const PairOfViews = ({ pair, children }) => (
  <PairContext.Provider value={pair}>
    {/* A line between the views (Mateusz, 2026-10-02), as the measurement screen has. */}
    <div className="relative grid grid-cols-2 divide-x divide-line">
      {children}
      <svg ref={pair.setLayer} aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible" />
    </div>
  </PairContext.Provider>
);

/*
 * Labels drawn out of view `node`: into the pair's layer, in the view's own
 * units — the layer takes them through the view's own transform.
 */
export const usePairLayer = (node) => {
  const pair = useContext(PairContext);
  return (labels) => {
    if (!pair || !pair.layer || !node || !labels.length || !node.getScreenCTM() || !pair.layer.getScreenCTM()) {
      return null;
    }
    const m = pair.layer.getScreenCTM().inverse().multiply(node.getScreenCTM());
    return createPortal(<g transform={`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`}>{labels}</g>, pair.layer);
  };
};

// Part outlines (L17) and the plate a label may lie on; and the hatch, a fill.
const ALLOWED = /stroke-line|stroke-plateEdge|stroke-hatch/;

// What a view draws, and what a crossing label or a pattern is: never counted as covering.
const DRAWN = 'path,line,circle,rect,text';
const NOT_COVERING = 'defs,pattern,[data-tag=ext]';
const OWN_TAG = '[data-tag=own]';

const screenRect = (el) => {
  const box = el.getBoundingClientRect();
  return [box.left, box.top, box.width, box.height];
};

/*
 * A view's part in its pair, `id` its name: the other view's box and what it
 * covers, in this view's units (`toUnits`), and the publishing of its own
 * after every render. Without a pair, nothing.
 */
export const usePairView = (id, node) => {
  const pair = useContext(PairContext);
  useLayoutEffect(() => {
    if (!pair || !node) {
      return;
    }
    const rects = [...node.querySelectorAll(DRAWN)]
      .filter((el) => !el.closest(NOT_COVERING))
      .filter((el) => el.closest(OWN_TAG) || (!ALLOWED.test(el.getAttribute('class') || '') && getComputedStyle(el).stroke !== 'none'))
      .map((el) => round(screenRect(el)))
      .filter(([, , w, h]) => w > 0 || h > 0);
    pair.publish(id, { box: round(screenRect(node)), rects });
  });
  if (!pair || !node || !node.getScreenCTM()) {
    return null;
  }
  const other = Object.entries(pair.seen).find(([key]) => key !== id);
  if (!other) {
    return null;
  }
  const back = node.getScreenCTM().inverse();
  const toUnits = ([x, y, w, h]) => {
    const a = new DOMPoint(x, y).matrixTransform(back);
    const b = new DOMPoint(x + w, y + h).matrixTransform(back);
    return [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y)];
  };
  return { box: toUnits(other[1].box), rects: other[1].rects.map(toUnits) };
};

/** The view `view` reaching on into the other's box, `[x, y, w, h]`. */
export const joined = (view, other) => {
  const x0 = Math.min(view[0], other[0]);
  const y0 = Math.max(view[1], other[1]);
  const x1 = Math.max(view[0] + view[2], other[0] + other[2]);
  const y1 = Math.min(view[1] + view[3], other[1] + other[3]);
  return [x0, y0, x1 - x0, y1 - y0];
};

/*
 * A line's labels placed in their own view; with nowhere clear there, and a
 * pair beside (`other`, from `usePairView`), on into the other's box, clear
 * of what it covers — marked `ext`.
 */
export const placePaired = (line, { view, avoid = [], size }, other) => {
  const own = placeTags({
    ...line, view, avoid, size,
  });
  if (!other || !own.length || own[0].ok) {
    return own;
  }
  const far = placeTags({
    ...line, view: joined(view, other.box), avoid: [...avoid, ...other.rects], size,
  });
  return far.length && far[0].ok ? far.map((one) => ({ ...one, ext: true })) : own;
};
