import { parseLine } from 'gcode-parser';
import { compensate, heightAt } from '../compensate';

// A 3×3 grid over machine X 0..20, Y 0..20, every 10 mm.
const grid = (f, travel = 5) => {
  const xs = [0, 10, 20];
  const ys = [0, 10, 20];
  return { xs, ys, dz: ys.map((y) => xs.map((x) => f(x, y))), travel };
};

const flat = grid(() => 0);
const tilted = grid((x) => 0.01 * x);
const twisted = grid((x, y) => 0.001 * (x - 10) * (y - 10));

// The figures of each line that moves, after the leading `G90 G21`.
const moves = (result) => result.lines.slice(1)
  .map((line) => Object.fromEntries(parseLine(line).words.map(([l, v]) => [l, v])))
  .filter((w) => w.X !== undefined || w.Y !== undefined || w.Z !== undefined);

describe('heightAt', () => {
  test('is exact on a node, between them bilinear, past the grid its edge', () => {
    expect(heightAt(tilted, 10, 10)).toBeCloseTo(0.1);
    expect(heightAt(tilted, 15, 3)).toBeCloseTo(0.15);
    expect(heightAt(tilted, 40, 5)).toBeCloseTo(0.2);
    expect(heightAt(twisted, 5, 5)).toBeCloseTo(0.025);
  });
});

