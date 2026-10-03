import { contourSegments, contourStep } from '../contours';

describe('how far apart the height map\'s contours go', () => {
  test('a round step, the finest giving ten lines at most', () => {
    expect(contourStep(-0.52, 0)).toBe(0.1);
    expect(contourStep(0, 0.139)).toBe(0.02);
    expect(contourStep(0, 0.05)).toBe(0.005);
    expect(contourStep(-3, 4)).toBe(1);
  });
});

describe('the contours of a surface', () => {
  test('a slope along u crosses each level once per row of cells, at its place', () => {
    // 0 at u = 0 up to 0.2 at u = 2, two cells wide, one deep, drawn coarse.
    const segments = contourSegments((u) => u * 0.1, 3, 2, 0.05, 1);
    const at = (level) => segments.filter(([a]) => Math.abs(a[0] - level / 0.1) < 1e-9);
    expect(at(0.05)).toHaveLength(1);
    expect(at(0.15)).toHaveLength(1);
    // Straight across, v 0 to 1.
    expect(at(0.05)[0].map(([, v]) => v).sort()).toEqual([0, 1]);
  });

  test('a flat surface has none', () => {
    expect(contourSegments(() => 0.03, 3, 3, 0.05, 2)).toEqual([]);
  });
});
