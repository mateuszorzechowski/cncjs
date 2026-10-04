/**
 * Where this machine can reach, from what its firmware reports.
 *
 * Nothing here is configured. The server has no idea what is on the end of the
 * cable and the only thing that does is the controller, so every number comes
 * out of `$$`.
 *
 * **Its own file because three things need it and they are not all jogs.** The
 * jog clock asks how much room an axis has left before it sends a segment; a
 * travel needs the top of the Z travel to retract to, and needs to know
 * whether a point picked off a drawing is somewhere the machine can go. One
 * derivation, because two would disagree about `$23` on the day somebody
 * changed one of them.
 */

// `$130`/`$131`/`$132` — how far each axis can travel, in millimetres.
const TRAVEL = { x: '$130', y: '$131', z: '$132' };

/**
 * The reachable volume is `[-$13x, 0]` on every axis, whichever end it homes
 * to. That is the source of the "why are my machine coordinates all minus"
 * question, and an envelope taken as `[0, travel]` comes out mirrored through
 * the origin — the right size, in the wrong place, plausible enough to ship.
 *
 * **`$23` does not move it.** The homing direction mask only says which end
 * the switch is at: Grbl 1.1 sets the position after homing to `-pull-off`
 * at the top or `-travel + pull-off` at the bottom, and checks soft limits
 * against `[-travel, 0]` either way. Only a firmware built with
 * `HOMING_FORCE_SET_ORIGIN` puts zero at the bottom. This file used to flip
 * the axis for a set bit; measured on COM3 (Grbl 1.1h), 2026-09-26: with
 * `$23=1` a jog of X+1 from MPos 0 is refused with `error:15`, and X-1 goes.
 */

export const AXES = ['x', 'y', 'z'];

/** One `$`-setting as a number, or null when the firmware has not said. */
export const setting = (settings, name) => {
  const value = Number.parseFloat(settings?.[name]);
  return Number.isFinite(value) ? value : null;
};

/**
 * How far one axis reaches, in machine coordinates.
 *
 * Null when that axis has not reported its travel. Per axis rather than only
 * as a whole box, because a jog along X is not stopped by not knowing about Z.
 */
export const axisRange = (axis, settings) => {
  const travel = setting(settings, TRAVEL[axis]);
  if (travel === null || travel <= 0) {
    return null;
  }

  return { min: -travel, max: 0 };
};

// `$23`: a set bit homes that axis to its minimum.
const HOMES_TO_MIN = { x: 1, y: 2, z: 4 };

/**
 * How far one axis may be driven: its range less the pull-off `$27` at the
 * switch end, or null as `axisRange`.
 *
 * **The switch is at the end of the range, not past it.** Grbl 1.1 sets the
 * position after `$H` so the trigger point is the end of `[-travel, 0]` and
 * the machine stands `$27` inside it — MPos -3 with `$27=3`. A move to the
 * end is a move onto the switch: go-to-zero's retract to `G53 Z0` raised
 * `ALARM:1` on cnc-sim (2026-10-04). The box drawn stays `axisRange`, the
 * machine's own zero (Mateusz: "obwiednia nie pokazywałaby prawdziwego
 * zera"); only what the server sends keeps off the switch.
 */
export const moveRange = (axis, settings) => {
  const range = axisRange(axis, settings);
  if (!range) {
    return null;
  }
  const pullOff = Math.max(0, setting(settings, '$27') || 0);
  return ((setting(settings, '$23') || 0) & HOMES_TO_MIN[axis])
    ? { min: range.min + pullOff, max: range.max }
    : { min: range.min, max: range.max - pullOff };
};

/**
 * Whether the box has a place: `$22`, homing on.
 *
 * Only a homed machine knows where its travel is. Without homing, machine
 * zero is wherever it stood at power-on, and `$130`–`$132` say how big the
 * box is and nothing about where — Grbl itself does not use them then, and
 * will not turn soft limits on. Measured on COM3, 2026-09-28: with `$22=0`
 * MDI drove 100 mm past `$130`, the jog fence refused room the machine had,
 * and a "retract" to machine Z0 went 20 mm down.
 *
 * The weaker half of the answer: `$22=1` says the machine *can* be homed, not
 * that it *has* been. One whose start-up alarm was cleared with `$X` instead
 * of `$H` reports exactly like a homed one, and the firmware offers nothing
 * that separates them. Known gap, written down rather than papered over.
 */
export const placedBy = (settings) => setting(settings, '$22') === 1;

/**
 * The box the machine can reach, in machine coordinates.
 *
 * Null when any axis has not reported its travel: three quarters of an
 * envelope is not an envelope, and a move planned against one would put a wall
 * where there is none.
 *
 * `placed`: whether the box is where it is drawn (`placedBy`). Without it the
 * box is its size only — every fence and every move planned against it is a
 * guess, and each consumer says so rather than acting on it.
 *
 * `fenced`: placed, and the firmware stops a move at its edge (`$20=1`, soft
 * limits). Placed and not fenced, the box is where it is, and MDI or a
 * program can still leave it. The drawings tell the three apart by their
 * line: solid, long dashes, dots (Mateusz, 2026-09-28).
 */
export const machineEnvelope = (settings) => {
  const min = {};
  const max = {};

  for (const axis of AXES) {
    const range = axisRange(axis, settings);
    if (!range) {
      return null;
    }
    min[axis] = range.min;
    max[axis] = range.max;
  }

  const placed = placedBy(settings);
  return { min, max, placed, fenced: placed && setting(settings, '$20') === 1 };
};

/**
 * Where a program leaves the table at the current zero: each axis it goes
 * past, the side, and by how many millimetres — the most first; empty when
 * it fits. `bounds` are the program's, from work zero (`library` analysis),
 * and a machine position is a work position plus `wco`, as Grbl reports it.
 *
 * A program that sets its own coordinate system, moves in `G53` or uses `G92`
 * can land elsewhere — this is the forecast, and the firmware's soft limits
 * stay the fence.
 */
export const programOverrun = (envelope, wco, bounds) => {
  const over = [];
  for (const axis of AXES) {
    const offset = Number(wco?.[axis]) || 0;
    const below = envelope.min[axis] - (bounds.min[axis] + offset);
    const above = (bounds.max[axis] + offset) - envelope.max[axis];
    if (below > 0) {
      over.push({ axis, side: 'min', by: below });
    }
    if (above > 0) {
      over.push({ axis, side: 'max', by: above });
    }
  }
  return over.sort((a, b) => b.by - a.by);
};

export default machineEnvelope;
