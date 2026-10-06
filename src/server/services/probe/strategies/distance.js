import { EDGES } from './edge';

/**
 * Pomiar: one feature to another, measured one after the other, the operator
 * jogging from the first to the second between the two. Each feature is
 * measured as Pomiar measures it on its own.
 *
 * - A distance (Mateusz, 2026-10-05: *"złożenie A + B, wszystkie trzy
 *   pary"*): two holes or studs centre to centre, a hole's centre from an
 *   edge, or two edges facing apart or alike. Two edges must run the same
 *   way: edges square to each other meet in a corner, not at a distance.
 * - A height (*"działaj"*, the same day): two surfaces touched from above,
 *   how far the second stands over the first — a step's height, a pocket's
 *   depth, negative.
 *
 * `PARTS` are the features one end may be, by what is measured. A corner's
 * angle is the 3D probe's corner cycle (`corner3d`), which reads it with
 * `cornerOf`.
 */
// Lower case: `react-refresh/babel` takes a capitalised name set by a call
// for a component, and the server then dies on `$RefreshReg$` at start.
// An edge of a part from outside.
const edgeParts = Object.keys(EDGES).map((edge) => `edge-${edge}`);
export const PARTS = {
  distance: ['circle-inside', 'circle-outside', ...edgeParts],
  height: ['surface'],
};

const edgeOf = (part) => EDGES[part.replace(/^edge-/, '')] ?? null;

/** Why the pair `a`, `b` will not do for `shape` (`distance` or `height`), or null. */
export const pairRefusal = (shape, a, b) => {
  if (!PARTS[shape].includes(a) || !PARTS[shape].includes(b)) {
    return 'bad-part';
  }
  const [ea, eb] = [edgeOf(a), edgeOf(b)];
  if (shape === 'height') {
    return null;
  }
  return ea && eb && ea.axis !== eb.axis ? 'edges-crossing' : null;
};

const DEGREES = 180 / Math.PI;

// Each end's own kind, size and where it is (machine coordinates), as it was measured on its own.
const partsOf = (ends) => ends.map(({ kind, size, centre }) => ({ kind, size, centre }));

// How far `point` stands off the line `{ at, dir }`, `dir` of length one: square to it, unsigned.
const offLine = (point, { at, dir }) => Math.abs((point.x - at.x) * dir.y - (point.y - at.y) * dir.x);
// Whether `point` lies off the part an edge `{ at, out }` is the side of, on the side it faces.
const offPart = (point, { at, out }) => (point.x - at.x) * out.x + (point.y - at.y) * out.y > 0;

/**
 * The distance between the two features measured, `{ kind, size, parts }`:
 * `size.dist` the distance — centre to centre, a centre square to an edge,
 * or an edge to an edge, the mean of each's middle off the other's line; two
 * centres add `dx`, `dy` (the second's less the first's) and `a`, the line
 * through them anticlockwise from X in degrees; two edges `par`, how far the
 * second is turned against the first, in degrees. `parts` each feature's own
 * kind and size; `beyond`, with an edge, whether the other end lies off the
 * part that edge is a side of — the first edge's, with two — for the
 * drawing. Each feature comes as Pomiar measured it, an edge with its `line`
 * (machine coordinates).
 */
export const distanceOf = (first, second) => {
  const ends = [first, second];
  const lines = ends.filter((one) => one.line);
  let size;
  let beyond = null;
  if (lines.length === 0) {
    const [dx, dy] = ['x', 'y'].map((axis) => second.centre[axis] - first.centre[axis]);
    size = {
      dist: Math.hypot(dx, dy), dx, dy, a: Math.atan2(dy, dx) * DEGREES,
    };
  } else if (lines.length === 1) {
    const round = ends.find((one) => !one.line);
    size = { dist: offLine(round.centre, lines[0].line) };
    beyond = offPart(round.centre, lines[0].line);
  } else {
    const [la, lb] = lines.map((one) => one.line);
    // A line has no way along it: one run backwards is turned by nothing, not by half a turn.
    const turn = Math.atan((la.dir.x * lb.dir.y - la.dir.y * lb.dir.x) / (la.dir.x * lb.dir.x + la.dir.y * lb.dir.y));
    size = { dist: (offLine(lb.at, la) + offLine(la.at, lb)) / 2, par: turn * DEGREES };
    beyond = offPart(lb.at, la);
  }
  return {
    kind: 'distance',
    size,
    spread: null,
    each: [size],
    centre: {},
    parts: partsOf(ends),
    ...(beyond === null ? {} : { beyond }),
  };
};

const dot = (u, v) => u.x * v.x + u.y * v.y;

/**
 * A corner from its two edges, `{ kind, size, centre, parts }`: `size.a`
 * the angle inside the part between them, in degrees; `size.square` how
 * far that is off a right angle; `centre` where the two lines meet, machine
 * coordinates — the corner, for a zero. Each edge comes with its `line`.
 */
export const cornerOf = (first, second) => {
  const [la, lb] = [first.line, second.line];
  // Along each edge from the corner into the work: the way the other edge's part lies.
  const into = (line, other) => {
    const towards = dot(line.dir, other.out) < 0 ? 1 : -1;
    return { x: line.dir.x * towards, y: line.dir.y * towards };
  };
  const [ra, rb] = [into(la, lb), into(lb, la)];
  const a = Math.acos(Math.max(-1, Math.min(1, dot(ra, rb)))) * DEGREES;
  // atA + t·dirA = atB + s·dirB, for t.
  const cross = la.dir.x * lb.dir.y - la.dir.y * lb.dir.x;
  const t = ((lb.at.x - la.at.x) * lb.dir.y - (lb.at.y - la.at.y) * lb.dir.x) / cross;
  const size = { a, square: a - 90 };
  return {
    kind: 'angle',
    size,
    spread: null,
    each: [size],
    centre: { x: la.at.x + t * la.dir.x, y: la.at.y + t * la.dir.y },
    parts: partsOf([first, second]),
  };
};

/**
 * A height from two surfaces, `{ kind, size, parts }`: `size.dz` how far the
 * second stands over the first, negative below it — machine Z, so neither
 * the tool's length nor the ball's size is in it.
 */
export const heightOf = (first, second) => {
  const size = { dz: second.centre.z - first.centre.z };
  return {
    kind: 'height', size, spread: null, each: [size], centre: {}, parts: partsOf([first, second]),
  };
};
