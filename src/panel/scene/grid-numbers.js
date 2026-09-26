import { STEPS, fineStep, snapDown, snapUp } from './grid-lines';

/**
 * The numbers written on the ground, and how densely.
 *
 * Split out of `grid-lines` when that file passed its line limit, and split
 * here because this is where the seam already was: everything in the other
 * file is geometry the renderer consumes, and everything here is a decision
 * about what to *say* — which round number to count in, where to put it, and
 * which one is worth keeping when two collide.
 *
 * Named `grid-numbers` and not `grid-labels`, because `GridLabels.jsx` sits
 * beside it and Windows would not tell the two apart. See `pointer-plane.js`
 * for the time that cost an afternoon.
 */

/**
 * How far apart the numbers have to be on screen before they stop colliding.
 *
 * Measured against the widest figure the grid produces — four digits, which
 * at the label size is about 45px — plus enough air that two of them read as
 * two readings rather than as one long number.
 *
 * 90 was too cautious: on a metre of travel it skipped straight from 200 to
 * 500 while there was comfortably room for 250, and a grid counted in
 * five-hundreds leaves the eye doing arithmetic.
 */
const LABEL_SPACING_PIXELS = 64;

/**
 * Which round number to count in, at this zoom.
 *
 * **The numbers thin out rather than shrink.** Holding a figure at a legible
 * size while the view pulls back writes them over each other; dropping every
 * other one keeps both the size and the spacing, and the squares between two
 * labels can still be counted off. So the ladder runs the other way as the
 * view closes in — 200, then 100, 50, 20, 10 — and every rung is a number a
 * machinist already thinks in, because they come from the same table the grid
 * itself is spaced from.
 *
 * Never finer than the lines there are to point at — which, once the view is
 * close enough for the sub-grid to be drawn, means the sub-grid rather than
 * the coarse one. A number against empty floor points at nothing.
 *
 * @param {number} step The grid's own square, in millimetres.
 * @param {number} zoom Pixels per millimetre — for an orthographic camera
 *   that is exactly what `camera.zoom` is.
 */
export const labelStep = (step, zoom, factor = 1) => {
  if (!(zoom > 0)) {
    return step;
  }
  const floor = fineStep(step, factor) || step;
  // Round numbers in the server's units, compared and handed back in the
  // world's millimetres — see `gridStep`. A hair of slack, because a step
  // worked back from inches is a float that equals itself only mostly.
  const wide = STEPS.find(
    (candidate) => candidate / factor >= floor - 1e-9 && (candidate / factor) * zoom >= LABEL_SPACING_PIXELS
  );
  return wide ? wide / factor : Math.max(floor, STEPS[STEPS.length - 1] / factor);
};

/**
 * A backstop on how many numbers may be built, whatever the zoom asks for.
 *
 * `labelStep` already spaces them, so this only bites when the view is closed
 * right in on a large machine and the spacing would call for a figure every
 * ten millimetres across a metre of travel. Each label is a painted canvas
 * and a texture; a hundred of them per axis is memory spent on numbers that
 * are mostly off screen.
 */
const MAX_LABELS = 40;

/**
 * **Where the rulers run: along the edges nearest the camera** — the
 * design's variant 03a (2026-09-26), on every scene: Ścieżka, the jog
 * preview and the file preview alike (*"na podglądzie pliku też tak zrób"*).
 * Nearest the camera they are in front of everything drawn, and they move to
 * the opposite edge when the view is turned round, so they are always the
 * side being looked across. The rule before it ran them along zero, which on
 * a machine is the back edge and on a program is often through the part.
 *
 * `toward` points from the scene to the camera (a view's `direction`). Level
 * with an edge — straight down, or from the side — the front and the right
 * edge win, the default view's two.
 */
export const nearSides = (area, toward) => {
  const back = toward.y > 0;
  const left = toward.x < 0;
  return {
    axisY: back ? area.max.y : area.min.y,
    outY: back ? 1 : -1,
    axisX: left ? area.min.x : area.max.x,
    outX: left ? -1 : 1,
  };
};

/**
 * A figure as printed: to a tenth at most. The far end of a program's reach
 * is its exact extent — `-58.1149` — and printed in full it was the widest
 * thing on the ruler and ran into the axis (Mateusz, 2026-09-25). The exact
 * size is in the caption beside the drawing.
 */
