import { clearDown, liftOver, move, touch } from '../moves';

/**
 * An L-shaped plate on a corner of the work: a top on the work and two walls
 * hanging over its edges (Mateusz, 2026-09-29: the simplest plate first).
 *
 * The tool starts over the top, near the corner. Z is touched there; then,
 * for each wall in turn, the tool goes `travel` sideways from where it is,
 * out past the wall when it started near enough, down by
 * `depth` below the top, and touches the wall's outer face moving in. The
 * edge of the work is that touch plus the tool's radius plus the wall.
 * After the last wall the tool rises straight to the lift and goes over the
 * corner it found, X0 Y0 — not back over the plate first (Mateusz,
 * 2026-09-30).
 *
 * Which corner is a direction on each axis: `x` is the way the tool moves to
 * touch the X wall, +1 when the corner is on the left.
 */
export const CORNERS = {
  'front-left': { x: 1, y: 1 },
  'front-right': { x: -1, y: 1 },
  'back-left': { x: 1, y: -1 },
  'back-right': { x: -1, y: -1 },
};

/** One wall: out past it over the top, down beside it, touch — and, `back`, up and back over the start. */
const wall = (axis, sign, params, back = true) => [
  move(`${axis}-out`, (here) => ({ [axis]: here[axis] - sign * params.travel })),
  clearDown(`${axis}-down`, params.retract + params.depth, params.fast),
  ...touch(axis, sign, params.maxXY, axis, params),
  ...(back ? [
    move(`${axis}-up`, (here, seen) => ({ z: seen.z.z + params.retract })),
    move(`${axis}-return`, (here, seen) => ({ x: seen.z.x, y: seen.z.y })),
  ] : []),
];

/** The work's corner: each wall's touch, a radius and the wall past it; the plate's top less its thickness. */
const cornerOf = (params, corner, seen) => {
  const { x, y } = CORNERS[corner];
  const radius = params.toolDiameter / 2;
  return {
    x: seen.x.x + x * (radius + params.wallX),
    y: seen.y.y + y * (radius + params.wallY),
    z: seen.z.z - params.cornerThickness,
  };
};

export default {
  fields: ['cornerThickness', 'wallX', 'wallY', 'toolDiameter', 'travel', 'depth', 'maxZ', 'maxXY', 'retract', 'fast', 'slow', 'lift'],
  options: { corner: Object.keys(CORNERS) },
  touches: true,

  check: ({ corner } = {}) => (CORNERS[corner] ? null : 'bad-corner'),

  steps: (params, { corner }) => [
    ...touch('z', -1, params.maxZ, 'z', params),
    ...wall('x', CORNERS[corner].x, params),
    ...wall('y', CORNERS[corner].y, params, false),
    liftOver('z', params.lift),
    move('corner', (here, seen) => {
      const { x, y } = cornerOf(params, corner, seen);
      return { x, y };
    }),
  ],

  zero: (params, { corner }, seen) => cornerOf(params, corner, seen),
};
