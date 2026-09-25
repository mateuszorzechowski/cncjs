/**
 * How many lines past the one being cut the firmware may already have taken.
 *
 * Grbl acknowledges a line when it goes into the planner — sixteen blocks on
 * an Uno — and a few more wait in its serial buffer, so the count of lines
 * answered runs ahead of the tool by up to about twenty. The line being cut
 * is somewhere in that window, and the tool's own position says where.
 */
export const LOOKBACK = 24;

// The vertices a line added, as `[start, end)`.
const verticesOf = (frames, line) => ({
  start: line > 0 ? frames[line - 1].vertexIndex : 0,
  end: frames[line].vertexIndex,
});

// Squared distance from a point to the segment between two vertices.
const distanceSq = (positions, a, b, p) => {
  const ax = positions[a * 3];
  const ay = positions[(a * 3) + 1];
  const az = positions[(a * 3) + 2];
  const dx = positions[b * 3] - ax;
  const dy = positions[(b * 3) + 1] - ay;
  const dz = positions[(b * 3) + 2] - az;
  const length = (dx * dx) + (dy * dy) + (dz * dz);
  const t = length > 0
    ? Math.max(0, Math.min(1, (((p.x - ax) * dx) + ((p.y - ay) * dy) + ((p.z - az) * dz)) / length))
    : 0;
  const x = ax + (t * dx) - p.x;
  const y = ay + (t * dy) - p.y;
  const z = az + (t * dz) - p.z;
  return (x * x) + (y * y) + (z * z);
};

/*
 * How far off a drawn move the tool can be and still be on it, in the
 * program's units: the drawing lays arcs in chords up to 0.02 off the true
 * curve (`ARC_CHORD_TOLERANCE`), which the tool follows, and Grbl reports to
 * the thousandth. Well under any stepover.
 */
export const ON_PATH = 0.05;

// Two lines this much further from the tool than the nearest are still the
// same ground: the chords of two arcs over one curve can differ by the
// drawing's whole tolerance. Less than the gap between two short segments
// that merely follow each other.
const SAME_GROUND = 0.025;

// At a line's end, as Grbl reports a position: to the thousandth, in float32.
const AT_END = 0.002;

// Squared distance from the tool to the nearest point a line drew, or null
// for a line that drew nothing.
const lineDistanceSq = (positions, { start, end }, tool) => {
  let best = null;
  for (let v = Math.max(start, 1); v < end; v += 1) {
    const d = distanceSq(positions, v - 1, v, tool);
    if (best === null || d < best) {
      best = d;
    }
  }
  return best;
};

/**
 * The line of the program the tool is on, and the vertices it drew.
 *
 * *"Zaznaczaj aktualne polecenie G-code na ścieżce"* (Mateusz, 2026-09-25).
 * The count of lines answered is not it: it runs ahead of the tool by what
 * the firmware has queued (see `LOOKBACK`). So of the lines in that window,
 * it is one the tool is on.
 *
 * The earliest such line, not the nearest. A program goes back over its own
 * track all the time — the retract up the plunge, the lead-out back along
 * the lead-in round a circle — and with the nearest winning, a later line
 * over the same ground took the mark while the tool was still on the first,
 * until the window moved past it: *"następna linia rysowana na ścieżce obok,
 * a po chwili wraca na właściwą"* (2026-09-25).
 *
 * A line whose end the tool has reached is done — at a corner, the move
 * starting there is the one. Once only: a full circle ends where it starts,
 * so the line after the corner is taken even when the tool is at its end.
 *
 * `from` is the line chosen last time: the tool never goes back, so neither
 * does the mark, even when the tool comes back over a line already cut.
 * `sure` says the tool was on the line picked, which is when the caller
 * should keep it as the next `from`.
 *
 * `tool` is in the program's own coordinates, the ones `positions` are in.
 * Without it, the last line answered is the best there is. Off every line
 * (a position between reports, a drawing that is not what Grbl cut) the
 * nearest is the answer, as before.
 *
 * @returns {{ line, start, end } | null} `start` and `end` are the vertex
 *   range the line added, `[start, end)`; everything before `start` is done.
 */
export const pathProgress = ({
  frames, positions, received, tool, from = 0, lookback = LOOKBACK,
}) => {
  if (!frames?.length || !(received > 0)) {
    return null;
  }

  const last = Math.min(received, frames.length) - 1;
  const first = Math.min(last, Math.max(0, last - lookback, from));
  let line = last;

  if (tool) {
    const lines = [];
    for (let candidate = first; candidate <= last; candidate += 1) {
      const range = verticesOf(frames, candidate);
      const d = lineDistanceSq(positions, range, tool);
      if (d !== null) {
        lines.push({ line: candidate, range, d: Math.sqrt(d) });
      }
    }

    // `<=`: on a tie the later line, which is the one starting there.
    const nearest = lines.reduce((best, one) => (!best || one.d <= best.d ? one : best), null);

    if (nearest && nearest.d <= ON_PATH) {
      // Every line as near as the nearest is the same ground gone over again.
      const over = lines.filter((one) => one.d <= nearest.d + SAME_GROUND);
      const done = (one) => Math.sqrt(distanceSq(positions, one.range.end - 1, one.range.end - 1, tool)) <= AT_END;
      const [earliest, next] = over;
      const pick = done(earliest) && next ? next : earliest;
      return { line: pick.line, ...verticesOf(frames, pick.line), sure: true };
    }

    if (nearest) {
      line = nearest.line;
    }
  }

  return { line, ...verticesOf(frames, line), sure: false };
};

export default pathProgress;
