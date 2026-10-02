import { isUnit, toMm } from '../units';

/**
 * Where a height map measures: a rectangle in work coordinates and how many
 * points along each side (Mateusz, 2026-10-02: the area from the program and
 * by hand; the step and the count both, either one setting the other).
 *
 * Asked as `{ x: [from, to], y: [from, to] }` and, per axis, a count
 * (`nx`, `ny`) or a step (`stepX`, `stepY`) — a step becomes the count that
 * comes nearest to it, and the step then the one that divides the side
 * evenly, so the points reach both edges.
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
  const [from, to] = range.map((v) => toMm(Number(v), units));
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
 * The grid asked for, in millimetres: `{ xs, ys, stepX, stepY }`, work
 * coordinates; or `{ error }`. `units` is what the figures were given in.
 */
export const gridOf = (asked = {}, units) => {
  if (units !== undefined && !isUnit(units)) {
    return { error: 'bad-units' };
  }
  const x = side(asked.x, asked.nx, asked.stepX, units);
  if (x.error) {
    return x;
  }
  const y = side(asked.y, asked.ny, asked.stepY, units);
  if (y.error) {
    return y;
  }
  return { xs: x.values, ys: y.values, stepX: x.step, stepY: y.step };
};

export default gridOf;
