import { contourSegments, contourStep } from '../contours';

describe('how far apart the height map\'s contours go', () => {
  test('a round step, the finest giving ten lines at most', () => {
    expect(contourStep(-0.52, 0)).toBe(0.1);
    expect(contourStep(0, 0.139)).toBe(0.02);
    expect(contourStep(0, 0.05)).toBe(0.005);
    expect(contourStep(-3, 4)).toBe(1);
  });
});

describe('the contours of a surface, on the sheet as drawn', () => {
  test('a slope along u crosses each level once in each of the two triangles of a square', () => {
    // 0 at u = 0 up to 0.2 at u = 2, two cells wide, one deep, drawn coarse.
    const segments = contourSegments((u) => u * 0.1, 3, 2, 0.05, 1);
    const at = (level) => segments.filter(([a]) => Math.abs(a[0] - level / 0.1) < 1e-9);
    expect(at(0.05)).toHaveLength(2);
    expect(at(0.15)).toHaveLength(2);
    // Straight across, v 0 to 1 in two pieces, at the level's height.
    expect(at(0.05).flat().map(([, v]) => v).sort()).toEqual([0, 0.5, 0.5, 1]);
    expect(at(0.05).flat().every(([, , h]) => Math.abs(h - 0.05) < 1e-12)).toBe(true);
  });

  test('on a face, not on the true surface: a saddle cell is cut along its diagonal', () => {
    // Bilinear u * v over one cell: at its middle the surface says 0.25, the two triangles say 0.5.
    const segments = contourSegments((u, v) => u * v, 2, 2, 0.5, 1);
    expect(segments).toHaveLength(1);
    expect(segments[0].map(([u, v]) => [u, v])).toEqual([[1, 0.5], [0.5, 1]]);
  });

  test('a flat surface has none', () => {
    expect(contourSegments(() => 0.03, 3, 3, 0.05, 2)).toEqual([]);
  });
});
