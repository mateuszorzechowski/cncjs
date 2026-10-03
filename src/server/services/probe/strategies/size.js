import { touch } from '../moves';
import { across as bossAcross } from './boss';
import { across as holeAcross } from './hole';

/**
 * A size, not a zero (Mateusz, 2026-10-03, "pomiar rozmiaru obok mapy"): a
 * hole or a part across X and Y, or one width — a groove from inside, a bar
 * from outside — along one axis. The moves are the hole's and the part's
 * centre's; the zero is never touched. What comes out is the size, for the
 * screen and the journal.
 *
 * Measured `repeats` times (1–5, his "do wyboru"), after `holePasses` − 1
 * passes that only find the centre, so each counted pass starts square to
 * the walls. One counted pass is the centre methods' size; more give their
 * mean and the spread, the largest less the smallest.
 *
 * The ball's diameter is added back inside and taken off outside: the size
 * is only as good as that figure, which the panel says under it.
 */

/*
 * One width, by what it is and along which axis (Mateusz, 2026-10-03): a
 * groove, touched from inside, or a bar, from outside — one choice, as the
 * corner's and the paper's edge are.
 */
export const SHAPES = {
  'groove-x': { axes: ['x'], side: 'inside' },
  'groove-y': { axes: ['y'], side: 'inside' },
  'bar-x': { axes: ['x'], side: 'outside' },
  'bar-y': { axes: ['y'], side: 'outside' },
};
const BOTH = ['x', 'y'];

// Every pass, the ones that count last.
const passCount = (params) => params.holePasses - 1 + params.repeats;
const counted = (params) => Array.from({ length: params.repeats }, (_, k) => params.holePasses + k);

const passes = (axes, side, params) => {
  const across = side === 'inside' ? holeAcross : bossAcross;
  const all = [];
  for (let n = 1; n <= passCount(params); n++) {
    all.push(...axes.flatMap((axis) => across(axis, n, params)));
  }
  // From outside, the top first: the way down beside each side is measured from it.
  return side === 'inside' ? all : [...touch('z', -1, params.maxZ, 'z', params), ...all];
};

/** `{ size, spread, each }`: the mean per axis, the largest less the smallest (null for one pass), and every pass's. */
const sizeOf = (axes, side, params, seen) => {
  const ball = side === 'inside' ? params.ballDiameter : -params.ballDiameter;
  const each = counted(params).map((n) => Object.fromEntries(axes.map((axis) => (
    [axis, Math.abs(seen[`${axis}${n}a`][axis] - seen[`${axis}${n}b`][axis]) + ball]
  ))));
  const of = (pick) => Object.fromEntries(axes.map((axis) => [axis, pick(each.map((one) => one[axis]))]));
  return {
    size: of((values) => values.reduce((sum, v) => sum + v, 0) / values.length),
    spread: each.length > 1 ? of((values) => Math.max(...values) - Math.min(...values)) : null,
    each,
  };
};

const HOLE_FIELDS = ['holeSize', 'holePasses', 'repeats', 'ballDiameter', 'retract', 'fast', 'slow'];
const BOSS_FIELDS = ['bossSize', 'holePasses', 'repeats', 'ballDiameter', 'clear', 'depth', 'maxZ', 'retract', 'fast', 'slow'];

const fixed = (side, fields) => ({
  fields,
  options: {},
  touches: true,
  check: () => null,
  steps: (params) => passes(BOTH, side, params),
  size: (params, options, seen) => sizeOf(BOTH, side, params, seen),
});

export const holeSize = fixed('inside', HOLE_FIELDS);
export const bossSize = fixed('outside', BOSS_FIELDS);

/** One axis, two walls: `shape` one of `SHAPES`. */
export const width = {
  // A groove's figures are a hole's, a bar's a part's; the panel shows the ones for the shape chosen.
  fields: [...new Set([...BOSS_FIELDS, ...HOLE_FIELDS])],
  options: { shape: Object.keys(SHAPES) },
  touches: true,
  check: (options) => (SHAPES[options.shape] ? null : 'bad-shape'),
  steps: (params, options) => passes(SHAPES[options.shape].axes, SHAPES[options.shape].side, params),
  size: (params, options, seen) => sizeOf(SHAPES[options.shape].axes, SHAPES[options.shape].side, params, seen),
};
