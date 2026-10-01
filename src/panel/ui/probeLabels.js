/*
 * Where a probing drawing's labels stand: one rule for every drawing, set
 * out in `probeDraw`'s header (map §4a/4b, Mateusz 2026-10-01).
 */

// A figure's words well under the drawing's — 8.5 px at its usual 13 (Mateusz, 2026-10-02: the smallest set "wygląda ok").
export const TAG_SCALE = 0.65;

// The figures face (Azeret Mono) is 0.65 em a glyph, the em dash two (measured in the panel,
// 2026-10-01: "stoi — za nisko" ran out of its box); `fs` the drawing's size.
const glyphs = (text) => text.length + (text.match(/—/g) || []).length;
export const tagWidth = (text, fs) => (glyphs(text) * 0.66 + 1) * fs * TAG_SCALE;

/** What a line along `axis` at `at` covers from `from` to `to`, `half` out of it: a rect to keep labels off. */
export const lineRect = (axis, at, from, to, half) => {
  const [lo, hi] = from < to ? [from, to] : [to, from];
  return axis === 'v' ? [at - half, lo, 2 * half, hi - lo] : [lo, at - half, hi - lo, 2 * half];
};

/**
 * The part of the drawing's plane the screen shows: the viewBox `view`, and the room round it a drawing
 * fitted into its `box` at scale `k` has — the drawing's edge is the box's, not the viewBox's.
 */
export const shownView = (view, k, box) => {
  if (!box) {
    return view;
  }
  const [w, h] = [Math.max(view[2], box.width / k), Math.max(view[3], box.height / k)];
  return [view[0] + (view[2] - w) / 2, view[1] + (view[3] - h) / 2, w, h];
};

/** A placed label as a rect, `[x, y, w, h]`, for the next to keep off. */
export const tagRect = ({ x, y, w, h }) => [x, y - h / 2, w, h];

// The gap round a label, in screen px (Mateusz, 2026-10-01: "G 6"); and off the drawing's edge (review
// note #4, 2026-10-02: "1 albo 2 px marginesu od krawędzi rysunku").
const LABEL_GAP = 6;
const EDGE_GAP = 2;
const overlaps = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

/*
 * Where a line's labels stand, by that rule: `parts`, `[from, to, text]`
 * in order from the top or from the tool, along the line at cross position
 * `at`; `side` +1 right of it or under it, -1 left or over; `ticks`,
 * `[along, half]`, what stands out across it; `view` the drawing's
 * `[x, y, w, h]`; `avoid`, rects `[x, y, w, h]` it must not cross nor come
 * nearer than g to — a zero's line; `past`, 'before' or 'after', a single
 * label asked past that end of its line first.
 * Returns `{ x, y, w, h, text }` — the left edge and the middle, as `Tag` takes them.
 */
