import {
  ABOVE, AXES, BACK, BOSS_R, OUT, TOOL_R, setOn, topOf,
} from './bossMoves';

/*
 * An edge and its angle (Pomiar, the server's `strategies/edge`): the part's
 * one side, touched at two points along it. The ball starts over the part
 * near that side (`EDGE_START`); the top as for the part; then for each
 * point, along the side to it over the top, out past the side, down beside
 * it, the touch moving in, up again. Each point is its own pass, so the bar
 * and the server's step names (`y1b`, `y2b`) say which.
 */
export const EDGE_SIDES = {
  front: { axis: 'y', along: 'x', sign: -1 },
  back: { axis: 'y', along: 'x', sign: 1 },
  left: { axis: 'x', along: 'y', sign: -1 },
  right: { axis: 'x', along: 'y', sign: 1 },
};
// Half the way between the points along the side, and how far in from the side the ball starts.
const SPAN = 18;
const INSIDE = 12;
// How far the part is drawn turned for the Setup: an edge's angle is the thing measured, so it is never drawn square.
export const EDGE_TILT = 8;

/**
 * Where the side of the part, turned `tilt` degrees anticlockwise about its
 * middle, is along `edge`'s axis at `u` along it — the square's side, turned.
 */
export const rimOf = (edge, tilt) => {
  const { axis, sign } = EDGE_SIDES[edge];
  const a = (tilt * Math.PI) / 180;
  // Turning anticlockwise tips a side along X up to the right, one along Y to the left.
  const slope = (axis === 'y' ? 1 : -1) * Math.tan(a);
  return (u) => (sign * BOSS_R) / Math.cos(a) + slope * u;
};

/** Where the ball starts for `edge`: over the part, `INSIDE` from that side. */
export const edgeStart = (edge) => {
  const { axis, sign } = EDGE_SIDES[edge];
  return setOn(axis, [0, 0], sign * (BOSS_R - INSIDE));
};

