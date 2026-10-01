/**
 * The part touched from outside, as moves on its drawing — the geometry
 * `bossCycle` plays and draws: where the ball goes on each side, its height,
 * its keyframes. See `bossCycle` for what the moves are.
 */

export const SPAN_MS = 3400;
export const RUN_MS = 2600;
export const LOOP_HOLD_MS = 2500;
// A side's move has four legs — out, down, the touch, up — so it runs longer.
export const SIDE_RUN_MS = 4200;

// The part's radius and the ball's, and how far out past the part the ball goes down.
export const BOSS_R = 34;
export const TOOL_R = 8;
const OUT = BOSS_R + 26;
// Off the side after a touch, and where the ball starts, off the centre.
export const BACK = 6;
// When in a side's touch, and in the top's, the fast one and the slow one run — the slow longer, as on the machine.
export const SIDE_FAST_END = 0.55;
export const SIDE_SLOW = [0.66, 0.86];
export const TOP_FAST = [0.15, 0.4];
export const TOP_SLOW = [0.55, 0.86];
export const START = [9, -6];
// Heights: where the ball starts, touching the top, just over it, down beside a side.
const HIGH = 1;
export const ON_TOP = 0.4;
export const ABOVE = 0.5;

export const AXES = ['x', 'y'];
export const clamp = (v) => Math.max(0, Math.min(1, v));
export const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2);

const along = (axis, at, by) => (axis === 'x' ? [at[0] + by, at[1]] : [at[0], at[1] + by]);
export const setOn = (axis, at, v) => (axis === 'x' ? [v, at[1]] : [at[0], v]);

/** Where the ball's centre meets the part's side coming in along `axis` from the `sign` side, across `at`. */
const wallFrom = (at, axis, sign) => {
  const other = axis === 'x' ? at[1] : at[0];
  const reach = Math.sqrt((BOSS_R + TOOL_R) ** 2 - other * other);
  return setOn(axis, at, sign * reach);
};

// The legs of a side's move, as fractions of its run, each with what it uses and its words.
export const LEGS = [
  { name: 'out', from: 0.06, to: 0.3, uses: ['bossSize', 'clear'] },
  { name: 'down', from: 0.3, to: 0.42, uses: ['depth', 'retract'] },
  { name: 'touch', from: 0.42, to: 0.9, uses: ['fast', 'slow', 'retract'] },
  { name: 'up', from: 0.9, to: 1, uses: [] },
];

/*
 * The moves, each with keyframes `[t, place, level, eased]`: the top touched
 * as a plate's is; a side's four legs; the way to the middle; the zero, still.
 */
export const build = () => {
  const moves = {
    z: {
      kind: 'top',
      frames: [[0, START, HIGH], [TOP_FAST[0], START, HIGH], [TOP_FAST[1], START, ON_TOP, true], [0.45, START, ON_TOP], [0.5, START, ABOVE], [TOP_SLOW[0], START, ABOVE], [TOP_SLOW[1], START, ON_TOP], [1, START, ABOVE]],
      titleKey: 'probe.boss.move.top',
      uses: ['maxZ', 'fast', 'slow', 'retract'],
      end: 1,
    },
  };
  const order = ['z'];
  let at = START;
  const guess = [...START];
  [1, 2].forEach((pass) => {
    AXES.forEach((axis, i) => {
      const touches = [];
      [1, -1].forEach((sign) => {
        const out = setOn(axis, at, guess[i] + sign * OUT);
        const wall = wallFrom(out, axis, sign);
        const off = along(axis, wall, sign * BACK);
        const name = `${axis}${pass}${sign > 0 ? 'p' : 'm'}`;
        moves[name] = {
          kind: 'side', axis, sign, pass, from: at, out, wall, guess: guess[i], way: `${axis.toUpperCase()}${sign > 0 ? '+' : '−'}`,
          frames: [
            [0, at, ABOVE], [0.06, at, ABOVE], [0.3, out, ABOVE, true], [0.42, out, 0, true], [SIDE_FAST_END, wall, 0, true], [0.58, wall, 0],
            [0.62, off, 0], [SIDE_SLOW[0], off, 0], [SIDE_SLOW[1], wall, 0], [0.9, off, 0], [1, off, ABOVE, true],
          ],
          titleKey: 'probe.boss.move.side',
          uses: LEGS.flatMap((leg) => leg.uses),
          end: 1,
        };
        order.push(name);
        touches.push(wall);
        at = off;
      });
      const middle = setOn(axis, at, (touches[0][i] + touches[1][i]) / 2);
      guess[i] = middle[i];
      const name = `${axis}${pass}c`;
      moves[name] = {
        kind: 'centre', axis, pass, from: at, to: middle, touches, way: axis.toUpperCase(),
        frames: [[0, at, ABOVE], [0.15, at, ABOVE], [0.6, middle, ABOVE, true], [1, middle, ABOVE]],
        titleKey: 'probe.hole.move.centre',
        uses: [],
        end: 0.6,
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

/** The ball's centre and height at `p` through a move, from its keyframes. */
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

/** The leg of a side's move under way at `p`. */
export const legAt = (p) => LEGS.find((leg) => p < leg.to) || LEGS[LEGS.length - 1];
