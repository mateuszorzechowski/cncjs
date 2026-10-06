/**
 * The sheet of paper under the tool, as the paper's drawing moves it — its
 * look from the design (Claude Design, `templates/probe-paper-proposal`,
 * 2026-09-30), its behaviour made to hold together (Mateusz, the same day:
 * *"zweryfikuj zachowanie fałd i łuku"*).
 *
 * The sheet has one length. The hand holds its left end and moves it; the
 * tool, as it comes down, grips it — not at all, by friction, or pinned —
 * and where the hand's move goes is decided by the grip alone:
 * - free: the whole sheet goes with the hand;
 * - friction `f`: pushed, `f` of the move stays between the hand and the
 *   tool as slack and the rest slides under the tool; pulled, the slack
 *   comes out first and then the sheet slides;
 * - pinned: nothing slides — pushed, all of it is slack; pulled, the hand
 *   stops once the sheet is straight.
 * So the slack is never made or lost, only moved, and it carries from one
 * move of the cycle to the next: nothing jumps. Slack under friction bunches
 * by the hand, where it is pushed (Mateusz: *"przy ręce (fizycznie)"*);
 * pinned, the whole stretch bows into one arch — how a strip held at both
 * ends buckles. Between the two the shape blends over a moment, not a frame.
 *
 * All in the drawing's units, the paper's side view: `x` across, `lift` up
 * off the surface.
 */

// Where the hand holds the sheet at rest, the tool's axis, and the sheet's far end at rest.
export const HAND_X = 40;
export const TOOL_X = 145;
export const END_X = 230;

// The simulation's step; the state at any time is worked out from the cycle's start.
const STEP_MS = 10;
// How fast the shape turns from folds to an arch and back, and how fast a freed sheet lies flat.
const BLEND_MS = 180;
const SPRING_MS = 120;

// The folds by the hand: how far in from it, how wide, how high against the first.
const FOLDS = [[12, 9, 1], [28, 8, 0.72], [42, 7, 0.5], [54, 6, 0.32]];
// The arch's height against the folds', before both are scaled to the slack.
const ARCH = 1.2;
// Samples along the stretch between the hand and the tool.
const SAMPLES = 64;

/** One step of the hand, `dh` (+ towards the tool), under `grip`: the new state. */
export const stepSheet = (state, dh, grip, dt) => {
  let { hand, slack, slid } = state;
  if (grip.pinned) {
    if (dh >= 0) {
      slack += dh;
      hand += dh;
    } else {
      const back = Math.min(-dh, slack);
      slack -= back;
      hand -= back;
    }
  } else {
    const f = grip.friction || 0;
    if (dh >= 0) {
      slack += f * dh;
      slid += (1 - f) * dh;
    } else {
      const out = Math.min(-dh, slack);
      slack -= out;
      slid += dh + out;
    }
    hand += dh;
    if (f === 0 && slack > 0) {
      // Let go, the sheet springs flat: its slack slides out past the tool.
      const out = slack * (1 - Math.exp(-dt / SPRING_MS));
      slack -= out;
      slid += out;
    }
  }
  const target = grip.pinned ? 1 : 0;
  const mix = state.mix + (target - state.mix) * (1 - Math.exp(-dt / BLEND_MS));
  return {
    hand, slack, slid, mix,
  };
};

export const START = {
  hand: 0, slack: 0, slid: 0, mix: 0,
};

/**
 * The state at `ms` on the cycle's clock: `script(ms)` says where the hand
 * would be and how the tool grips; worked out step by step from the start.
 */
export const sheetAt = (ms, script) => {
  let state = START;
  let wanted = script(0).hand;
  for (let at = STEP_MS; at <= ms + 1e-9; at += STEP_MS) {
    const { hand, grip } = script(at);
    // The hand pulled back against a pinned sheet stays where it stopped: follow from there.
    state = stepSheet(state, hand - wanted, grip, STEP_MS);
    wanted = hand;
  }
  return state;
};

/** The profile between the hand and the tool, `t` 0 at the hand: folds and the arch blended by `mix`. */
const bowOf = (t, mix, width) => {
  const arch = ARCH * (1 - Math.cos(2 * Math.PI * t)) / 2;
  let folds = 0;
  const scale = width / (TOOL_X - HAND_X);
  FOLDS.forEach(([at, wide, high]) => {
    const u = (t * width - at * scale) / (wide * scale);
    if (Math.abs(u) < 1) {
      folds += high * (1 + Math.cos(Math.PI * u)) / 2;
    }
  });
  return mix * arch + (1 - mix) * folds;
};

const lengthOf = (xs, ys, k) => {
  let length = 0;
  for (let i = 1; i < xs.length; i++) {
    length += Math.hypot(xs[i] - xs[i - 1], k * (ys[i] - ys[i - 1]));
  }
  return length;
};

/**
 * The sheet drawn: `points` from the hand to the tool, `[x, lift]`, bowed so
 * their length is the gap plus the slack, and `end`, where its far end is.
 */
export const sheetShape = ({ hand, slack, slid, mix }) => {
  const from = HAND_X + hand;
  const width = TOOL_X - from;
  const xs = [];
  const ys = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    xs.push(from + width * t);
    ys.push(bowOf(t, mix, width));
  }
  let k = 0;
  if (slack > 1e-3) {
    let lo = 0;
    let hi = 80;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (lengthOf(xs, ys, mid) < width + slack) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    k = lo;
  }
  return {
    points: xs.map((x, i) => [x, k * ys[i]]),
    end: END_X + slid,
  };
};

/** How long the sheet is as drawn, hand to far end — the same at every moment. */
export const drawnLength = (shape) => {
  const { points, end } = shape;
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return length + (end - TOOL_X);
};