describe('compensate', () => {
  test('starts absolute and in millimetres, and keeps each line to the file line it came from', () => {
    const result = compensate('(part)\nG0 X0 Y0 Z1\nG1 Z-0.1 F100\nM5', flat);
    expect(result.lines[0]).toBe('G90 G21');
    expect(result.lines).toEqual(['G90 G21', '(part)', 'G0 X0 Y0 Z1', 'G1 X0 Y0 Z-0.1 F100', 'M5']);
    expect(result.source).toEqual([0, 0, 1, 2, 3]);
  });

  test('a plane needs cuts only where the grid lines cross', () => {
    const result = compensate('G0 X0 Y5 Z1\nG1 Z-0.1\nG1 X20', tilted);
    const cut = moves(result).slice(2);
    expect(cut.map((w) => w.X)).toEqual([10, 20]);
    expect(cut.map((w) => w.Z)).toEqual([0, 0.1]);
    expect(result.source.slice(-2)).toEqual([2, 2]);
  });

  test('a twisted cell is cut until no chord leaves the surface by more than the tolerance', () => {
    const tolerance = 0.01;
    const result = compensate('G0 X0 Y0 Z1\nG1 Z0\nG1 X20 Y20', twisted, { tolerance });
    const points = moves(result).slice(1);
    expect(points.length).toBeGreaterThan(3);
    for (let k = 1; k < points.length; k++) {
      const a = points[k - 1];
      const b = points[k];
      const x = (a.X + b.X) / 2;
      const y = (a.Y + b.Y) / 2;
      expect(Math.abs((a.Z + b.Z) / 2 - heightAt(twisted, x, y))).toBeLessThanOrEqual(tolerance + 0.001);
    }
  });

  test('a move straight down is not cut', () => {
    const result = compensate('G0 X15 Y15 Z1\nG1 Z-1', tilted);
    expect(moves(result)).toHaveLength(2);
    expect(moves(result)[1]).toEqual({ G: 1, X: 15, Y: 15, Z: -0.85 });
  });

  test('G91 comes out absolute', () => {
    const result = compensate('G0 X0 Y0 Z1\nG91\nG1 X5 Z-1.1\nG1 X5', flat);
    expect(result.lines.join('\n')).not.toMatch(/G91/);
    expect(moves(result).slice(-2)).toEqual([{ G: 1, X: 5, Y: 0, Z: -0.1 }, { G: 1, X: 10, Y: 0, Z: -0.1 }]);
  });

  test('a relative move before anything says where the tool is: refused', () => {
    expect(compensate('G91 G1 X5 Z-1', flat)).toEqual({ refused: { code: 'relative-unknown', line: 0 } });
  });

  test('G92 is refused', () => {
    expect(compensate('G0 X0 Y0 Z1\nG92 X0', flat)).toEqual({ refused: { code: 'g92', line: 1 } });
  });

  test('an arc becomes the chords Grbl cuts it into, on its circle, ending where it began', () => {
    const result = compensate('G0 X5 Y10 Z1\nG1 Z0\nG2 X5 Y10 I5 J0', flat);
    expect(result.lines.join('\n')).not.toMatch(/G2(?!\d)/);
    const points = moves(result).slice(2);
    for (const p of points) {
      expect(Math.hypot(p.X - 10, p.Y - 10)).toBeCloseTo(5, 2);
    }
    const last = points[points.length - 1];
    expect([last.X, last.Y]).toEqual([5, 10]);
    // Clockwise from the left of the circle goes up first.
    expect(points[0].Y).toBeGreaterThan(10);
  });

  test('an arc by its radius', () => {
    const result = compensate('G0 X0 Y10 Z1\nG1 Z0\nG3 X10 Y20 R10', flat);
    const points = moves(result).slice(2);
    for (const p of points) {
      // The short way round, about (0, 20).
      expect(Math.hypot(p.X, p.Y - 20)).toBeCloseTo(10, 2);
    }
    expect(points[points.length - 1]).toMatchObject({ X: 10, Y: 20 });
  });

  test('an arc outside the XY plane is refused', () => {
    expect(compensate('G0 X0 Y0 Z1\nG18\nG2 X10 Z1 I5 K0', flat)).toEqual({ refused: { code: 'arc-plane', line: 2 } });
  });

  test('past the grid by up to half a step it is the edge; further, refused', () => {
    const near = compensate('G0 X24 Y5 Z10\nG1 Z0', tilted);
    expect(moves(near)[1].Z).toBeCloseTo(0.2);
    expect(compensate('G0 X26 Y5 Z10\nG1 Z0', tilted)).toEqual({ refused: { code: 'outside-map', line: 1 } });
  });

  test('a rapid above the probe\'s travel is passed on as written; below it, bent', () => {
    const result = compensate('G0 X15 Y5 Z10\nG0 X12 Y5\nG0 Z1', tilted);
    expect(moves(result)).toEqual([
      { G: 0, X: 15, Y: 5, Z: 10 },
      { G: 0, X: 12, Y: 5, Z: 10 },
      { G: 0, X: 12, Y: 5, Z: 1.12 },
    ]);
  });

  test('a program with no Z is not one a map can bend', () => {
    expect(compensate('G0 X0 Y0\nG1 X10', flat)).toEqual({ refused: { code: 'no-z', line: null } });
  });

  test('the map is in machine coordinates: the work offset moves the program over it', () => {
    const result = compensate('G0 X0 Y0 Z1\nG1 Z0', tilted, { wco: { x: 10, y: 0, z: 0 } });
    expect(moves(result)[1]).toMatchObject({ X: 0, Z: 0.1 });
  });

  test('in inches it stays in inches', () => {
    const result = compensate('G20\nG0 X0.5 Y0.2 Z0.1\nG1 Z0', tilted);
    // 0.5 in = 12.7 mm over the surface: 0.127 mm, 0.005 in.
    expect(moves(result)[1]).toEqual({ G: 1, X: 0.5, Y: 0.2, Z: 0.005 });
  });

  test('home makes the axes it names unknown, and its G91 does not outlive its line', () => {
    const result = compensate('G0 X0 Y0 Z1\nG91 G28 Z0\nG90 G0 X5 Y5\nG0 Z1', flat);
    expect(result.lines.slice(2, 4)).toEqual(['G91 G28 Z0', 'G90']);
    expect(compensate('G0 X0 Y0 Z1\nG28\nG91 G1 X5', flat)).toEqual({ refused: { code: 'relative-unknown', line: 2 } });
  });

  test('a straight move before X and Y are known goes as written; an arc there is refused', () => {
    const result = compensate('G21\nG1 Z1 F2540\nG0 X15 Y5\nG1 Z-1', tilted);
    expect(moves(result)).toEqual([
      { G: 1, Z: 1, F: 2540 },
      { G: 0, X: 15, Y: 5, Z: 1.15 },
      { G: 1, X: 15, Y: 5, Z: -0.85 },
    ]);
    expect(compensate('G0 X0 Y0 Z1\nG28 X0\nG2 X5 Y0 I2.5', flat)).toEqual({ refused: { code: 'unknown-position', line: 2 } });
  });
});
