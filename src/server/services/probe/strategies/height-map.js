import { gridOf } from '../../height-map/grid';
import { move, touch, wait } from '../moves';

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
 *
 * Or the Z plate, moved by hand from point to point (Mateusz, 2026-10-03):
 * over each point the tool stands until the operator says the plate is under
 * it. Every touch is on the plate's top, so the heights from the first point
 * are the surface's; only where the surface itself is — the first point, the
 * start's height over it — comes down by the plate's thickness.
 */
export const TOOLS = ['board', 'probe', 'plate'];

/** How far over the surface a touch is: the plate's top, or the surface itself. */
const under = (params, options) => (options.tool === 'plate' ? params.plateThickness : 0);

/**
 * How far up over a touch before going on. With the Z plate it is the plate
 * method's own lift (Mateusz, 2026-10-03): up off the plate so it can be
 * moved from under the tool — the same thing, the same figure, room for a hand.
 */
const liftOf = (params, options) => (options.tool === 'plate' ? params.lift : params.mapLift);

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
  // The plate's thickness and lift count only with the plate (`under`, `liftOf`); the panel shows them only then.
  fields: ['maxZ', 'fast', 'retract', 'slow', 'mapLift', 'plateThickness', 'lift'],
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
      // The plate under the tool by hand, the tool standing over the point.
      ...(options.tool === 'plate' ? [wait(`${key}-place`)] : []),
      ...touch('z', -1, params.maxZ, key, params),
      // Up over the touch to go on — never down, a back-off higher than that — and after the last, to the start's height.
      move(`${key}-up`, (here, seen) => ({ z: n === points.length - 1 ? start.z : Math.max(seen[key].z + liftOf(params, options), here.z) })),
    ].map((step) => ({ ...step, mark: { n, i, j } })));
  },

  /**
   * The heights measured so far, while it runs, for every device to shade
   * the area by (Mateusz, 2026-10-03): `{ heights: [{ i, j, dz }], low, high }`,
   * each from the first point's; null until the first is measured.
   */
  partial: (params, options, seen) => {
    if (!seen.p0) {
      return null;
    }
    const { xs, ys } = gridOf(options);
    const heights = order(xs.length, ys.length).filter(({ key }) => seen[key]).map(({ i, j, key }) => ({ i, j, dz: seen[key].z - seen.p0.z }));
    const all = heights.map(({ dz }) => dz);
    return { heights, low: Math.min(...all), high: Math.max(...all) };
  },

  /** The surface, machine X and Y, each height from the first point's; `travel` the start's height over it. */
  map: (params, options, seen, { start, wco }) => {
    const { xs, ys } = gridOf(options);
    const dz = ys.map(() => xs.map(() => 0));
    // The first point's surface: under the plate's top, where the plate measured it.
    const first = seen.p0.z - under(params, options);
    for (const { i, j, key } of order(xs.length, ys.length)) {
      dz[j][i] = seen[key].z - seen.p0.z;
    }
    const heights = dz.flat();
    return {
      xs: xs.map((x) => x + wco.x),
      ys: ys.map((y) => y + wco.y),
      dz,
      travel: start.z - first,
      first: { ...seen.p0, z: first },
      // The lowest and the highest point, from the first: what the operator reads the board by.
      low: Math.min(...heights),
      high: Math.max(...heights),
    };
  },
};
