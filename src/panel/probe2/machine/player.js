import { segmentAt } from './timeline';

/**
 * The Setup drawing's player, as a film player has it (review of 2026-09-30:
 * *"jak to wygląda standardowo w tego typu animacjach?"*): a place on the
 * cycle's clock `t`, playing or paused, and a repeat that is a control of
 * its own rather than a side effect of a tap —
 *
 * - `cycle`: the whole cycle, round and round;
 * - `loop`: the range picked, round and round, its end held a while;
 * - `once`: the range picked, played to its end, then held — `ended`, not
 *   paused: a tap on another part plays it, play plays this one again.
 *
 * A tap on the bar moves `t` to the start of what was tapped and makes it
 * the range — `{ a, b }` in time, with `ids` and `part` for the bar to
 * underline; it does not change whether the drawing plays. A pause lets the
 * segment under way finish (`stopAt`) and holds there.
 */

export const MODES = ['cycle', 'loop', 'once'];

// Just inside a segment's start, so the one before is not the one shown.
const EPS = 1;

export const START = {
  t: 0, paused: false, ended: false, stopAt: null, mode: 'cycle', range: null,
};

/** The clock moved on by `dt`: round the cycle, round the range, or stopped at its end. */
export const advance = (state, dt, { total, hold }) => {
  if (state.ended || (state.paused && state.stopAt === null)) {
    return state;
  }
  let t = state.t + dt;
  if (state.stopAt !== null && t >= state.stopAt) {
    return { ...state, t: state.stopAt, stopAt: null };
  }
  const { range } = state;
  if (state.mode === 'loop' && range) {
    // Round the range alone: the last move's hold may run past the cycle's end, and must not wrap to its start (review note, 2026-09-30).
    if (t >= range.b + hold) {
      t = range.a + EPS;
    }
  } else if (state.mode === 'once' && range) {
    if (t >= range.b) {
      return {
        ...state, t: range.b, ended: true, stopAt: null,
      };
    }
  } else if (t >= total) {
    t %= total;
  }
  return { ...state, t };
};

/** The time the drawing shows: a loop's end held while it waits to start again. */
export const shownAt = (state, total) => {
  const { range } = state;
  const t = state.mode !== 'cycle' && range && state.t > range.b ? range.b : state.t;
  return Math.min(t, total - EPS);
};

/** Paused: the segment under way plays to its end first — at once, in a hold. */
export const pause = (state, segments) => {
  const segment = segments[segmentAt(segments, state.t)];
  const end = state.mode !== 'cycle' && state.range ? Math.min(segment.b, state.range.b) : segment.b;
  return { ...state, paused: true, stopAt: state.t < end ? end : null };
};

/** Playing again: a range played once starts over. */
export const play = (state) => ({
  ...state, paused: false, ended: false, stopAt: null, t: state.ended ? state.range.a + EPS : state.t,
});

/** To the start of `range`, which is now the one picked; playing or paused as before. */
export const seek = (state, range) => ({
  ...state, t: range.a + EPS, range, stopAt: null, ended: false,
});

/** Another repeat; one of a range with none picked takes the segment under way. */
export const setMode = (state, mode, segments) => {
  if (mode === 'cycle' || state.range) {
    return { ...state, mode, ended: false };
  }
  const {
    a, b, name, part,
  } = segments[segmentAt(segments, state.t)];
  return {
    ...state, mode, range: {
      a, b, ids: [name], part,
    },
  };
};

/*
 * A segment back or on — the step buttons. Back from well into a segment is
 * to its own start first, as a player's back button is.
 */
export const stepBy = (state, dir, segments) => {
  const i = segmentAt(segments, state.t);
  const into = state.t - segments[i].a;
  const j = dir < 0 && into > 300 ? i : (i + dir + segments.length) % segments.length;
  const {
    a, b, name, part,
  } = segments[j];
  return seek(state, {
    a, b, ids: [name], part,
  });
};
