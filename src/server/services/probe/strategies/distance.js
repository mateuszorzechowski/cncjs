import { EDGES } from './edge';

/**
 * Pomiar: a distance, one feature to another (Mateusz, 2026-10-05: *"złożenie
 * A + B, wszystkie trzy pary"*) — two holes or studs centre to centre, a
 * hole's centre from an edge, or two edges facing apart or alike. Each
 * feature is measured as Pomiar measures it on its own; the operator jogs
 * from the first to the second between the two.
 *
 * `PARTS` are the features one end may be. Two edges must run the same way:
 * edges square to each other meet in a corner, not at a distance.
 */
export const PARTS = ['circle-inside', 'circle-outside', ...Object.keys(EDGES).map((edge) => `edge-${edge}`)];

const edgeOf = (part) => EDGES[part.replace(/^edge-/, '')] ?? null;

/** Why the pair `a`, `b` will not do, or null. */
export const pairRefusal = (a, b) => {
  if (!PARTS.includes(a) || !PARTS.includes(b)) {
    return 'bad-part';
  }
  const [ea, eb] = [edgeOf(a), edgeOf(b)];
  return ea && eb && ea.axis !== eb.axis ? 'edges-crossing' : null;
};

const DEGREES = 180 / Math.PI;

// How far `point` stands off the line `{ at, dir }`, `dir` of length one: square to it, unsigned.
const offLine = (point, { at, dir }) => Math.abs((point.x - at.x) * dir.y - (point.y - at.y) * dir.x);

/**
 * The distance between the two features measured, `{ kind, size, parts }`:
 * `size.dist` the distance — centre to centre, a centre square to an edge,
 * or an edge to an edge, the mean of each's middle off the other's line; two
 * centres add `dx`, `dy` (the second's less the first's) and `a`, the line
 * through them anticlockwise from X in degrees; two edges `par`, how far the
 * second is turned against the first, in degrees. `parts` each feature's own
 * kind and size. Each feature comes as Pomiar measured it, an edge with its
 * `line` (machine coordinates).
 */
export const distanceOf = (first, second) => {
  const ends = [first, second];
  const lines = ends.filter((one) => one.line);
  let size;
  if (lines.length === 0) {
    const [dx, dy] = ['x', 'y'].map((axis) => second.centre[axis] - first.centre[axis]);
    size = {
      dist: Math.hypot(dx, dy), dx, dy, a: Math.atan2(dy, dx) * DEGREES,
    };
  } else if (lines.length === 1) {
    const round = ends.find((one) => !one.line);
    size = { dist: offLine(round.centre, lines[0].line) };
  } else {
    const [la, lb] = lines.map((one) => one.line);
    // A line has no way along it: one run backwards is turned by nothing, not by half a turn.
    const turn = Math.atan((la.dir.x * lb.dir.y - la.dir.y * lb.dir.x) / (la.dir.x * lb.dir.x + la.dir.y * lb.dir.y));
    size = { dist: (offLine(lb.at, la) + offLine(la.at, lb)) / 2, par: turn * DEGREES };
  }
  return {
    kind: 'distance',
    size,
    spread: null,
    each: [size],
    centre: {},
    parts: ends.map(({ kind, size: own }) => ({ kind, size: own })),
  };
};
