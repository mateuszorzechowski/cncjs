import { touch } from '../moves';
import { across as bossAcross, overTheTop } from './boss';
import {
  PARTS, cornerOf, distanceOf, pairRefusal,
} from './distance';
import { EDGES, edgeLine, edgeOf, edgeSteps } from './edge';
import { ovalOf } from './oval';
import { slotOf } from './slot';
import { turnedOf, turnedSteps } from './turned';
import { across as holeAcross } from './hole';

/**
 * Pomiar: a size, not a zero (Mateusz, 2026-10-03, "odpada jeden przycisk na
 * każdy z tych elementów"). One method; what is measured and how it lies is
 * one choice, `shape`. The moves are the hole's and the part's centre's; the
 * zero is never touched. What comes out is the size and where its middle is,
 * for the screen and the journal.
 *
 * Measured `repeats` times (1–5, his "do wyboru"), after `holePasses` − 1
 * passes that only find the centre, so each counted pass starts square to
 * the walls. One counted pass is the centre methods' size; more give their
 * mean and the spread, the largest less the smallest.
 *
 * A circle is not read off the two chords: every wall touch is a point on
 * it, and the circle through them is fitted (least squares). Its diameter
 * then does not hang on the chords crossing at the middle, and how far the
 * touches stand off the circle says whether it is one. A rectangle's or a
 * width's walls are square to the axes, so each axis is its chord.
 *
 * The ball's diameter is added back inside and taken off outside: the size
 * is only as good as that figure, which the panel says under it.
 */

/*
 * What is measured, and how it lies: a circle or a rectangle from inside (a
 * hole, a pocket) or outside (a stud, a part), one width along one axis — a
 * groove from inside, a bar from outside — or an edge and its angle (`edge`).
 */
export const SHAPES = {
  'circle-inside': { kind: 'circle', axes: ['x', 'y'], side: 'inside' },
  'circle-outside': { kind: 'circle', axes: ['x', 'y'], side: 'outside' },
  'rect-inside': { kind: 'rect', axes: ['x', 'y'], side: 'inside' },
  'rect-outside': { kind: 'rect', axes: ['x', 'y'], side: 'outside' },
  // At an angle: four sides at two points each, every move along one axis (`turned`).
  'rect-inside-turned': { kind: 'rect', side: 'inside', turned: true },
  'rect-outside-turned': { kind: 'rect', side: 'outside', turned: true },
  // An oval, along the axes or turned: touched as the rectangle at an angle is, the ellipse fitted (`oval`).
  'oval-inside': { kind: 'oval', side: 'inside', turned: true },
  'oval-outside': { kind: 'oval', side: 'outside', turned: true },
  // A slot — a fasolka — cut or standing, along the axes or turned (`slot`).
  'slot-inside': { kind: 'slot', side: 'inside', turned: true },
  'slot-outside': { kind: 'slot', side: 'outside', turned: true },
  'groove-x': { kind: 'width', axes: ['x'], side: 'inside' },
  'groove-y': { kind: 'width', axes: ['y'], side: 'inside' },
  'bar-x': { kind: 'width', axes: ['x'], side: 'outside' },
  'bar-y': { kind: 'width', axes: ['y'], side: 'outside' },
  ...Object.fromEntries(Object.keys(EDGES).map((edge) => [`edge-${edge}`, { kind: 'edge', edge }])),
  // One feature to another, each one of `distance`'s `PARTS`, options `a` and `b`, measured one after the other.
  distance: { kind: 'distance', pair: distanceOf },
  // Two edges that meet: the angle between them, and the corner (`distance`).
  angle: { kind: 'angle', pair: cornerOf },
};

// Every pass, the ones that count last.
const passCount = (params) => params.holePasses - 1 + params.repeats;
const counted = (params) => Array.from({ length: params.repeats }, (_, k) => params.holePasses + k);

const passes = ({
  axes, side, edge, turned,
}, params, { start } = {}) => {
  if (edge) {
    return edgeSteps(edge, params);
  }
  if (turned) {
    return turnedSteps(side, params, start);
  }
  const across = side === 'inside' ? holeAcross : bossAcross;
  const all = [];
  for (let n = 1; n <= passCount(params); n++) {
    all.push(...axes.flatMap((axis) => across(axis, n, params)));
  }
  // From outside, the top first: the way down beside each side is measured from it.
  return side === 'inside' ? all : [...touch('z', -1, params.maxZ, 'z', params), overTheTop(params), ...all];
};

// The ball's centre at each wall touch of pass `n`, `[x, y]`.
const pointsOf = (seen, n) => ['x', 'y'].flatMap((axis) => ['a', 'b'].map((wall) => [seen[`${axis}${n}${wall}`].x, seen[`${axis}${n}${wall}`].y]));

/**
 * The circle through `points` by least squares (Kåsa): `{ x, y, r }`, and
 * `off`, the largest less the smallest distance of a point from the centre —
 * zero for a true circle.
 */
