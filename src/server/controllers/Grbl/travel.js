import { machineEnvelope } from './envelope';

/**
 * Going somewhere, without dragging the tool through the work on the way.
 *
 * Two moves an operator asks for by pointing: back to the work zero, and to a
 * point picked off the drawing. Both are Z up first and then across, and both
 * used to be composed in the browser out of `$130`–`$132`, `$23`, `$110` and
 * `$112` — four firmware settings a client had to decode to build a line, and
 * be wrong about in silence when it could not.
 *
 * **`$J=` instead of `G0`, and that is not a detail.** A rapid is in the motion
 * planner the moment it is accepted and the only way out is a feed hold
 * followed by a reset — which stops the machine by abandoning the planner and
 * leaves the position in doubt. Grbl 1.1's jogging command takes `G53` just as
 * `G0` does, leaves the modal state alone, and is called off by `jogCancel`
 * (0x85) with the machine decelerating normally and its position still known.
 *
 * The price is that a jog carries its own feed rate rather than running at the
 * machine's rapid, so it is given the axis maximum the firmware reports — the
 * same speed `G0` would have used.
 */

// `$110`/`$112` — the maximum rate of the axes each move runs on, mm/min.
const MAX_RATE = { xy: '$110', z: '$112' };

/**
 * The feed rate to use when the firmware has not reported one, in mm/min.
 *
 * Fast enough to cross a small machine in a few seconds and slow enough not to
 * surprise anybody standing next to it.
 */
export const RATE_UNKNOWN = 2000;

export const rateFor = (settings, which) => {
  const reported = Number.parseFloat(settings?.[MAX_RATE[which]]);
  return Number.isFinite(reported) && reported > 0 ? reported : RATE_UNKNOWN;
};

/**
 * How many decimals a target is sent with.
 *
 * A cursor lands on a plane at full float precision, and `X-412.38471629` says
 * a great deal more about the mouse than about the machine. Controllers report
 * three decimals; a micron is already finer than anything pointed at with a
 * pointer.
 */
const TARGET_PRECISION = 1e3;

const round = (value) => Math.round(value * TARGET_PRECISION) / TARGET_PRECISION;

/**
 * The line that lifts Z clear before anything moves across.
 *
 * **To the top of the travel, not to `G53 Z0`.** On a Grbl that homes to the
 * maximum — the default, `$23=0` — zero is at the top and those are the same
 * place. On a machine with the Z bit set in `$23`, machine zero is at the
 * *bottom* and `G53 Z0` would be a plunge to the table.
 *
 * `G90` is stated once, on the first line of a travel. `G53` is ignored in
 * relative mode and `G0 X0 Y0` in relative mode means "do not move" — a silent
 * failure that looks like a button that did nothing. Both lines are absolute by
 * nature, so saying so is not a mode change smuggled in: it is the mode this
 * move is.
 */
const retract = (settings, envelope) => (
  `$J=G53 G90 G21 Z${envelope.max.z} F${rateFor(settings, 'z')}`
);

/**
 * Back to the work zero of whichever system is active, Z first.
 *
 * **This is where the panel left the old application behind.** cncjs sends a
 * bare `G0 X0 Y0` — whatever the tool is buried in, it crosses the work at that
 * depth.
 *
 * Null when the firmware has not reported its travel. There is then no known
 * top to retract to, and the move that is left is exactly the one being
 * avoided — so it is refused rather than sent as a `G0 X0 Y0` that looks the
 * same and behaves like the old application.
 */
export const goToWorkZeroLines = (settings) => {
  const envelope = machineEnvelope(settings);
  if (!envelope) {
    return null;
  }

  return [
    retract(settings, envelope),
    `$J=G90 G21 X0 Y0 F${rateFor(settings, 'xy')}`,
  ];
};

/** Whether a machine-coordinate point is somewhere the machine can reach. */
export const insideEnvelope = (envelope, x, y) => (
  x >= envelope.min.x && x <= envelope.max.x &&
  y >= envelope.min.y && y <= envelope.max.y
);

/**
 * Travel to a point picked off the drawing, lifting Z first.
 *
 * **In machine coordinates, because that is the frame the scene is drawn in.**
 * The point comes from a cursor over the grid, and everything on that grid —
 * the envelope, the axes, the toolpath once it has been shifted — is machine
 * coordinates. Sending it as work coordinates would land the tool somewhere
 * plausible and wrong by exactly the work offset.
 *
 * Null when the point is outside the machine's own travel, which the caller
 * turns into a refusal with a reason. With soft limits on the firmware would
 * alarm and need a reset; with them off it would drive into a limit switch.
 * Neither is a thing to discover by pointing slightly wide of the bed.
 */
export const goToPointLines = (settings, point) => {
  const envelope = machineEnvelope(settings);
  if (!envelope || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
    return null;
  }

  const x = round(point.x);
  const y = round(point.y);
  if (!insideEnvelope(envelope, x, y)) {
    return null;
  }

  return [
    retract(settings, envelope),
    `$J=G53 G90 G21 X${x} Y${y} F${rateFor(settings, 'xy')}`,
  ];
};

export default goToWorkZeroLines;
