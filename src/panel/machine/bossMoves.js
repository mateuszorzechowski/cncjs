/**
 * The part touched from outside, as moves on its drawing — the geometry
 * `bossCycle` plays and draws: the steps, where the ball goes on each, its
 * height, its keyframes. See `bossCycle` for what the steps are.
 */

import { slowReachWhy } from './probeFields';

export const LOOP_HOLD_MS = 2500;
// How long each kind of step runs, and the hold after it; a set-up a second a leg.
export const RUNS = {
  topFast: 2000, topBack: 1000, topSlow: 2400, out: 1200, down: 1200, fast: 2000, back: 1000, slow: 2400, up: 1000, centre: 1600, zero: 2600,
};
export const HOLD_MS = 700;

// The part's radius and the ball's, and how far out past the part the ball goes down.
export const BOSS_R = 34;
export const TOOL_R = 8;
const OUT = BOSS_R + 26;
// Off the side after a touch, and where the ball starts, off the centre.
export const BACK = 14;
export const START = [9, -6];
// Heights: where the ball starts, touching the top, just over it, down beside a side.
const HIGH = 1;
export const ON_TOP = 0.4;
export const ABOVE = 0.5;

export const AXES = ['x', 'y'];
export const clamp = (v) => Math.max(0, Math.min(1, v));
export const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2);

export const setOn = (axis, at, v) => (axis === 'x' ? [v, at[1]] : [at[0], v]);

/** Where the ball's centre meets the part's side coming in along `axis` from the `sign` side, across `at`. */
const wallFrom = (at, axis, sign) => {
  const other = axis === 'x' ? at[1] : at[0];
  const reach = Math.sqrt((BOSS_R + TOOL_R) ** 2 - other * other);
  return setOn(axis, at, sign * reach);
};

/*
 * The steps, each with keyframes `[t, place, level, eased]` and how far into
 * its run it stops changing (`end`): the top touched as a plate's is — fast,
 * back, slow; for each side its set-up, the fast touch, back off it, the slow
 * one, up again; the way to the middle; the zero, still.
 */
export const build = () => {
  const S = START;
  const moves = {
    zFast: {
      kind: 'topFast', frames: [[0, S, HIGH], [0.1, S, HIGH], [0.85, S, ON_TOP, true], [1, S, ON_TOP]], end: 0.85, titleKey: 'probe.boss.move.topFast', uses: ['maxZ', 'fast'],
    },
    zBack: {
      kind: 'topBack', frames: [[0, S, ON_TOP], [0.15, S, ON_TOP], [0.7, S, ABOVE, true], [1, S, ABOVE]], end: 0.7, titleKey: 'probe.boss.move.topBack', uses: ['retract'],
    },
    zSlow: {
      kind: 'topSlow', frames: [[0, S, ABOVE], [0.1, S, ABOVE], [0.7, S, ON_TOP], [1, S, ON_TOP]], end: 0.7, titleKey: 'probe.boss.move.topSlow', uses: ['slow', 'retract'],
    },
    // Off the touch that counts, a move of its own (rule, Mateusz 2026-10-01).
    zOff: {
      kind: 'topBack', frames: [[0, S, ON_TOP], [0.15, S, ON_TOP], [0.7, S, ABOVE, true], [1, S, ABOVE]], end: 0.7, titleKey: 'probe.boss.move.topOff', uses: ['retract'],
    },
  };
  const order = ['zFast', 'zBack', 'zSlow', 'zOff'];
  let at = START;
  const guess = [...START];
  [1, 2].forEach((pass) => {
    AXES.forEach((axis, i) => {
      const walls = [];
      [1, -1].forEach((sign) => {
        const out = setOn(axis, at, guess[i] + sign * OUT);
        const wall = wallFrom(out, axis, sign);
        const off = setOn(axis, wall, wall[i] + sign * BACK);
        const side = `${axis}${pass}${sign > 0 ? 'p' : 'm'}`;
        const common = {
          axis, sign, pass, side, out, wall, off, guess: guess[i], way: `${axis.toUpperCase()}${sign > 0 ? '+' : '−'}`,
        };
        // The set-up, two moves — two lines of G-code, two segments on the bar (rule; review note, 2026-10-01):
        // out past the side over the top, and down beside it.
        moves[`${side}Out`] = {
          ...common, kind: 'out', from: at, frames: [[0, at, ABOVE], [0.1, at, ABOVE], [0.85, out, ABOVE, true], [1, out, ABOVE]], end: 0.85, titleKey: 'probe.boss.move.setOut', uses: ['bossSize', 'clear'],
        };
        moves[`${side}Down`] = {
          ...common, kind: 'down', from: out, frames: [[0, out, ABOVE], [0.1, out, ABOVE], [0.85, out, 0, true], [1, out, 0]], end: 0.85, titleKey: 'probe.boss.move.setDown', uses: ['depth', 'retract'],
        };
        moves[`${side}Fast`] = {
          ...common, kind: 'fast', from: out, frames: [[0, out, 0], [0.1, out, 0], [0.85, wall, 0, true], [1, wall, 0]], end: 0.85, titleKey: 'probe.boss.move.fast', uses: ['fast', 'clear', 'bossSize'],
        };
        moves[`${side}Back`] = {
          ...common, kind: 'back', from: wall, frames: [[0, wall, 0], [0.15, wall, 0], [0.7, off, 0, true], [1, off, 0]], end: 0.7, titleKey: 'probe.boss.move.back', uses: ['retract'],
        };
        moves[`${side}Slow`] = {
          ...common, kind: 'slow', from: off, frames: [[0, off, 0], [0.1, off, 0], [0.7, wall, 0], [1, wall, 0]], end: 0.7, titleKey: 'probe.boss.move.slow', uses: ['slow', 'retract'],
        };
        moves[`${side}Off`] = {
          ...common, kind: 'back', from: wall, frames: [[0, wall, 0], [0.15, wall, 0], [0.7, off, 0, true], [1, off, 0]], end: 0.7, titleKey: 'probe.boss.move.off', uses: ['retract'],
        };
        moves[`${side}Up`] = {
          ...common, kind: 'up', from: off, frames: [[0, off, 0], [0.1, off, 0], [0.8, off, ABOVE, true], [1, off, ABOVE]], end: 0.8, titleKey: 'probe.boss.move.up', uses: ['depth', 'retract'],
        };
        order.push(`${side}Out`, `${side}Down`, `${side}Fast`, `${side}Back`, `${side}Slow`, `${side}Off`, `${side}Up`);
        walls.push(wall);
        at = off;
      });
      const middle = setOn(axis, at, (walls[0][i] + walls[1][i]) / 2);
      guess[i] = middle[i];
      const name = `${axis}${pass}c`;
      moves[name] = {
        kind: 'centre', axis, pass, from: at, to: middle, way: axis.toUpperCase(),
        frames: [[0, at, ABOVE], [0.15, at, ABOVE], [0.8, middle, ABOVE, true], [1, middle, ABOVE]],
        titleKey: 'probe.hole.move.centre',
        uses: [],
        end: 0.8,
      };
      order.push(name);
      at = middle;
    });
  });
  moves.zero = {
    kind: 'zero', from: at, frames: [[0, at, ABOVE], [1, at, ABOVE]], zeroAt: [0.1, 0.35], titleKey: 'probe.hole.move.zero', uses: ['ballDiameter'], end: 0.35, after: true,
  };
  order.push('zero');
  return { moves, order };
};

