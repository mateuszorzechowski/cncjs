import { pathProgress } from '../pathProgress';

/*
 * A square from the origin, one move per line, with a comment in the middle:
 *
 *   0  G0 X0 Y0      vertex 0
 *   1  G1 X10        vertex 1
 *   2  (a comment)   no vertex
 *   3  G1 Y10        vertex 2
 *   4  G1 X0         vertex 3
 *
 * `vertexIndex` is how many vertices exist once the line has been read, as
 * `buildToolpath` reports it.
 */
const frames = [1, 2, 2, 3, 4].map((vertexIndex) => ({ vertexIndex }));
const positions = new Float32Array([0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0]);
const at = (x, y, z = 0) => ({ x, y, z });

describe('which line the tool is on', () => {
  test('the one whose move passes under the tool, not the last one taken', () => {
    // Grbl has taken every line into its planner; the tool is half way up
    // the right-hand side, which is line 3.
    expect(pathProgress({ frames, positions, received: 5, tool: at(10, 5) }))
      .toEqual({ line: 3, start: 2, end: 3, sure: true });
    expect(pathProgress({ frames, positions, received: 5, tool: at(5, 10) }))
      .toEqual({ line: 4, start: 3, end: 4, sure: true });
  });

  test('at a corner, the move that starts there rather than the one that ended', () => {
    expect(pathProgress({ frames, positions, received: 5, tool: at(10, 0) }).line).toBe(3);
  });

  test('only among the lines the firmware may still be holding', () => {
    // Look back no further than the last line taken: the tool is nearest
    // line 1, but that line is outside the window.
    expect(pathProgress({ frames, positions, received: 5, tool: at(5, 0), lookback: 0 }).line).toBe(4);
  });

  test('over ground a later line goes back across, the line the tool is on now', () => {
    /*
     * Plunge, cut out, cut back, retract — the shape of every lead-in and
     * lead-out in `examples/gcode`:
     *
     *   0  G0 X0 Y0 Z1   vertex 0
     *   1  G1 Z0         vertex 1   down
     *   2  G1 X10        vertex 2   out
     *   3  G1 X0         vertex 3   back over line 2
     *   4  G1 Z1         vertex 4   up over line 1
     *
     * The tool on the way out or on the way down is on the later line too;
     * it used to go to the later one, until the window moved past it.
     */
    const track = [1, 2, 3, 4, 5].map((vertexIndex) => ({ vertexIndex }));
    const xz = new Float32Array([0, 0, 1, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 1]);

    expect(pathProgress({ frames: track, positions: xz, received: 5, tool: at(0, 0, 0.5) }).line).toBe(1);
    expect(pathProgress({ frames: track, positions: xz, received: 5, tool: at(4, 0, 0) }).line).toBe(2);
    // At the far end the way back has started.
    expect(pathProgress({ frames: track, positions: xz, received: 5, tool: at(10, 0, 0) }).line).toBe(3);
    // And once on the way back, not the way out again, which is done.
    expect(pathProgress({ frames: track, positions: xz, received: 5, tool: at(4, 0, 0), from: 3 }).line).toBe(3);
    expect(pathProgress({ frames: track, positions: xz, received: 5, tool: at(0, 0, 0.5), from: 4 }).line).toBe(4);
  });

  test('a full circle ends where it starts, and is still the line at its start', () => {
    // A lead-in to the circle's start, the circle as a square, a lead-out.
    //   0  vertex 0 (-1, 0)   1  vertex 1 (0, 0)   2  vertices 2-5, back to (0, 0)
    //   3  vertex 6 (-1, 0)
    const loop = [1, 2, 6, 7].map((vertexIndex) => ({ vertexIndex }));
    const square = new Float32Array([
      -1, 0, 0, 0, 0, 0, 0, 5, 0, 5, 5, 0, 5, 0, 0, 0, 0, 0, -1, 0, 0,
    ]);

    // Off the lead-in and on to the circle: the corner goes to the next line
    // once, not on past the circle to the lead-out.
    expect(pathProgress({ frames: loop, positions: square, received: 4, tool: at(0, 0), from: 1 }).line).toBe(2);
  });

  test('says whether the tool was on the line it names', () => {
    expect(pathProgress({ frames, positions, received: 5, tool: at(10, 5) }).sure).toBe(true);
    expect(pathProgress({ frames, positions, received: 5, tool: at(5, 5) }).sure).toBe(false);
  });

  test('the last line taken, when there is no position to go by', () => {
    expect(pathProgress({ frames, positions, received: 4, tool: null }).line).toBe(3);
  });

  test('nothing before the first line has been taken', () => {
    expect(pathProgress({ frames, positions, received: 0, tool: at(0, 0) })).toBeNull();
    expect(pathProgress({ frames: [], positions, received: 3, tool: at(0, 0) })).toBeNull();
  });
});
