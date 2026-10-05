import { clearDown, move, touch } from '../moves';

/**
 * A part's moves across one axis, from outside, for Pomiar (`size`;
 * Mateusz, 2026-10-01; #662 upstream): for each side in turn the ball goes
 * out past it over the top by `clear`, down by `depth` below the top found
 * first (`z`, his pick "b"), touches the side moving in, and rises again;
 * then to the middle of the pair. The second pass starts from the middle
 * the first found.
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

export const across = (axis, n, params) => [
  ...side(axis, n, 1, params),
  ...side(axis, n, -1, params),
  move(`${axis}${n}-centre`, (here, seen) => ({ [axis]: mid(seen, axis, n) })),
];
