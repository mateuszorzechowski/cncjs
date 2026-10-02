import { isUnit, toMm } from '../units';

/**
 * Where a height map measures: a rectangle in work coordinates and how many
 * points along each side (Mateusz, 2026-10-02: the area from the program and
 * by hand; the step and the count both, either one setting the other).
 *
 * Asked as two corners, `{ x: [one, other], y: [one, other] }` in either
 * order — wherever the operator jogged them — or as a corner and a size,
 * `{ at: { x, y }, size: { x, y } }`, or a centre and a size, `{ centre,
 * size }`; and, per axis, a count (`nx`, `ny`) or
 * a step (`stepX`, `stepY`) — a step becomes the count that comes nearest to
 * it, and the step then the one that divides the side evenly, so the points
 * reach both edges.
 */

export const MIN_POINTS = 2;
export const MAX_POINTS = 30;

const countOf = (length, count, step) => {
  if (count !== undefined) {
    return Number(count);
  }
  if (!(Number(step) > 0)) {
    return NaN;
  }
  return Math.max(MIN_POINTS, Math.round(length / Number(step)) + 1);
};

const side = (range, count, step, units) => {
  if (!Array.isArray(range) || range.length !== 2) {
    return { error: 'bad-area' };
  }
  const [from, to] = range.map((v) => toMm(Number(v), units)).sort((a, b) => a - b);
  if (!Number.isFinite(from) || !Number.isFinite(to) || !(to > from)) {
    return { error: 'bad-area' };
  }
  const n = countOf(to - from, count, step === undefined ? undefined : toMm(Number(step), units));
  if (!Number.isInteger(n) || n < MIN_POINTS || n > MAX_POINTS) {
    return { error: 'bad-grid' };
  }
  const values = Array.from({ length: n }, (_, k) => (k === n - 1 ? to : from + (to - from) * k / (n - 1)));
  return { values, step: (to - from) / (n - 1) };
};

/**
 * The points the area was given by, in millimetres, for a drawing to mark:
 * the corner, the centre, or the two corners as they were given.
 */
const givenOf = (asked, units) => {
  const mm = (v) => toMm(Number(v), units);
  if (asked.at || asked.centre) {
    const one = asked.at || asked.centre;
    return [{ x: mm(one.x), y: mm(one.y) }];
  }
  return [0, 1].map((k) => ({ x: mm(asked.x[k]), y: mm(asked.y[k]) }));
};

/**
 * The grid asked for, in millimetres: `{ xs, ys, stepX, stepY, given }`,
 * work coordinates; or `{ error }`. `units` is what the figures were given in.
 */
export const gridOf = (asked = {}, units) => {
  if (units !== undefined && !isUnit(units)) {
    return { error: 'bad-units' };
  }
  // A corner and a size: its two corners, a size below zero the other way from the corner. A centre and a size: half each way.
  const range = (axis) => {
    if (asked.at && asked.size) {
      return [Number(asked.at[axis]), Number(asked.at[axis]) + Number(asked.size[axis])];
    }
    if (asked.centre && asked.size) {
      return [Number(asked.centre[axis]) - Number(asked.size[axis]) / 2, Number(asked.centre[axis]) + Number(asked.size[axis]) / 2];
    }
    return asked[axis];
  };
  const x = side(range('x'), asked.nx, asked.stepX, units);
  if (x.error) {
    return x;
  }
  const y = side(range('y'), asked.ny, asked.stepY, units);
  if (y.error) {
    return y;
  }
  return {
    xs: x.values, ys: y.values, stepX: x.step, stepY: y.step, given: givenOf(asked, units),
  };
};

export default gridOf;
