import { gridOf } from '../../height-map/grid';
import { move, touch } from '../moves';

/**
 * A height map (Mateusz, 2026-10-02): the surface touched from above at every
 * point of a grid, for a program to be bent to it — not a zero.
 *
 * The tool starts over the work at a height clear of everything on it — the
 * clamps included — and that is the height it goes between the points. At
 * each one it goes over it, touches down the way every touch is made (fast,
 * back, settle, slow, off), and rises again to the start's height. The grid
 * is gone through row by row, every other row backwards, so no move crosses
 * the whole width empty.
 *
 * The area is in work coordinates, as a program's are; the map comes out in
 * the machine's X and Y, its heights from the first point. See
 * `height-map/compensate`.
 */

/** The grid's points in the order they are touched: `{ i, j, key }`. */
const order = (nx, ny) => {
  const points = [];
  for (let j = 0; j < ny; j++) {
    for (let k = 0; k < nx; k++) {
      const i = j % 2 === 0 ? k : nx - 1 - k;
      points.push({ i, j, key: `p${points.length}` });
    }
  }
  return points;
};

export default {
  fields: ['maxZ', 'fast', 'retract', 'slow'],
  options: {},
  touches: true,

  /** The grid asked for, in millimetres and by its counts; or why not. */
  read: (options, units) => {
    const grid = gridOf(options, units);
    if (grid.error) {
      return { error: grid.error };
    }
    const { xs, ys } = grid;
    return { options: { x: [xs[0], xs[xs.length - 1]], y: [ys[0], ys[ys.length - 1]], nx: xs.length, ny: ys.length } };
  },

  check: (options) => gridOf(options).error || null,

  steps: (params, options, { start, wco }) => {
    const { xs, ys } = gridOf(options);
    return order(xs.length, ys.length).flatMap(({ i, j, key }) => [
      move(`${key}-over`, () => ({ x: xs[i] + wco.x, y: ys[j] + wco.y })),
      ...touch('z', -1, params.maxZ, key, params),
      move(`${key}-up`, () => ({ z: start.z })),
    ]);
  },

  /** The surface, machine X and Y, each height from the first point's; `travel` the start's height over it. */
  map: (params, options, seen, { start, wco }) => {
    const { xs, ys } = gridOf(options);
    const dz = ys.map(() => xs.map(() => 0));
    const first = seen.p0.z;
    for (const { i, j, key } of order(xs.length, ys.length)) {
      dz[j][i] = seen[key].z - first;
    }
    return {
      xs: xs.map((x) => x + wco.x),
      ys: ys.map((y) => y + wco.y),
      dz,
      travel: start.z - first,
      first: { ...seen.p0 },
    };
  },
};
