import { move, touch } from '../moves';

/**
 * The centre of a hole (Mateusz, 2026-10-01): a 3D probe's ball down in the
 * hole, the walls touched across X, then across Y, and the centre half way
 * between each pair. The ball's radius is on both sides of a pair, so it
 * falls out of the centre and need not be known.
 *
 * Two passes by default, as the common senders do: the first finds the
 * centre from wherever the tool stood, the second touches again from there,
 * square to the walls, so a start well off the axis costs nothing. One pass
 * (`holePasses`, Mateusz, 2026-10-01) is enough in theory — the middle of
 * any chord of a circle is on its centre line — and takes half the time,
 * but a start far off the centre touches the walls at a slant. The zero is X0 Y0 there; Z is left as it
 * is — the top is measured by a plate or the paper. The tool ends at the
 * centre, still in the hole.
 *
 * `holeSize` is the hole's rough diameter: each search goes no further than
 * that from where it starts, the fence for a hole not found.
 */
const across = (axis, pass, params) => {
  const near = `${axis}${pass}a`;
  const far = `${axis}${pass}b`;
  return [
    ...touch(axis, 1, params.holeSize, near, params),
    ...touch(axis, -1, params.holeSize, far, params),
    move(`${axis}${pass}-centre`, (here, seen) => ({ [axis]: (seen[near][axis] + seen[far][axis]) / 2 })),
  ];
};

const pass = (n, params) => [...across('x', n, params), ...across('y', n, params)];

// The last pass's touches are the ones that count.
const centre = (seen, axis, n) => (seen[`${axis}${n}a`][axis] + seen[`${axis}${n}b`][axis]) / 2;

export default {
  fields: ['holeSize', 'holePasses', 'ballDiameter', 'retract', 'fast', 'slow'],
  options: {},
  touches: true,

  check: () => null,

  steps: (params) => (params.holePasses === 1 ? pass(1, params) : [...pass(1, params), ...pass(2, params)]),

  zero: (params, options, seen) => ({ x: centre(seen, 'x', params.holePasses), y: centre(seen, 'y', params.holePasses) }),

  // The hole's size each way, the ball's diameter added back: what the operator can check.
  found: (params, options, seen) => ({
    x: Math.abs(seen[`x${params.holePasses}a`].x - seen[`x${params.holePasses}b`].x) + params.ballDiameter,
    y: Math.abs(seen[`y${params.holePasses}a`].y - seen[`y${params.holePasses}b`].y) + params.ballDiameter,
  }),
};