export const placeTags = ({
  axis = 'v', at, side = 1, parts, ticks = [], view, avoid = [], past = null, size,
}) => {
  const shown = parts.filter(([, , text]) => text);
  if (!shown.length) {
    return [];
  }
  const g = LABEL_GAP / size.k;
  const e = EDGE_GAP / size.k;
  const h = size.fs * TAG_SCALE * 1.8;
  const v = axis === 'v';
  const width = (text) => tagWidth(text, size.fs);
  const len = (text) => (v ? h : width(text));
  // Off the farthest tick's end, wherever the label stands along the line: every label of a line, and of
  // lines in a row, the same distance off them (Mateusz, 2026-10-01: "etykiety wyrównane względem siebie").
  const reach = Math.max(size.hw, ...ticks.map(([, half]) => half));
  const ends = shown.flatMap(([a, b]) => [a, b]);
  const [lo, hi] = [Math.min(...ends), Math.max(...ends)];

  // Each label centred on its part — or, when two would meet, the stack centred on the whole line.
  let layout = shown.map(([a, b, text]) => ({ text, a0: (a + b) / 2 - len(text) / 2, row: 0 }));
  const meet = layout.some((one, i) => i > 0 && Math.max(one.a0, layout[i - 1].a0) - Math.min(one.a0 + len(one.text), layout[i - 1].a0 + len(layout[i - 1].text)) < g);
  if (meet && v) {
    let a = (lo + hi) / 2 - (layout.length * h + (layout.length - 1) * g) / 2;
    layout = layout.map((one) => {
      const placed = { ...one, a0: a };
      a += h + g;
      return placed;
    });
  } else if (meet) {
    layout = layout.map((one, row) => ({ ...one, a0: (lo + hi) / 2 - len(one.text) / 2, row }));
  }

  const boxes = (s, shift) => {
    const off = reach + g;
    return layout.map(({ text, a0, row }) => {
      const a = a0 + shift;
      const w = width(text);
      if (v) {
        return { x: s > 0 ? at + off : at - off - w, y: a + h / 2, w, text };
      }
      return { x: a, y: at + s * (off + h / 2 + row * (h + g)), w, text };
    });
  };
  // What it must not cross keeps the gap too.
  const keepOff = avoid.map(([x, y, w, ht]) => [x - g, y - g, w + 2 * g, ht + 2 * g]);
  const inside = (placed) => placed.every(({ x, y, w }) => x >= view[0] + e && y - h / 2 >= view[1] + e && x + w <= view[0] + view[2] - e && y + h / 2 <= view[1] + view[3] - e);
  const fits = (placed) => inside(placed) && placed.every(({ x, y, w }) => !keepOff.some((rect) => overlaps([x, y - h / 2, w, h], rect)));
  // Centred, then aligned to the line's first end, then its last; on its side, then the other.
  const first = lo - Math.min(...layout.map((one) => one.a0));
  const last = hi - Math.max(...layout.map((one) => one.a0 + len(one.text)));
  // Each on its own part: only the one that meets a line it must not cross moves to its part's end, the
  // others stay centred (Mateusz, 2026-10-01: "lift up by the lift — etykiety na środku").
  const each = (s) => {
    if (meet || shown.length < 2) {
      return [];
    }
    const placed = [];
    const clear = shown.every(([a, b, text], i) => {
      const [pa, pb] = [Math.min(a, b), Math.max(a, b)];
      const one = [layout[i].a0, pa, pb - len(text)].map((a0) => boxes(s, a0 - layout[i].a0)[i]).find((box) => {
        const prev = placed[i - 1];
        const apart = !prev || (v ? box.y - h / 2 - (prev.y + h / 2) >= g : box.x - (prev.x + prev.w) >= g);
        return apart && fits([box]);
      });
      placed.push(one);
      return Boolean(one);
    });
    return clear ? [placed] : [];
  };
  // Still on it: slid along its own line just clear of it, the least way first (L26, to confirm).
  const span = [Math.min(...layout.map((one) => one.a0)), Math.max(...layout.map((one) => one.a0 + len(one.text)))];
  const slides = keepOff.flatMap(([x, y, w, ht]) => (v ? [y - span[1], y + ht - span[0]] : [x - span[1], x + w - span[0]]))
    // Still beside its line: a slide past the line's end is not one.
    .filter((shift) => span[0] + shift < hi && span[1] + shift > lo)
    .sort((p, q) => Math.abs(p) - Math.abs(q));
  const tries = [side, -side].flatMap((s) => [...each(s), ...[0, first, last, ...slides].map((shift) => boxes(s, shift))]);
  // Room on neither side: past the line's ends, on its axis — one label before its first end (over an
  // arrow's start), else after its last; two, one before and one after (L25, Mateusz 2026-10-01: "jedna
  // na górze druga na dole", "F50 nad strzałką, wyrównanie do kreski górnej"). Centred on the line, or
  // flush with the ends of its ticks, reaching out to its side.
  // Centred on the line, pulled in to stay inside the drawing.
  const inX = (x, w) => Math.max(view[0] + e, Math.min(view[0] + view[2] - e - w, x));
  const inY = (y) => Math.max(view[1] + e + h / 2, Math.min(view[1] + view[3] - e - h / 2, y));
  const beyond = (text, after, flush) => {
    const w = width(text);
    if (v) {
      const x = { mid: at - w / 2, out: side > 0 ? at - reach : at + reach - w, in: side > 0 ? at + reach - w : at - reach }[flush];
      return { x: inX(x, w), y: after ? hi + g + h / 2 : lo - g - h / 2, w, text };
    }
    const y = { mid: at, out: at + side * (h / 2 - reach), in: at - side * (h / 2 - reach) }[flush];
    return { x: after ? hi + g : lo - g - w, y: inY(y), w, text };
  };
  const texts = layout.map((one) => one.text);
  const aligned = ['mid', 'out', 'in'];
  if (texts.length === 1) {
    [false, true].forEach((after) => aligned.forEach((flush) => tries.push([beyond(texts[0], after, flush)])));
    // Asked past one end before anything else (`past`: 'before' or 'after').
    if (past) {
      tries.unshift(...aligned.map((flush) => [beyond(texts[0], past === 'after', flush)]));
    }
  } else {
    aligned.forEach((flush) => tries.push([beyond(texts[0], false, flush), beyond(texts[1], true, flush)]));
  }
  // Nowhere clear: inside the drawing at least, never cut off by its edge, and over as little as can be.
  const over = (placed) => placed.reduce((all, { x, y, w }) => all + keepOff.reduce((sum, [rx, ry, rw, rh]) => {
    const dx = Math.min(x + w, rx + rw) - Math.max(x, rx);
    const dy = Math.min(y + h / 2, ry + rh) - Math.max(y - h / 2, ry);
    return sum + (dx > 0 && dy > 0 ? dx * dy : 0);
  }, 0), 0);
  const visible = tries.filter(inside);
  const least = visible.reduce((best, one) => (best && over(best) <= over(one) ? best : one), null);
  return (tries.find(fits) || least || tries[0]).map((one) => ({ ...one, h }));
};
