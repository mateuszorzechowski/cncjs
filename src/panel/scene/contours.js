/*
 * A height map's contours (Mateusz, 2026-10-03): lines on the sheet every so
 * many millimetres, as on a map of the land. See `MapArea`.
 */

// Steps the contours may be drawn at, millimetres: the finest giving no more than so many lines.
const CONTOUR_STEPS = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];
const CONTOUR_LINES = 10;

/** How far apart the contours go over a range `low` … `high`: a round figure, ten lines at most. */
export const contourStep = (low, high) => CONTOUR_STEPS.find((step) => (high - low) / step <= CONTOUR_LINES) ?? CONTOUR_STEPS[CONTOUR_STEPS.length - 1];

/*
 * The contours of `height(u, v)` every `step` — marching squares over a grid
 * `cols` × `rows` across `0 … nx-1`, `0 … ny-1`: segments `[[u, v], [u, v]]`.
 */
export const contourSegments = (height, nx, ny, step, fine) => {
  const cols = (nx - 1) * fine + 1;
  const rows = (ny - 1) * fine + 1;
  const at = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (__, c) => height(c / fine, r / fine)));
  const flat = at.flat();
  const low = Math.min(...flat);
  const high = Math.max(...flat);
  const segments = [];
  for (let level = Math.ceil(low / step) * step; level <= high; level += step) {
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        // The cell's corners in turn, and where the level crosses each of its sides.
        const corners = [[c, r], [c + 1, r], [c + 1, r + 1], [c, r + 1]].map(([cc, rr]) => ({ u: cc / fine, v: rr / fine, h: at[rr][cc] - level }));
        const crossings = [];
        for (let k = 0; k < 4; k++) {
          const a = corners[k];
          const b = corners[(k + 1) % 4];
          if ((a.h < 0) !== (b.h < 0)) {
            const tt = a.h / (a.h - b.h);
            crossings.push([a.u + (b.u - a.u) * tt, a.v + (b.v - a.v) * tt]);
          }
        }
        for (let k = 0; k + 1 < crossings.length; k += 2) {
          segments.push([crossings[k], crossings[k + 1]]);
        }
      }
    }
  }
  return segments;
};
