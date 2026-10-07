import { move, touch } from '../moves';

/**
 * A hole's moves across one axis, for Pomiar (`size`; Mateusz, 2026-10-01):
 * the 3D probe's ball down in the hole touches the wall one way, then the
 * other, and goes to the middle of the two. The ball's radius is on both
 * sides of a pair, so it falls out of the middle.
 *
 * `holeSize` is the hole's rough width: each search goes no further than
 * that from where it starts, the fence for a hole not found.
 */
export const across = (axis, pass, params) => {
  const near = `${axis}${pass}a`;
  const far = `${axis}${pass}b`;
  return [
    ...touch(axis, 1, params.holeSize, near, params),
    ...touch(axis, -1, params.holeSize, far, params),
    move(`${axis}${pass}-centre`, (here, seen) => ({ [axis]: (seen[near][axis] + seen[far][axis]) / 2 })),
  ];
};