export const buildEdge = ({ edge, tilt = EDGE_TILT }) => {
  const { axis, along, sign } = EDGE_SIDES[edge];
  const i = AXES.indexOf(axis);
  const j = AXES.indexOf(along);
  const rimAt = rimOf(edge, tilt);
  // The ball's centre touching the turned side is its radius off it, square to it.
  const reach = TOOL_R / Math.cos((tilt * Math.PI) / 180);
  const S = edgeStart(edge);
  const { moves, order } = topOf(S);
  let at = S;
  [1, 2].forEach((point) => {
    const spot = setOn(along, at, (point === 1 ? -1 : 1) * SPAN);
    const out = setOn(axis, spot, sign * OUT);
    const rim = rimAt(spot[j]);
    const wall = setOn(axis, out, rim + sign * reach);
    const off = setOn(axis, wall, wall[i] + sign * BACK);
    const side = `${axis}${point}${sign > 0 ? 'p' : 'm'}`;
    // Pass 1 for both: two points of one side, not two passes — so none is left out of the bar (`order(1)`).
    const common = {
      axis, sign, pass: 1, point, side, out, wall, off, guess: S[i], rim, way: `${axis.toUpperCase()}${sign > 0 ? '+' : '−'}`,
    };
    moves[`${side}Along`] = {
      ...common, axis: along, kind: 'centre', from: at, to: spot, frames: [[0, at, ABOVE], [0.1, at, ABOVE], [0.85, spot, ABOVE, true], [1, spot, ABOVE]], end: 0.85, titleKey: 'probe.edge.move.along', uses: ['spacing'],
    };
    moves[`${side}Out`] = {
      ...common, kind: 'out', from: spot, frames: [[0, spot, ABOVE], [0.1, spot, ABOVE], [0.85, out, ABOVE, true], [1, out, ABOVE]], end: 0.85, titleKey: 'probe.edge.move.setOut', uses: ['clear'],
    };
    moves[`${side}Down`] = {
      ...common, kind: 'down', from: out, frames: [[0, out, ABOVE], [0.1, out, ABOVE], [0.85, out, 0, true], [1, out, 0]], end: 0.85, titleKey: 'probe.edge.move.setDown', uses: ['depth', 'retract'],
    };
    moves[`${side}Fast`] = {
      ...common, kind: 'fast', from: out, frames: [[0, out, 0], [0.1, out, 0], [0.85, wall, 0, true], [1, wall, 0]], end: 0.85, titleKey: 'probe.edge.move.fast', uses: ['fast', 'clear'],
    };
    moves[`${side}Back`] = {
      ...common, kind: 'back', from: wall, frames: [[0, wall, 0], [0.15, wall, 0], [0.7, off, 0, true], [1, off, 0]], end: 0.7, titleKey: 'probe.edge.move.back', uses: ['retract'],
    };
    moves[`${side}Slow`] = {
      ...common, kind: 'slow', from: off, frames: [[0, off, 0], [0.1, off, 0], [0.7, wall, 0], [1, wall, 0]], end: 0.7, titleKey: 'probe.edge.move.slow', uses: ['slow', 'retract'],
    };
    moves[`${side}Off`] = {
      ...common, kind: 'back', from: wall, frames: [[0, wall, 0], [0.15, wall, 0], [0.7, off, 0, true], [1, off, 0]], end: 0.7, titleKey: 'probe.edge.move.off', uses: ['retract'],
    };
    moves[`${side}Up`] = {
      ...common, kind: 'up', from: off, frames: [[0, off, 0], [0.1, off, 0], [0.8, off, ABOVE, true], [1, off, ABOVE]], end: 0.8, titleKey: 'probe.edge.move.up', uses: ['depth', 'retract'],
    };
    order.push(...EDGE_STEPS.map((step) => `${side}${step}`));
    at = off;
  });
  moves.zero = {
    kind: 'zero', from: at, frames: [[0, at, ABOVE], [1, at, ABOVE]], titleKey: 'probe.size.move.edge', uses: ['ballDiameter'], end: 0.35,
  };
  order.push('zero');
  return { moves, order };
};

// A point's steps, in order.
const EDGE_STEPS = ['Along', 'Out', 'Down', 'Fast', 'Back', 'Slow', 'Off', 'Up'];

/** An edge's two points, by the sides their touches are named by: `y1m`, `y2m` for the front. */
export const edgePoints = (edge) => {
  const { axis, sign } = EDGE_SIDES[edge];
  return [1, 2].map((point) => `${axis}${point}${sign > 0 ? 'p' : 'm'}`);
};

/** An edge's bar after the top: each point — one side, so a search and a measuring (map §8) — then the angle. */
export const edgeGroups = (edge) => {
  const { axis, sign } = EDGE_SIDES[edge];
  return edgePoints(edge).map((side, k) => {
    const point = k + 1;
    return {
      id: side,
      name: `${axis.toUpperCase()}${sign > 0 ? '+' : '−'} · ${point}`,
      subs: [
        { key: 'probe.stage.search', moves: EDGE_STEPS.slice(0, 4).map((step) => `${side}${step}`) },
        { key: 'probe.bar.measure', moves: EDGE_STEPS.slice(4).map((step) => `${side}${step}`) },
      ],
    };
  }).concat([{
    id: 'zero', key: 'probe.bar.angle', folded: true, subs: [{ key: 'probe.stage.angle', moves: ['zero'] }],
  }]);
};

// An edge's figures: where the points are and how it gets there, how it touches — two points once, no passes.
export const EDGE_PARAMS = [
  { id: 'reach', key: 'probe.group.reach', fields: ['spacing', 'clear', 'depth', 'maxZ'] },
  { id: 'measure', key: 'probe.group.measure', fields: ['fast', 'slow', 'retract'] },
  { id: 'probe', key: 'probe.group.probe', fields: ['ballDiameter'] },
];
