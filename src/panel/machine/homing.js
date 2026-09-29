/**
 * Whether this machine can be sent home, and what happens when it is.
 *
 * **There is no per-axis homing.** The server offers one command, `homing`,
 * with no axis argument, and every controller it supports turns that into a
 * whole-machine move: `$H` for Grbl and Smoothie, `G28` for Marlin,
 * `G28.2 X0 Y0 Z0` for TinyG. A panel with "home XY" and "home Z" keys was
 * drawing two controls the server cannot carry.
 *
 * Whether it is *allowed* is a fact about the machine, not a preference. On
 * Grbl and Smoothie `$22` says whether homing is enabled, which is to say
 * whether there are limit switches wired and turned on. With `$22=0` the
 * firmware answers `error:5` and moves nothing — safe, but a button that
 * cannot work should not look like one that can.
 *
 * For Marlin and TinyG the panel has no equivalent reading, so it does not
 * claim to know: the button is offered and the firmware refuses if it cannot.
 * That is the honest position rather than a guess in either direction, and it
 * is written down here so the next person does not have to infer it.
 */
const HOMING_ENABLED = '$22';

export const canHome = (type, settings) => {
  if (!type) {
    return false;
  }

  const values = settings?.settings;
  const flag = values?.[HOMING_ENABLED];

  // Grbl and Smoothie say so outright. Anything else has not told us, and the
  // firmware is the one that decides.
  if (flag === undefined) {
    return true;
  }

  return String(flag).trim() !== '0';
};

/**
 * Send the machine home.
 *
 * Every axis, because that is the only homing the server has. It is a real
 * move at the firmware's own homing feed rate, so nothing here should call it
 * without a deliberate press.
 */
export const home = (controller) => controller.command('homing');

export default canHome;

/**
 * What the Bazowanie screen says about the machine's homing, as a key and a
 * tone. The server decides the facts — whether homing is on at all
 * (`envelope.placed`, from `$22`) and when a `$H` last succeeded (`homedAt`,
 * forgotten when the position is lost); this only picks the sentence.
 *
 * `lock` is the homing lock of a hard reset: an alarm with no number.
 */
export const homingState = ({ connected, placed, homedAt, lock }) => {
  if (!connected) {
    return { key: 'homing.state.unknown', tone: null };
  }
  if (placed === false) {
    return { key: 'homing.state.off', tone: 'warn' };
  }
  if (homedAt) {
    return { key: 'homing.state.homed', tone: null };
  }
  if (lock) {
    return { key: 'homing.state.lock', tone: 'warn' };
  }
  return { key: 'homing.state.not', tone: 'warn' };
};

/** The settings a homing cycle runs by, in the order it uses them. */
export const HOMING_FACTS = ['$25', '$24', '$27'];
