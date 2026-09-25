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
      .toEqual({ line: 3, start: 2, end: 3 });
    expect(pathProgress({ frames, positions, received: 5, tool: at(5, 10) }))
      .toEqual({ line: 4, start: 3, end: 4 });
  });

  test('at a corner, the move that starts there rather than the one that ended', () => {
    expect(pathProgress({ frames, positions, received: 5, tool: at(10, 0) }).line).toBe(3);
  });

  test('only among the lines the firmware may still be holding', () => {
    // Look back no further than the last line taken: the tool is nearest
    // line 1, but that line is outside the window.
    expect(pathProgress({ frames, positions, received: 5, tool: at(5, 0), lookback: 0 }).line).toBe(4);
  });

  test('the last line taken, when there is no position to go by', () => {
    expect(pathProgress({ frames, positions, received: 4, tool: null }).line).toBe(3);
  });

  test('nothing before the first line has been taken', () => {
    expect(pathProgress({ frames, positions, received: 0, tool: at(0, 0) })).toBeNull();
    expect(pathProgress({ frames: [], positions, received: 3, tool: at(0, 0) })).toBeNull();
  });
});