/** The ball's centre and height at `p` through a step, from its keyframes. */
export const toolAt = (move, p) => {
  const { frames } = move;
  for (let i = 0; i < frames.length - 1; i++) {
    const [a, from, fromLevel] = frames[i];
    const [b, to, toLevel, eased] = frames[i + 1];
    if (p >= a && p <= b) {
      const u = (p - a) / Math.max(1e-6, b - a);
      const k = eased ? ease(u) : u;
      return { at: [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k], level: fromLevel + (toLevel - fromLevel) * k };
    }
  }
  const [, at, level] = frames[frames.length - 1];
  return { at, level };
};

/** Whether a step is on its way at `p`: from its second keyframe to its third; the zero never. */
export const isGoing = (move, p) => move.frames.length > 2 && p > move.frames[1][0] && p < move.frames[2][0];

// The form's figures, as the steps' lines and words say them.
export const numberOf = (text) => Number(String(text ?? '').replace(',', '.'));
export const fmt = (v) => String(Math.round(v * 1000) / 1000);
// How far a fast touch of a side searches: out past the side, and in to the middle thought.
export const reachOf = (texts) => fmt(numberOf(texts.bossSize) / 2 + numberOf(texts.clear));

// How far down beside a side and up again: the back-off over the top and the depth under it.
export const downOf = (texts) => fmt(numberOf(texts.retract) + numberOf(texts.depth));

/** Where a step's figure comes from, said under the drawing after its title — `[key, vars]`, or null. */
export const explainOf = (move, texts, say = (field, text) => text) => {
  if (move.kind === 'fast') {
    return ['probe.boss.reachWhy', { reach: say('clear', reachOf(texts)), clear: say('clear', texts.clear), size: say('bossSize', texts.bossSize) }];
  }
  if (move.kind === 'slow' || move.kind === 'topSlow') {
    return slowReachWhy(texts, say);
  }
  if (move.kind === 'down' || move.kind === 'up') {
    return ['probe.sum.retractDepth', { sum: say('depth', downOf(texts)), retract: say('retract', texts.retract), depth: say('depth', texts.depth) }];
  }
  return null;
};
