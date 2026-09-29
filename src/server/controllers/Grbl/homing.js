/**
 * Whether the machine has been homed since Grbl last lost its position.
 *
 * Grbl offers nothing to ask: after `$H` a machine reports exactly as one
 * that was never homed, and `$22=1` says only that it *can* be (see
 * `envelope.placedBy`). So the server watches for it: a `$H` answered `ok`
 * is a homing, and it holds until the position is lost — an alarm that
 * loses it, or the homing lock Grbl raises after a hard reset.
 *
 * Built for the Bazowanie screen (2026-09-29), which says when the machine
 * was last homed. Nothing is fenced or refused on it yet: whether the
 * envelope may count as placed only after a homing is a question still open
 * with Mateusz (the no-homing fences, 2026-09-28).
 */

// The alarms after which Grbl still knows where it is: a soft limit and the
// two probe failures. The panel's alarm sheet reads the same list.
const KEEPS_POSITION = new Set([2, 4, 5]);

/** A line that starts a homing cycle of the whole machine. */
export const isHomingLine = (line) => String(line).trim().toUpperCase() === '$H';

/** Whether an alarm, by Grbl's number, leaves the position unknown. */
export const losesPosition = (code) => !KEEPS_POSITION.has(code);