// The world is millimetres; a figure is in the server's units.
const figure = (value, factor) => String(Math.round(value * factor * 10) / 10);

/**
 * The numbers to write on the ground, and where.
 *
 * Only inside the area — out in the fade the grid is a hint that the floor
 * continues, and a number there would be a measurement of nothing.
 *
 * **Placed on the line itself, with an offset the caller applies in pixels.**
 * How far off cannot be decided here: it has to be a fixed distance on
 * screen, or the figures drift as the spacing coarsens — which is what
 * happened when the offsets were fractions of a label step. Both drifted:
 * the numbers away from their axis, and `mm` along it, further out with every
 * coarsening.
 *
 * `toward` points from the scene to the camera — see `nearSides`.
 *
 * @returns {object[]} `{ key, text, x, y, push }` in machine coordinates,
 *   where `push` is in multiples of the caller's gap, out of the machine,
 *   and the two axis titles, which carry the unit.
 */
export const gridLabels = (area, step, units = { factor: 1, length: 'mm' }, toward = { x: 1, y: -1 }) => {
  const { factor } = units;
  const first = (min) => snapUp(min, step);
  const last = (max) => snapDown(max, step);

  /*
   * **Both ends of a ruler are always named.**
   *
   * Counting in round numbers from zero leaves the end of the axis unlabelled
   * whenever the range is not a multiple of the step: 700mm counted in
   * five-hundreds stops at -500, and the one figure an operator most wants —
   * how far the machine actually goes — is the one missing. So the ends are
   * added whatever the step is.
   *
   * Both, not only the far one. On a machine the near end is zero and was
   * always there; a program with its zero in the middle ends at -25 as well
   * as 25, and its ruler read -20 at that end (Mateusz, 2026-09-25).
   *
   * A neighbour is dropped only if it would collide with an end: closer than
   * about a third of a square is two figures sharing a space, and the end is
   * the one worth keeping.
   */
  const CROWDED = 0.4;

  const ticks = (min, max) => {
    const values = [];
    for (let v = first(min); v <= last(max); v += step) {
      values.push(v);
    }

    const every = Math.ceil(values.length / MAX_LABELS);
    const span = step * every * CROWDED;
    let kept = values.filter((_, i) => (i % every) === 0);

    for (const end of [min, max]) {
      if (!kept.includes(end)) {
        kept = [...kept.filter((v) => Math.abs(v - end) >= span), end].sort((a, b) => a - b);
      }
    }

    return kept;
  };

  const sides = nearSides(area, toward);
  const { axisY, axisX, outY, outX } = sides;
  const labels = [];

  // Where the two rulers meet each prints its own figure: two different
  // numbers at a corner, pushed apart, one down and one out.
  for (const x of ticks(area.min.x, area.max.x)) {
    labels.push({ key: `x${x}`, text: figure(x, factor), x, y: axisY, push: { x: 0, y: outY } });
  }
  for (const y of ticks(area.min.y, area.max.y)) {
    labels.push({ key: `y${y}`, text: figure(y, factor), x: axisX, y, push: { x: outX, y: 0 } });
  }

  return [...labels, ...axisTitles(area, sides, units.length)];
};

/**
 * **The unit once per axis, in a title — `X [mm]`, `Y [mm]`** (design 03a).
 *
 * Along its axis, at the middle, just outside the row of figures: Mateusz,
 * 2026-09-26, *"etykiety na osi miały być wzdłuż osi"*, with a drawing of
 * `X [mm]` centred under `0 50 100 … 300`. The first night's version put it
 * past the end of the ruler, and was wrong. `along` is the direction its text
 * runs; `beyond` names the row of figures it stands outside, whose depth the
 * renderer knows (`GridLabels`) — a figure's height under the X row, the
 * widest figure's width beside the Y column.
 */
export const axisTitles = (area, { axisY, outY, axisX, outX }, length) => [
  {
    key: 'title-x', text: `X [${length}]`, title: true, along: 'x', beyond: 'x',
    x: (area.min.x + area.max.x) / 2, y: axisY, push: { x: 0, y: outY },
  },
  {
    key: 'title-y', text: `Y [${length}]`, title: true, along: 'y', beyond: 'y',
    x: axisX, y: (area.min.y + area.max.y) / 2, push: { x: outX, y: 0 },
  },
];
