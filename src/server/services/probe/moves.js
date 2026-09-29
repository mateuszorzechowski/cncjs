/**
 * The pieces a probing method is built from.
 *
 * A step says where the tool goes, in **machine** coordinates, and how: a
 * plain move (`move`), a probe that must touch (`touch`, `G38.2`) or a
 * descent that must not (`clear`, `G38.3`). Where it goes is worked out when
 * the step comes up, from `here` — where the tool stands now — and `seen`,
 * the touches kept so far by name. Turning a step into a line is the runner's
 * job; the methods know geometry and nothing about the wire.
 *
 * Absolute targets rather than `G91`, so a probe that fails into an alarm
 * does not leave the parser in relative mode for whatever is typed after the
 * unlock.
 */

/** A plain move to wherever `to(here, seen)` says. */
export const move = (phase, to) => ({ kind: 'move', phase, to });

/**
 * Down onto the side of a plate without touching the top of it: `G38.3`
 * stops on contact without an alarm, and contact here means the tool came
 * down on the plate rather than beside it — too little `clear`.
 */
export const clearDown = (phase, distance, feed) => ({
  kind: 'clear',
  phase,
  feed,
  to: (here) => ({ z: here.z - distance }),
});

/**
 * One touch along one axis, the way every probe routine does it: fast to
 * find the surface, back off, slow for the figure that counts, back off
 * again. `sign` is the direction of travel; `max` the furthest the fast
 * touch may go. The slow touch is kept as `key`.
 */
export const touch = (axis, sign, max, key, { retract, fast, slow }) => [
  { kind: 'touch', phase: `${key}-fast`, feed: fast, to: (here) => ({ [axis]: here[axis] + sign * max }) },
  move(`${key}-back`, (here) => ({ [axis]: here[axis] - sign * retract })),
  { kind: 'touch', phase: key, feed: slow, keep: key, to: (here) => ({ [axis]: here[axis] + sign * 2 * retract }) },
  move(`${key}-back`, (here) => ({ [axis]: here[axis] - sign * retract })),
];