export const fitCircle = (points) => {
  // About their mean, so the sums stay small far from the machine's origin.
  const [mx, my] = [0, 1].map((i) => points.reduce((sum, p) => sum + p[i], 0) / points.length);
  const ps = points.map(([x, y]) => [x - mx, y - my]);
  let [suu, suv, svv, suz, svz, su, sv, sz] = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const [u, v] of ps) {
    const z = u * u + v * v;
    suu += u * u;
    suv += u * v;
    svv += v * v;
    suz += u * z;
    svz += v * z;
    su += u;
    sv += v;
    sz += z;
  }
  const n = ps.length;
  // u² + v² = a·u + b·v + c, solved by Cramer's rule.
  const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const A = [[suu, suv, su], [suv, svv, sv], [su, sv, n]];
  const rhs = [suz, svz, sz];
  const swapped = (col) => A.map((row, i) => row.map((value, j) => (j === col ? rhs[i] : value)));
  const d = det3(A);
  const [a, b, c] = [0, 1, 2].map((col) => det3(swapped(col)) / d);
  const [cu, cv] = [a / 2, b / 2];
  const r = Math.sqrt(c + cu * cu + cv * cv);
  const radii = ps.map(([u, v]) => Math.hypot(u - cu, v - cv));
  return {
    x: cu + mx, y: cv + my, r, off: Math.max(...radii) - Math.min(...radii),
  };
};

const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
const spreadOf = (values) => Math.max(...values) - Math.min(...values);

/**
 * What came out, `{ kind, size, spread, each, centre }`: the size by `d`
 * (a circle's diameter) or by axis, the mean of the counted passes; the
 * largest less the smallest (null for one pass); every counted pass's; and
 * the middle, machine coordinates, the last pass's. A circle adds `off`, how
 * far its touches stand from round, over every pass.
 */
const sizeOf = (shape, params, seen) => {
  const {
    kind, axes, side, edge, turned,
  } = SHAPES[shape];
  if (edge) {
    return edgeOf(edge, params, seen);
  }
  if (turned) {
    const fit = { oval: ovalOf, slot: slotOf }[kind] ?? turnedOf;
    return fit(side, params, seen);
  }
  const ball = side === 'inside' ? params.ballDiameter : -params.ballDiameter;
  const last = params.holePasses - 1 + params.repeats;
  let each;
  let centre;
  let off;
  if (kind === 'circle') {
    each = counted(params).map((n) => ({ d: 2 * fitCircle(pointsOf(seen, n)).r + ball }));
    const all = Array.from({ length: last }, (_, k) => pointsOf(seen, k + 1)).flat();
    const fit = fitCircle(all);
    centre = { x: fit.x, y: fit.y };
    off = fit.off;
  } else {
    each = counted(params).map((n) => Object.fromEntries(axes.map((axis) => (
      [axis, Math.abs(seen[`${axis}${n}a`][axis] - seen[`${axis}${n}b`][axis]) + ball]
    ))));
    centre = Object.fromEntries(axes.map((axis) => [axis, (seen[`${axis}${last}a`][axis] + seen[`${axis}${last}b`][axis]) / 2]));
  }
  const keys = Object.keys(each[0]);
  const of = (pick) => Object.fromEntries(keys.map((key) => [key, pick(each.map((one) => one[key]))]));
  return {
    kind,
    size: of(mean),
    spread: each.length > 1 ? of(spreadOf) : null,
    each,
    centre,
    ...(kind === 'circle' ? { off } : {}),
  };
};

/*
 * A pair's feature `part` (`a`, then `b`): measured as on its own, an
 * edge with its line. The first is kept by the controller as `half`, until
 * the operator has jogged to the second.
 */
const partOf = (shape, params, seen) => {
  const found = sizeOf(shape, params, seen);
  return SHAPES[shape].edge ? { ...found, line: edgeLine(SHAPES[shape].edge, params, seen) } : found;
};

/** One method, `shape` one of `SHAPES`. */
export default {
  // An inside shape's figures are a hole's, an outside one's a part's; the panel shows the ones for the shape chosen.
  fields: ['holeSize', 'bossSize', 'spacing', 'holePasses', 'repeats', 'ballDiameter', 'clear', 'overTop', 'depth', 'maxZ', 'retract', 'fast', 'slow'],
  options: { shape: Object.keys(SHAPES), a: PARTS.distance, b: PARTS.distance },
  touches: true,
  /*
   * A shape touched at two points a side needs them on the side: further apart
   * than the rough size, a point meets the next wall, or — inside — a way to it
   * runs into one (Mateusz, 2026-10-05: *"czy ruchy są bezpieczne"*).
   */
  // Whether these options measure two features, one after the other.
  paired: (options) => Boolean(SHAPES[options?.shape]?.pair),
  check: (options, params) => {
    const shape = SHAPES[options.shape];
    if (!shape) {
      return 'bad-shape';
    }
    if (shape.pair) {
      return pairRefusal(options.shape, options.a, options.b);
    }
    const rough = shape.side === 'inside' ? params?.holeSize : params?.bossSize;
    return shape.turned && params && params.spacing >= rough ? 'spacing-too-wide' : null;
  },
  // A pair's steps are its feature's: `part`, `a` or `b`.
  steps: (params, options, { part = 'a', ...where } = {}) => (
    SHAPES[options.shape].pair ? passes(SHAPES[options[part]], params, where) : passes(SHAPES[options.shape], params, where)
  ),
  /*
   * A pair — a distance, a corner — measures in two halves (`part`): the first comes back as
   * `half`, to be kept until the second, given back as `first`.
   */
  size: (params, options, seen, { part = 'a', first = null } = {}) => {
    const { pair } = SHAPES[options.shape];
    if (!pair) {
      return sizeOf(options.shape, params, seen);
    }
    const found = partOf(options[part], params, seen);
    return part === 'a' ? { half: found } : pair(first, found);
  },
};
