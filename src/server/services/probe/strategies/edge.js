import { clearDown, move, touch } from '../moves';

/**
 * Pomiar: an edge and its angle (Mateusz, 2026-10-03: *"krawędź i kąt"*,
 * the first of the shapes that do not lie along the axes). Grbl has no
 * rotated coordinates (no G68), so the angle is said, not applied: to square
 * the work in the vice, or to know how far off it lies.
 *
 * The 3D probe's ball starts over the part, a few millimetres inside the
 * edge and above the top, as for a part touched from outside. The top is
 * touched first; then twice, `spacing` apart along the edge — half of it
 * each way from the start — the ball goes along the edge to the point, out
 * past the edge by `clear` from the start,
 * down by `depth` under the top, touches the edge moving in, and rises
 * again. It ends there, over the second point: a way back over the start
 * would go along both axes at once, one move the drawing cannot show.
 *
 * `EDGES` say which side of the part, by the way the edge faces: `front`
 * faces −Y, and is touched moving +Y.
 */
export const EDGES = {
  front: { axis: 'y', along: 'x', sign: -1 },
  back: { axis: 'y', along: 'x', sign: 1 },
  left: { axis: 'x', along: 'y', sign: -1 },
  right: { axis: 'x', along: 'y', sign: 1 },
};

// The two touches, kept by name: the axis, the point (1 the first along the edge, 2 the second), the side.
const keyOf = ({ axis, sign }, n) => `${axis}${n}${sign > 0 ? 'a' : 'b'}`;

/** The moves: the top, then each point — out past the edge, down, the touch, up. */
export const edgeSteps = (edge, params) => {
  const { axis, along, sign } = EDGES[edge];
  const point = (n) => {
    const key = keyOf(EDGES[edge], n);
    const shift = (n === 1 ? -1 : 1) * params.spacing / 2;
    return [
      // Along the edge, then out past it: one axis a move, as every move of the probe's (rule, 2026-10-02).
      move(`${key}-along`, (here, seen) => ({ [along]: seen.z[along] + shift })),
      move(`${key}-out`, (here, seen) => ({ [axis]: seen.z[axis] + sign * params.clear })),
      clearDown(`${key}-down`, params.retract + params.depth, params.fast),
      // In no further than back to where the ball started: the edge is between there and here.
      ...touch(axis, -sign, params.clear, key, params),
      move(`${key}-up`, (here, seen) => ({ z: seen.z.z + params.retract })),
    ];
  };
  return [
    ...touch('z', -1, params.maxZ, 'z', params),
    ...point(1),
    ...point(2),
  ];
};

/**
 * The edge from its two touches: `{ kind, size: { a }, spread, each, centre }`
 * — `a` its angle in degrees, anticlockwise from the axis it runs along (X
 * for the front and back, Y for the sides); `centre` where it crosses the
 * line through the start, on its own axis, machine coordinates. The ball's
 * centres run parallel to the edge, its radius off it square to it.
 */
export const edgeOf = (edge, params, seen) => {
  const { axis, along, sign } = EDGES[edge];
  const [a, b] = [1, 2].map((n) => seen[keyOf(EDGES[edge], n)]);
  const runs = b[along] - a[along];
  const off = b[axis] - a[axis];
  const tilt = Math.atan2(off, runs);
  // Along Y anticlockwise is towards −X: the same tilt, the other sign.
  const angle = (axis === 'y' ? tilt : -tilt) * (180 / Math.PI);
  const middle = (a[axis] + b[axis]) / 2 - sign * (params.ballDiameter / 2) / Math.cos(tilt);
  return {
    kind: 'edge', size: { a: angle }, spread: null, each: [{ a: angle }], centre: { [axis]: middle },
  };
};
