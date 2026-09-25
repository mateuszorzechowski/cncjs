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

/**
 * The line of the program the tool is on, and the vertices it drew.
 *
 * *"Zaznaczaj aktualne polecenie G-code na ścieżce"* (Mateusz, 2026-09-25).
 * The count of lines answered is not it: it runs ahead of the tool by what
 * the firmware has queued (see `LOOKBACK`). So of the lines in that window,
 * the one whose move passes nearest the tool is the one being cut. At a
 * corner the later line wins — the move that ended there is done.
 *
 * `tool` is in the program's own coordinates, the ones `positions` are in.
 * Without it, the last line answered is the best there is.
 *
 * @returns {{ line, start, end } | null} `start` and `end` are the vertex
 *   range the line added, `[start, end)`; everything before `start` is done.
 */
export const pathProgress = ({ frames, positions, received, tool, lookback = LOOKBACK }) => {
  if (!frames?.length || !(received > 0)) {
    return null;
  }

  const last = Math.min(received, frames.length) - 1;
  let best = null;

  if (tool) {
    for (let line = Math.max(0, last - lookback); line <= last; line += 1) {
      const { start, end } = verticesOf(frames, line);
      for (let v = Math.max(start, 1); v < end; v += 1) {
        const d = distanceSq(positions, v - 1, v, tool);
        // `<=`: on a tie the later line, which is the one starting there.
        if (!best || d <= best.d) {
          best = { line, d };
        }
      }
    }
  }

  const line = best ? best.line : last;
  return { line, ...verticesOf(frames, line) };
};

export default pathProgress;
