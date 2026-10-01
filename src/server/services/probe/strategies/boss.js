import { clearDown, move, touch } from '../moves';

/**
 * The centre of a boss — a round or square part, touched from outside
 * (Mateusz, 2026-10-01; #662 upstream). A 3D probe's ball starts over the
 * middle of it, a few millimetres above. The top is touched first, so the
 * way down beside each side is measured from the top found, not from
 * wherever the probe was set (his pick, "b"). Then, for each side in turn,
 * the ball goes out past it over the top by `clear`, down by `depth` below
 * the top, touches the side moving in, and rises again; the centre is half
 * way between each pair, X then Y — twice by default, the second pass from
 * the centre the first found, or once (`holePasses`, as for a hole).
 *
 * The zero is X0 Y0 there; Z is left as it is. The ball ends over the
 * centre, just above the top.
 *
 * `bossSize` is the part's rough width: the ball goes out to half of it and
 * `clear` more, and searches no further in than to where it started.
 */
const mid = (seen, axis, n) => (seen[`${axis}${n}a`][axis] + seen[`${axis}${n}b`][axis]) / 2;

// Where the middle is thought to be on `axis` before pass `n`: where the ball started, or the last pass's.
const guess = (seen, axis, n) => (n === 1 ? seen.z[axis] : mid(seen, axis, n - 1));

/** One side: out past it over the top, down beside it, touch moving in, up again. `sign` the side, + or −. */
const side = (axis, n, sign, params) => {
  const key = `${axis}${n}${sign > 0 ? 'a' : 'b'}`;
  const out = params.bossSize / 2 + params.clear;
  return [
    move(`${key}-out`, (here, seen) => ({ [axis]: guess(seen, axis, n) + sign * out })),
    clearDown(`${key}-down`, params.retract + params.depth, params.fast),
    ...touch(axis, -sign, out, key, params),
    move(`${key}-up`, (here, seen) => ({ z: seen.z.z + params.retract })),
  ];
};

const across = (axis, n, params) => [
  ...side(axis, n, 1, params),
  ...side(axis, n, -1, params),
  move(`${axis}${n}-centre`, (here, seen) => ({ [axis]: mid(seen, axis, n) })),
];

const pass = (n, params) => [...across('x', n, params), ...across('y', n, params)];

export default {
  fields: ['bossSize', 'holePasses', 'ballDiameter', 'clear', 'depth', 'maxZ', 'retract', 'fast', 'slow'],
  options: {},
  touches: true,

  check: () => null,

  steps: (params) => [
    ...touch('z', -1, params.maxZ, 'z', params),
    ...pass(1, params),
    ...(params.holePasses === 1 ? [] : pass(2, params)),
  ],

  zero: (params, options, seen) => ({ x: mid(seen, 'x', params.holePasses), y: mid(seen, 'y', params.holePasses) }),

  // The part's size each way, the ball's diameter taken off: what the operator can check.
  found: (params, options, seen) => ({
    x: Math.abs(seen[`x${params.holePasses}a`].x - seen[`x${params.holePasses}b`].x) - params.ballDiameter,
    y: Math.abs(seen[`y${params.holePasses}a`].y - seen[`y${params.holePasses}b`].y) - params.ballDiameter,
  }),
};
