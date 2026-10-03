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
 * The contours of `height(u, v)` every `step`, on the sheet as it is drawn:
 * sampled at `fine` steps per cell across `0 … nx-1`, `0 … ny-1`, and each
 * square of samples cut into the sheet's own two triangles — so a contour
 * lies on the flat faces the eye sees, not on the true surface between them
 * (Mateusz, 2026-10-03: the contours cut through the sheet). Segments
 * `[[u, v, h], [u, v, h]]`, `h` the height there on the face.
 */
export const contourSegments = (height, nx, ny, step, fine) => {
  const cols = (nx - 1) * fine + 1;
  const rows = (ny - 1) * fine + 1;
  const at = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (__, c) => height(c / fine, r / fine)));
  const flat = at.flat();
  const low = Math.min(...flat);
  const high = Math.max(...flat);
  const vertex = (c, r) => ({ u: c / fine, v: r / fine, h: at[r][c] });
  const segments = [];
  for (let level = Math.ceil(low / step) * step; level <= high; level += step) {
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        // The sheet's two triangles of this square, as `MapArea` indexes them.
        const triangles = [
          [vertex(c, r), vertex(c + 1, r), vertex(c, r + 1)],
          [vertex(c + 1, r), vertex(c + 1, r + 1), vertex(c, r + 1)],
        ];
        for (const corners of triangles) {
          const crossings = [];
          for (let k = 0; k < 3; k++) {
            const a = corners[k];
            const b = corners[(k + 1) % 3];
            if ((a.h < level) !== (b.h < level)) {
              const tt = (level - a.h) / (b.h - a.h);
              crossings.push([a.u + (b.u - a.u) * tt, a.v + (b.v - a.v) * tt, level]);
            }
          }
          // A level that only touches a corner — the top, the bottom — is a point, not a line.
          if (crossings.length === 2 && Math.hypot(crossings[0][0] - crossings[1][0], crossings[0][1] - crossings[1][1]) > 1e-9) {
            segments.push(crossings);
          }
        }
      }
    }
  }
  return segments;
};
