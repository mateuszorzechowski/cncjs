/**
 * Where each finding goes on the editor's scrollbar — pure, so Jest reads it.
 *
 * `found` is `{ line, top, severity }` with `top` the finding's line as a
 * fraction of the whole text (0 at the top, 1 at the bottom); `track` the
 * track's height in pixels. Findings that land on the same pixel row are one
 * mark, and an error outranks a warning there: the mark says the worst thing
 * at that height, and a click on it goes to the first line that said it.
 *
 * @returns {{ y: number, severity: string, line: number }[]} top to bottom
 */
export const scrollMarks = (found, track, { markHeight = 3 } = {}) => {
  const rows = new Map();
  const room = Math.max(0, track - markHeight);
  for (const { line, top, severity } of found) {
    const y = Math.round(Math.min(1, Math.max(0, top)) * room);
    const had = rows.get(y);
    if (!had || (had.severity !== 'error' && severity === 'error') || (had.severity === severity && line < had.line)) {
      rows.set(y, { y, severity, line });
    }
  }
  return [...rows.values()].sort((a, b) => a.y - b.y);
};

/** The scroll offset a press at `y` on a track of `track` pixels asks for. */
export const scrollAt = (y, track, scrollHeight, clientHeight) => {
  const hidden = Math.max(0, scrollHeight - clientHeight);
  const at = track > 0 ? Math.min(1, Math.max(0, y / track)) : 0;
  return Math.round(at * hidden);
};

export default scrollMarks;
