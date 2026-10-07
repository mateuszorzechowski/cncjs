/**
 * A probing cycle laid out in time, the way a player lays out a film in
 * chapters (review of 2026-09-30: *"obejrzeć cały cykl od klikniętego
 * momentu, jeden etap, jeden etap w zapętleniu"*).
 *
 * An item is one move: when it starts on the cycle's clock, how long it moves
 * (`run`), how long it lasts with its hold (`span`), and its `parts` — the
 * segments the bar draws for it, as `[from, to]` fractions of its run: a
 * set-up's legs, the zero's two views on a phone, or one part up to where
 * the move stops changing.
 */

/** The items of a cycle: `names` in order, each with its `span`, `run` and `parts`. */
export const layOut = (names, { spanOf, runOf, partsOf }) => {
  let start = 0;
  return names.map((name, i) => {
    const item = {
      name, start, span: spanOf(name, i), run: runOf(name), parts: partsOf(name),
    };
    start += item.span;
    return item;
  });
};

/** How long the whole cycle lasts. */
export const totalOf = (items) => {
  const last = items[items.length - 1];
  return last.start + last.span;
};

/** The item under way at `t`: the last one begun. */
const indexAt = (items, t) => {
  let i = 0;
  while (i + 1 < items.length && items[i + 1].start <= t) {
    i += 1;
  }
  return i;
};

/** What plays at `t`: the move, how far through its run (`p`), and how far into it. */
export const frameAt = (items, t) => {
  const item = items[indexAt(items, t)];
  const into = Math.max(0, t - item.start);
  return {
    name: item.name, p: Math.min(1, into / item.run), into, run: item.run, span: item.span,
  };
};

/** Every segment the bar draws, in order: its move, its part, and its time from `a` to `b`. */
export const segmentsOf = (items) => items.flatMap((item) => item.parts.map(([from, to], part) => ({
  name: item.name, part, a: item.start + from * item.run, b: item.start + to * item.run,
})));

/** The segment under way at `t`: the last one begun. */
export const segmentAt = (segments, t) => {
  let i = 0;
  while (i + 1 < segments.length && segments[i + 1].a <= t) {
    i += 1;
  }
  return i;
};

/**
 * The time a pick on the bar covers: `names`, one move or a stage's or a
 * group's, from the first's start to where the last stops changing — or,
 * with `part`, that one segment of the move.
 */
export const rangeOf = (items, names, part = null) => {
  const segments = segmentsOf(items).filter((one) => names.includes(one.name) && (part === null || one.part === part));
  return { a: segments[0].a, b: segments[segments.length - 1].b };
};

/** Where on the cycle's clock move `name` is at `p` through its run. */
export const timeAt = (items, name, p) => {
  const item = items.find((one) => one.name === name);
  return item.start + p * item.run;
};

/**
 * How full each of the bar's segments is at `t`, by the same segments a
 * pause, a loop and a single play stop at — so the bar never stops short
 * of a segment's end (review note, 2026-09-30: *"etapy kończące się w
 * niepoprawnych miejscach … rozwiązać raz i dobrze"*). Keyed `name:part`.
 * `whole`: the segments before the one under way drawn done; else only the
 * move under way's.
 */
export const fillsAt = (items, t, whole = true) => {
  const { name } = frameAt(items, t);
  return Object.fromEntries(segmentsOf(items).map((one) => {
    let fill = 0;
    if (t >= one.b) {
      fill = whole || one.name === name ? 1 : 0;
    } else if (t > one.a) {
      fill = (t - one.a) / (one.b - one.a);
    }
    return [`${one.name}:${one.part}`, fill];
  }));
};
