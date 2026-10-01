import { move, touch } from '../moves';

/**
 * The centre of a hole (Mateusz, 2026-10-01): the tool — or a probe tip —
 * down in the hole, the walls touched across X, then across Y, and the
 * centre half way between each pair. The tool's radius is on both sides
 * of a pair, so it falls out of the centre and need not be known.
 *
 * Two passes, as the common senders do: the first finds the centre from
 * wherever the tool stood, the second touches again from there, so a start
 * well off the axis costs nothing. The zero is X0 Y0 there; Z is left as it
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

const centre = (seen, axis) => (seen[`${axis}2a`][axis] + seen[`${axis}2b`][axis]) / 2;

export default {
  fields: ['holeSize', 'toolDiameter', 'retract', 'fast', 'slow'],
  options: {},
  touches: true,

  check: () => null,

  steps: (params) => [...pass(1, params), ...pass(2, params)],

  zero: (params, options, seen) => ({ x: centre(seen, 'x'), y: centre(seen, 'y') }),

  // The hole's size each way, the tool's diameter added back: what the operator can check.
  found: (params, options, seen) => ({
    x: Math.abs(seen.x2a.x - seen.x2b.x) + params.toolDiameter,
    y: Math.abs(seen.y2a.y - seen.y2b.y) + params.toolDiameter,
  }),
};
