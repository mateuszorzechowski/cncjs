import { gridOf } from '../../height-map/grid';
import { move, touch } from '../moves';

/**
 * A height map (Mateusz, 2026-10-02): the surface touched from above at every
 * point of a grid, for a program to be bent to it — not a zero.
 *
 * The tool starts over the first point at a height clear of everything on the
 * work — the clamps included. At each point it goes over it, touches down the
 * way every touch is made (fast, back, settle, slow, off), and rises
 * `mapLift` over the touch to go on to the next: nothing in the area may
 * stand higher than that (Mateusz, 2026-10-02). After the last point it goes
 * back up to the start's height. The grid is gone through row by row, every
 * other row backwards, so no move crosses the whole width empty.
 *
 * The area is in work coordinates, as a program's are; the map comes out in
 * the machine's X and Y, its heights from the first point. See
 * `height-map/compensate`.
 */

/**
 * What touches (Mateusz, 2026-10-02): the tool on a board wired as the
 * plate — a PCB's copper — or a 3D probe. The moves are the same either way;
 * the wire is tested differently, and the heights, from the first point, do
 * not depend on what touched.
 */
export const TOOLS = ['board', 'probe'];

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
  fields: ['maxZ', 'fast', 'retract', 'slow', 'mapLift'],
  options: { tool: TOOLS },
  touches: true,

  /** The grid asked for, in millimetres and by its counts; or why not. */
  read: (options, units) => {
    const grid = gridOf(options, units);
    if (grid.error) {
      return { error: grid.error };
    }
    const { xs, ys } = grid;
    const tool = options.tool ?? TOOLS[0];
    return {
      options: {
        x: [xs[0], xs[xs.length - 1]], y: [ys[0], ys[ys.length - 1]], nx: xs.length, ny: ys.length, tool,
      },
    };
  },

  check: (options) => gridOf(options).error || (TOOLS.includes(options.tool ?? TOOLS[0]) ? null : 'bad-tool'),

  steps: (params, options, { start, wco }) => {
    const { xs, ys } = gridOf(options);
    // Every step says which point it is at (`mark`), so each device draws the points done.
    const points = order(xs.length, ys.length);
    return points.flatMap(({ i, j, key }, n) => [
      move(`${key}-over`, () => ({ x: xs[i] + wco.x, y: ys[j] + wco.y })),
      ...touch('z', -1, params.maxZ, key, params),
      // Up over the touch to go on — never down, a back-off higher than that — and after the last, to the start's height.
      move(`${key}-up`, (here, seen) => ({ z: n === points.length - 1 ? start.z : Math.max(seen[key].z + params.mapLift, here.z) })),
    ].map((step) => ({ ...step, mark: { n, i, j } })));
  },

  /** The surface, machine X and Y, each height from the first point's; `travel` the start's height over it. */
  map: (params, options, seen, { start, wco }) => {
    const { xs, ys } = gridOf(options);
    const dz = ys.map(() => xs.map(() => 0));
    const first = seen.p0.z;
    for (const { i, j, key } of order(xs.length, ys.length)) {
      dz[j][i] = seen[key].z - first;
    }
    const heights = dz.flat();
    return {
      xs: xs.map((x) => x + wco.x),
      ys: ys.map((y) => y + wco.y),
      dz,
      travel: start.z - first,
      first: { ...seen.p0 },
      // The lowest and the highest point, from the first: what the operator reads the board by.
      low: Math.min(...heights),
      high: Math.max(...heights),
    };
  },
};
