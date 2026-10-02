/**
 * The hole's moves on its drawing — the geometry `holeCycle` plays and draws:
 * where the ball goes for each wall, step by step, its keyframes. See
 * `holeCycle` for what the steps are.
 */

export const LOOP_HOLD_MS = 2500;
// How long each kind of move runs, and the hold after it.
export const RUNS = {
  fast: 2000, back: 1000, slow: 2400, centre: 1600, zero: 2600,
};
export const HOLD_MS = 700;

// The hole's radius and the ball's, and the way the ball's centre has inside.
export const HOLE_R = 62;
export const TOOL_R = 10;
export const FREE = HOLE_R - TOOL_R;
// Off the wall after a touch, and where the ball starts, off the centre.
export const BACK = 16;
export const START = [14, 9];
// How far past the wall a search may go, on the drawing.
export const PAST = 10;

export const AXES = ['x', 'y'];
export const clamp = (v) => Math.max(0, Math.min(1, v));
export const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2);

/** Where the ball's centre meets the wall going `sign` along `axis` from `at`. */
const wallFrom = (at, axis, sign) => {
  const other = axis === 'x' ? at[1] : at[0];
  const reach = Math.sqrt(FREE * FREE - other * other);
  return axis === 'x' ? [sign * reach, at[1]] : [at[0], sign * reach];
};

export const along = (axis, at, by) => (axis === 'x' ? [at[0] + by, at[1]] : [at[0], at[1] + by]);

/*
 * The moves, each with the keyframes of the ball's centre and how far into
 * its run it stops changing (`end`): for each wall the fast touch, back off
 * it, the slow touch and back off again — as the server's `touch`; a move to
 * the middle of the two walls; the zero, still. Off the second wall the tool
 * goes straight on to the middle: the back-off and the way there, two rapids
 * the same way, are one move (rule, Mateusz 2026-10-02; the server's runner
 * joins them).
 */
export const build = () => {
  const moves = {};
  const order = [];
  let at = START;
  [1, 2].forEach((pass) => {
    AXES.forEach((axis) => {
      const walls = [];
      [1, -1].forEach((sign) => {
        const wall = wallFrom(at, axis, sign);
        const off = along(axis, wall, -sign * BACK);
        const side = `${axis}${pass}${sign > 0 ? 'p' : 'm'}`;
        const common = {
          axis, sign, pass, side, wall, off, way: `${axis.toUpperCase()}${sign > 0 ? '+' : '−'}`,
        };
        moves[`${side}Fast`] = {
          ...common, kind: 'fast', from: at, frames: [[0, at], [0.1, at], [0.85, wall, true], [1, wall]], end: 0.85, titleKey: 'probe.hole.move.fast', uses: ['holeSize', 'fast'],
        };
        moves[`${side}Back`] = {
          ...common, kind: 'back', from: wall, frames: [[0, wall], [0.15, wall], [0.7, off, true], [1, off]], end: 0.7, titleKey: 'probe.hole.move.back', uses: ['retract'],
        };
        moves[`${side}Slow`] = {
          ...common, kind: 'slow', from: off, frames: [[0, off], [0.1, off], [0.7, wall], [1, wall]], end: 0.7, titleKey: 'probe.hole.move.slow', uses: ['slow', 'retract'],
        };
        order.push(`${side}Fast`, `${side}Back`, `${side}Slow`);
        walls.push(wall);
        at = wall;
        // Off the touch that counts, a move of its own (rule, Mateusz 2026-10-01) — unless the way to the middle
        // goes on from it, off the second wall.
        if (sign > 0) {
          moves[`${side}Off`] = {
            ...common, kind: 'back', from: wall, frames: [[0, wall], [0.15, wall], [0.7, off, true], [1, off]], end: 0.7, titleKey: 'probe.hole.move.off', uses: ['retract'],
          };
          order.push(`${side}Off`);
          at = off;
        }
      });
      const middle = axis === 'x'
        ? [(walls[0][0] + walls[1][0]) / 2, at[1]]
        : [at[0], (walls[0][1] + walls[1][1]) / 2];
      const name = `${axis}${pass}c`;
      moves[name] = {
        kind: 'centre', axis, pass, from: at, to: middle, way: axis.toUpperCase(),
        frames: [[0, at], [0.15, at], [0.8, middle, true], [1, middle]],
        titleKey: 'probe.hole.move.centre',
        uses: [],
        end: 0.8,
      };
      order.push(name);
      at = middle;
    });
  });
  moves.zero = {
    kind: 'zero', from: at, frames: [[0, at], [1, at]], zeroAt: [0.1, 0.35], titleKey: 'probe.hole.move.zero', uses: ['ballDiameter'], end: 0.35, after: true,
  };
  order.push('zero');
  return { moves, order };
};

/** The ball's centre at `p` through a move, from its keyframes. */
export const toolAt = (move, p) => {
  const { frames } = move;
  for (let i = 0; i < frames.length - 1; i++) {
    const [a, from] = frames[i];
    const [b, to, eased] = frames[i + 1];
    if (p >= a && p <= b) {
      const u = (p - a) / Math.max(1e-6, b - a);
      const k = eased ? ease(u) : u;
      return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
    }
  }
  return frames[frames.length - 1][1];
};

/** Whether a move is on its way at `p`: from its second keyframe to its third — the zero, still, never. */
export const isGoing = (move, p) => move.frames.length > 2 && p > move.frames[1][0] && p < move.frames[2][0];
