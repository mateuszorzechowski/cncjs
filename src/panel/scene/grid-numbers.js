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

/*
 * **Where the rulers run: along zero, unless zero is inside the drawing.**
 *
 * On a machine, zero is a corner of the travel, so the zero lines are edges
 * of the area and the figures sit outside everything drawn. A program's
 * zero is usually in the middle of the part, and there the zero lines
 * cross it and the figures ended up under it (Mateusz, 2026-09-25, on the
 * Pliki preview). So a ruler whose zero line would cross the area runs
 * along an edge instead — the front one for X and the right one for Y,
 * the two the default isometric view looks at, so the part stands behind
 * its figures rather than on them.
 */
export const rulerSides = (area) => {
  const crosses = (min, max) => min < 0 && max > 0;
  const rowOnEdge = crosses(area.min.y, area.max.y);
  const columnOnEdge = crosses(area.min.x, area.max.x);
  const axisY = rowOnEdge ? area.min.y : Math.min(Math.max(0, area.min.y), area.max.y);
  const axisX = columnOnEdge ? area.max.x : Math.min(Math.max(0, area.min.x), area.max.x);

  return {
    rowOnEdge,
    columnOnEdge,
    // Where the X figures run, and which way is away from the work.
    axisY,
    outY: axisY > (area.min.y + area.max.y) / 2 ? 1 : -1,
    // Where the Y figures run, and which way is away from the work.
    axisX,
    outX: axisX > (area.min.x + area.max.x) / 2 ? 1 : -1,
  };
};

/**
 * **Or along the edges nearest the camera** — the Ścieżka screen's rulers,
 * the design's variant 03a (2026-09-26). The machine's travel is the area
 * there, its zero a corner, and the zero rule put the X figures along the
 * back edge in the default view, behind everything drawn. Nearest the camera
 * they are in front of it, and they move to the opposite edge when the view
 * is turned round, so they are always the side being looked across.
 *
 * `toward` points from the scene to the camera (a view's `direction`). Level
 * with an edge — straight down, or from the side — the front and the right
 * edge win, the default view's two.
 */
export const nearSides = (area, toward) => {
  const back = toward.y > 0;
  const left = toward.x < 0;
  return {
    rowOnEdge: true,
    columnOnEdge: true,
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
 * **Laid along the machine's own zero lines**, not along the edge of the
 * travel. Those two lines are already drawn heavier than the rest of the grid
 * — they are where the machine measures everything from — so the figures
 * belong against them, and both rows then share one origin instead of
 * starting from opposite corners of the drawing.
 *
 * A machine whose travel does not contain zero gets the nearest edge instead,
 * which is the same line as far as the reading goes.
 *
 * **Placed on the line itself, with an offset the caller applies in pixels.**
 * How far off cannot be decided here: it has to be a fixed distance on
 * screen, or the figures drift as the spacing coarsens — which is what
 * happened when the offsets were fractions of a label step. Both drifted:
 * the numbers away from their axis, and `mm` along it, further out with every
 * coarsening.
 *
 * @returns {object[]} `{ key, text, x, y, push }` in machine coordinates,
 *   where `push` is in multiples of the caller's gap, out of the machine.
 *   The unit is part of the far X figure.
 */
export const gridLabels = (area, step, units = { factor: 1, length: 'mm' }, { sides = rulerSides(area), titles = false } = {}) => {
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

  // Which end of the X ruler is the far one — the reach, rather than the
  // datum — where the unit goes.
  const farX = Math.abs(area.min.x) > Math.abs(area.max.x) ? area.min.x : area.max.x;

  const labels = [];

  const { rowOnEdge, columnOnEdge, axisY, axisX, outY, outX } = sides;

  /*
   * **The origin is written once, for both rulers.**
   *
   * Each row would otherwise print its own zero, and on a machine that homes
   * to the maximum both land on the same corner — two figures reading `0` a
   * few pixels apart, which looks like a rendering fault rather than like two
   * axes meeting. The shared one is pushed out along the diagonal, away from
   * both rows at once.
   */
  // Only where the rulers meet at zero: moved to the edges they meet at a
  // corner whose two figures are different numbers.
  const meet = !rowOnEdge && !columnOnEdge;
  const shared = (value, axis) => meet && value === axis;

  for (const x of ticks(area.min.x, area.max.x)) {
    if (!shared(x, axisX)) {
      labels.push({ key: `x${x}`, text: figure(x, factor), x, y: axisY, push: { x: 0, y: outY } });
    }
  }
  for (const y of ticks(area.min.y, area.max.y)) {
    if (!shared(y, axisY)) {
      labels.push({ key: `y${y}`, text: figure(y, factor), x: axisX, y, push: { x: outX, y: 0 } });
    }
  }

  if (meet) {
    labels.push({
      key: 'origin',
      text: figure(axisX, factor),
      x: axisX,
      y: axisY,
      push: { x: outX * 0.85, y: outY * 0.85 },
    });
  }

  /*
   * **The unit, once, at the far end of the X ruler: `99.7 mm`.**
   *
   * It stood beside the zero where the two rulers meet, and where that is
   * depends on the program — a corner, an edge, the middle of the part — so
   * it turned up in a different place every time (Mateusz, 2026-09-25). The
   * end of the X ruler is always the end of the X ruler. Written into that
   * figure rather than beside it, so the two can never overlap or drift.
   */
  if (titles) {
    return [...labels, ...axisTitles(area, sides, units.length)];
  }

  const far = labels.find((label) => label.key === `x${farX}`);
  if (far) {
    far.text = `${far.text} ${units.length}`;
  }

  return labels;
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
