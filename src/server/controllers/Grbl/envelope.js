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
 * `$23` — the homing direction invert mask, and the setting that decides which
 * side of zero the machine lives on.
 *
 * Grbl homes toward the positive end by default and puts machine zero there,
 * so the reachable volume is *negative*: `[-$130, 0]`. That is the source of
 * the "why are my machine coordinates all minus" question, and it is also why
 * an envelope taken as `[0, travel]` comes out mirrored through the origin —
 * the right size, in the wrong place, which looks plausible enough to ship.
 *
 * A set bit flips that axis to home at the negative end, putting zero at the
 * minimum and the volume in `[0, $13x]`. One bit per axis, in X, Y, Z order.
 */
const INVERT_MASK = '$23';
const INVERT_BIT = { x: 1, y: 2, z: 4 };

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

  const mask = setting(settings, INVERT_MASK) || 0;
  const homesToMinimum = (mask & INVERT_BIT[axis]) !== 0;

  return homesToMinimum ? { min: 0, max: travel } : { min: -travel, max: 0 };
};

/**
 * The box the machine can reach, in machine coordinates.
 *
 * Null when any axis has not reported its travel: three quarters of an
 * envelope is not an envelope, and a move planned against one would put a wall
 * where there is none.
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

  return { min, max };
};

export default machineEnvelope;
