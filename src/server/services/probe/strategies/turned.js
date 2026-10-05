import { clearDown, move, touch } from '../moves';
import { EDGES } from './edge';

/**
 * Pomiar: a rectangle at an angle (Mateusz, 2026-10-03: *"prostokąt/kwadrat
 * pod kątem"*), from outside — a part — or inside — a pocket. Each of its
 * four sides is touched at two points `spacing` apart, as one edge is
 * (`edge`), every move along one axis: no move goes at a slant, so the
 * drawings and the fences stay the ones the other shapes have. From the
 * four lines come the sides' lengths square to them, the angle, the middle,
 * and how far the corners are off square.
 *
 * Touching a side along an axis while it lies at an angle is fine as long
 * as the angle is small next to 45°: the ball meets the side, not a corner,
 * while `spacing` is well inside the side's length.
 *
 * From outside the ball starts over the middle, above the top: the top is
 * touched first, then each side from `bossSize`/2 + `clear` out, down by
 * `depth`, moving in. From inside it starts in the middle of the pocket,
 * below its edge, and each search goes out no further than `holeSize`.
 */
export const SIDES = ['front', 'right', 'back', 'left'];

// A point's touch, by the side's axis, the point and the side the ball comes from — as an edge's.
export const keyOf = ({ axis, sign }, n) => `${axis}${n}${sign > 0 ? 'a' : 'b'}`;

const outside = (params) => {
  const out = params.bossSize / 2 + params.clear;
  const point = (side, n) => {
    const { axis, along, sign } = EDGES[side];
    const key = keyOf(EDGES[side], n);
    const shift = (n === 1 ? -1 : 1) * params.spacing / 2;
    return [
      move(`${key}-along`, (here, seen) => ({ [along]: seen.z[along] + shift })),
      move(`${key}-out`, (here, seen) => ({ [axis]: seen.z[axis] + sign * out })),
      clearDown(`${key}-down`, params.retract + params.depth, params.fast),
      // In no further than the middle: the side is between there and here.
      ...touch(axis, -sign, out, key, params),
      move(`${key}-up`, (here, seen) => ({ z: seen.z.z + params.retract })),
    ];
  };
  return [
    ...touch('z', -1, params.maxZ, 'z', params),
    ...SIDES.flatMap((side) => [...point(side, 1), ...point(side, 2)]),
  ];
};

// From inside, `start` is the middle: where the ball stood when the measurement began, machine coordinates.
const inside = (params, start) => {
  const point = (side, n) => {
    const { axis, along, sign } = EDGES[side];
    const key = keyOf(EDGES[side], n);
    const shift = (n === 1 ? -1 : 1) * params.spacing / 2;
    return [
      // Back to the middle across the side, then along it to the point: away from every wall first.
      move(`${key}-in`, () => ({ [axis]: start[axis] })),
      move(`${key}-along`, () => ({ [along]: start[along] + shift })),
      // From inside the ball goes out to the side, the way it faces: the front's wall is towards −Y.
      ...touch(axis, sign, params.holeSize, key, params),
    ];
  };
  // Back to the middle at the end, one axis at a time.
  return [
    ...SIDES.flatMap((side) => [...point(side, 1), ...point(side, 2)]),
    move('return-y', () => ({ y: start.y })),
    move('return-x', () => ({ x: start.x })),
  ];
};

/** The moves of a rectangle at an angle, from `side` (`outside` or `inside`); `start`, where the ball stands. */
export const turnedSteps = (side, params, start) => (side === 'outside' ? outside(params) : inside(params, start));

const DEG = 180 / Math.PI;

/*
 * A side as a line: a point on it and its direction, from its two touches,
 * the ball's radius taken off towards the material — into the part from
 * outside, out into the walls from inside — and its angle, anticlockwise from
 * the axis it runs along.
 */
const sideLine = (side, from, params, seen) => {
  const { axis, along, sign } = EDGES[side];
  const [a, b] = [1, 2].map((n) => seen[keyOf(EDGES[side], n)]);
  const d = [b.x - a.x, b.y - a.y];
  const length = Math.hypot(...d);
  const dir = [d[0] / length, d[1] / length];
  // Square to it, facing the way the ball came from along the side's axis.
  let normal = [-dir[1], dir[0]];
  const i = axis === 'x' ? 0 : 1;
  const faces = from === 'outside' ? sign : -sign;
  if (normal[i] * faces < 0) {
    normal = [-normal[0], -normal[1]];
  }
  const r = params.ballDiameter / 2;
  const point = [(a.x + b.x) / 2 - normal[0] * r, (a.y + b.y) / 2 - normal[1] * r];
  const tilt = Math.atan2(along === 'x' ? d[1] : -d[0], along === 'x' ? d[0] : d[1]);
  return { point, dir, tilt };
};

// Where the line through `p` along `u` meets the one through `q` along `v`.
const meet = (p, u, q, v) => {
  const cross = u[0] * v[1] - u[1] * v[0];
  const t = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / cross;
  return [p[0] + t * u[0], p[1] + t * u[1]];
};

// How far `p` is from the line through `q` along `v`.
const away = (p, q, v) => Math.abs((p[0] - q[0]) * v[1] - (p[1] - q[1]) * v[0]);

/**
 * The rectangle from its four sides: `{ kind, size: { x, y }, turn: { a,
 * square }, spread, each, centre }` — each side's length square to it (`x`
 * between the left and right sides, `y` between the front and back), the
 * angle in degrees anticlockwise (the four sides' mean), how far its corners
 * are off a right angle in degrees, and the middle, machine coordinates.
 */
export const turnedOf = (from, params, seen) => {
  const line = Object.fromEntries(SIDES.map((side) => [side, sideLine(side, from, params, seen)]));
  const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
  const across = mean([line.front.tilt, line.back.tilt]);
  const up = mean([line.left.tilt, line.right.tilt]);
  const x = mean([away(line.left.point, line.right.point, line.right.dir), away(line.right.point, line.left.point, line.left.dir)]);
  const y = mean([away(line.front.point, line.back.point, line.back.dir), away(line.back.point, line.front.point, line.front.dir)]);
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const centre = meet(mid(line.front.point, line.back.point), line.front.dir, mid(line.left.point, line.right.point), line.left.dir);
  return {
    kind: 'rect',
    size: { x, y },
    turn: { a: mean([across, up]) * DEG, square: (across - up) * DEG },
    spread: null,
    each: [{ x, y }],
    centre: { x: centre[0], y: centre[1] },
  };
};
