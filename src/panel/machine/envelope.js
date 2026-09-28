/**
 * Where the machine can reach, and where the work sits inside it.
 *
 * Every outline the toolpath screen draws except the program's own is read
 * out of the firmware rather than configured anywhere. That is deliberate:
 * this panel has no idea what machine it is attached to, and the only source
 * that does is the controller in front of it.
 *
 * All of it is in **machine coordinates**, because that is the one frame
 * every outline shares. Work coordinates move when somebody sets a zero; the
 * machine's own travel does not.
 *
 * **The envelope itself is not in here any more.** Where the machine can
 * reach used to be derived here out of `$130`-`$132` and the mask in `$23` —
 * the same four registers the server reads to bound a jog. Two readings of
 * the numbers somebody else enforces is a drawing that can disagree with the
 * machine, so the server works it out and says so on `controller:envelope` —
 * with whether it has a place (`placed`, homing) and whether the firmware
 * stops a move at its edge (`fenced`, soft limits) beside it.
 * What is left here is what only a drawing needs.
 */

const AXES = ['x', 'y', 'z'];

/**
 * The work coordinate systems the firmware has reported, in machine
 * coordinates.
 *
 * These arrive only in answer to `$#`, which `GrblController.initController`
 * now sends beside `$$` when a port opens — on the server's own channel, so
 * it answers even while the machine is in alarm. Before that nothing asked at
 * all and this was empty on every client.
 *
 * Still empty rather than wrong when a controller has not answered: a
 * coordinate system drawn at a guessed origin is worse than one not drawn.
 */
export const workOrigins = (settings) => {
  const parameters = settings?.parameters || {};

  return ['G54', 'G55', 'G56', 'G57', 'G58', 'G59']
    .map((name) => {
      const value = parameters[name];
      const origin = {};
      for (const axis of AXES) {
        const number = Number.parseFloat(value?.[axis]);
        if (!Number.isFinite(number)) {
          return null;
        }
        origin[axis] = number;
      }
      return { name, origin };
    })
    .filter(Boolean);
};

/**
 * The smallest difference in a work offset that is a difference.
 *
 * Controllers report positions to three decimals, so a tenth of a micron is
 * already two orders below anything a machine can say — and **that is the
 * point**: the offset is a subtraction of two reported numbers, and in binary
 * floating point `-100.000 - -84.164` and `-100.400 - -84.564` do not give
 * the same answer. They differ in the fifteenth digit.
 *
 * Nothing about the machine changes, but the number does, and anything that
 * memoises on it sees a new value four times a second. On the toolpath screen
 * that was a camera that snapped back to the isometric view the moment the
 * machine started moving — measured over 501 reports across one 50mm jog, the
 * offset took three distinct values, all equal to within 1e-14.
 */
const OFFSET_PRECISION = 1e4;

/**
 * The offset between machine and work coordinates, derived rather than read.
 *
 * Grbl reports `WCO:` in its status, but not in every report — it is sent on
 * change and every tenth report otherwise, so a client that waits for one has
 * a window where it has positions in two frames and no way to relate them.
 * The difference between the two positions it *does* send in every report is
 * the same number and is always there.
 */
export const workOffset = (machinePosition, position) => {
  const offset = {};

  for (const axis of AXES) {
    const mpos = machinePosition?.[axis];
    const wpos = position?.[axis];
    if (!Number.isFinite(mpos) || !Number.isFinite(wpos)) {
      return null;
    }
    offset[axis] = Math.round((mpos - wpos) * OFFSET_PRECISION) / OFFSET_PRECISION;
  }

  return offset;
};

export default workOrigins;
