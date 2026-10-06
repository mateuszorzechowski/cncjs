/*
 * Where a distance's two features stand in the scenes of both
 * (`PairOverview`), as the operator picked them (Mateusz, 2026-10-06: *"daj
 * dla reszty"*): along one line, `u`, the way the distance is measured —
 * across X for two round features or a side edge, across Y for a front or a
 * back edge — and how high the work's top is along it (`regions`, a level
 * each: 0 the part's top, below it a lower step or the table beside the
 * part). Holes are cut in the top, studs stand on it.
 *
 * An edge faces out of its part (`OUT`, along `u`): the part on the other
 * side of it, the table on its side. Two edges facing apart are a part's
 * width; facing alike, a step — the first the lower step's edge, the second
 * the upper's. Units are the drawing's, the line from −95 to 95.
 */
export const SPAN = 95;
const OUT = {
  'edge-front': { axis: 'y', s: 1 },
  'edge-back': { axis: 'y', s: -1 },
  'edge-left': { axis: 'x', s: -1 },
  'edge-right': { axis: 'x', s: 1 },
};
// The table beside a part, and a lower step's top, under the part's.
const TABLE = -30;
const STEP = -20;
// A hole's and a stud's size, and how high a stud stands.
export const HOLE_R = 18;
export const STUD_R = 16;
export const STUD_H = 16;
// The ball's bottom where each feature's own cycle begins: in a hole, over a stud, over the part by an edge.
const IN = -26;
const OVER = 6;
const BY_EDGE = 12;

const round = (part) => part.startsWith('circle');

/** The level of the work's top at `u`. */
export const levelAt = (regions, u) => (regions.find(([from, to]) => u >= from && u <= to) ?? [0, 0, TABLE])[2];

/**
 * The layout of `pair` (`{ a, b }`): the axis, each end's place `u` and
 * where its own cycle begins (`start`, `{ u, h }`), the regions of the top,
 * and the measure's two ends along the line.
 */
export const pairLayout = ({ a, b }) => {
  const ends = {};
  let axis = 'x';
  let regions = [[-SPAN, SPAN, 0]];
  if (round(a) && round(b)) {
    ends.a = { part: a, u: -50 };
    ends.b = { part: b, u: 50 };
  } else if (round(a) || round(b)) {
    const [edge, other] = round(a) ? ['b', 'a'] : ['a', 'b'];
    const { axis: way, s } = OUT[{ a, b }[edge]];
    axis = way;
    ends[edge] = { part: { a, b }[edge], u: 55 * s };
    ends[other] = { part: { a, b }[other], u: -15 * s };
    regions = s > 0 ? [[-SPAN, 55, 0], [55, SPAN, TABLE]] : [[-SPAN, -55, TABLE], [-55, SPAN, 0]];
  } else {
    const [oa, ob] = [OUT[a], OUT[b]];
    axis = oa.axis;
    if (oa.s !== ob.s) {
      // Facing apart: the part between them, the table outside both.
      ends.a = { part: a, u: 55 * oa.s };
      ends.b = { part: b, u: 55 * ob.s };
      regions = [[-SPAN, -55, TABLE], [-55, 55, 0], [55, SPAN, TABLE]];
    } else {
      // Facing alike: a step, the first edge the lower step's, the second the upper's.
      const { s } = oa;
      ends.a = { part: a, u: 55 * s };
      ends.b = { part: b, u: 15 * s };
      regions = s > 0
        ? [[-SPAN, 15, 0], [15, 55, STEP], [55, SPAN, TABLE]]
        : [[-SPAN, -55, TABLE], [-55, -15, STEP], [-15, SPAN, 0]];
    }
  }
  Object.values(ends).forEach((end) => {
    const level = round(end.part) ? 0 : levelAt(regions, end.u - OUT[end.part].s * 1);
    if (end.part === 'circle-inside') {
      end.start = { u: end.u, h: level + IN };
    } else if (end.part === 'circle-outside') {
      end.start = { u: end.u, h: level + STUD_H + OVER };
    } else {
      end.start = { u: end.u - OUT[end.part].s * BY_EDGE, h: level + OVER };
    }
  });
  return {
    axis, regions, ends, kind: { true: 'centres', false: round(a) || round(b) ? 'fromEdge' : 'edges' }[round(a) && round(b)],
  };
};

/** The top's outline along the line, from the front: `[u, h]` points, holes cut and studs standing. */
export const profileOf = ({ regions, ends }) => {
  const points = [];
  regions.forEach(([from, to, level]) => {
    const inside = Object.values(ends).filter((end) => round(end.part) && end.u > from && end.u < to).sort((p, q) => p.u - q.u);
    points.push([from, level]);
    inside.forEach(({ part, u }) => {
      const [r, h] = part === 'circle-inside' ? [HOLE_R, level - 40] : [STUD_R, level + STUD_H];
      points.push([u - r, level], [u - r, h], [u + r, h], [u + r, level]);
    });
    points.push([to, level]);
  });
  return points;
};
