import controller from './controller';

/** The one firmware whose server side can stop the machine by itself. */
const GRBL = 'Grbl';

/**
 * How long the hold is given to take effect before the reset lands.
 *
 * **Only for a controller whose server side cannot do this itself.** On Grbl the
 * gap is no longer a number at all: `estop` holds, watches the status report
 * until the axes have actually stopped, and resets then — see
 * `src/server/controllers/Grbl/stop.js`.
 *
 * NOT MEASURED, and it cannot be from here. Too short and the reset arrives
 * while the axes are still decelerating, which is the same as not holding at
 * all; too long and an operator who has just hit the big red button watches the
 * tool keep moving. The right value is `v / a` — the speed in use over the
 * acceleration the firmware was configured with — and both of those live on the
 * side holding the port. Which is the argument for `estop` rather than for a
 * better constant here.
 */
const HOLD_BEFORE_RESET = 500;

/**
 * The big red button: stop now, whatever it costs.
 *
 * A soft reset and nothing before it. Grbl cuts the step pulses and the
 * spindle the moment the byte lands — a feed hold would leave the spindle
 * turning through the whole deceleration, which is the wrong thing to be
 * doing when this button is the one being hit. The price is the position:
 * reset in motion is ALARM:3, and the machine has to be homed again.
 *
 * **Category 0 in IEC 60204-1 terms, and not a safety device.** It travels
 * through a browser, a network, a server and a USB cable; a hardware stop in
 * the drive and spindle supply is the only one that works when any of those
 * does not. Decided by Mateusz on 2026-09-24, replacing his own "hold first"
 * of 2026-09-20 for this button — that stop lives on as `controlledStop`,
 * under the job's own Stop and Abort.
 *
 * Every firmware the server drives has a `reset`, and it is the same
 * command for all of them.
 */
export const emergencyStop = () => {
  controller.command('reset');
};

/**
 * The job's own Stop and Abort. Feed hold first, soft reset after.
 *
 * Reset alone stops by abandoning the motion planner: on a machine at feed
 * rate that is a stop with unknown position afterwards. Holding first keeps
 * the position, so the job can be set up again without homing. A hold alone
 * is recoverable and therefore not a stop at all — Cycle Start resumes it.
 * Chosen by Mateusz on 2026-09-20 for the big button; since 2026-09-24 it is
 * the operational stop and the big button is `emergencyStop`.
 *
 * **What changed on 2026-09-24 is who counts the gap.** It was a `setTimeout`
 * here, which meant the second half of a safety control was undeliverable if the
 * tab slept, closed or lost the link inside it — and this panel is installed as
 * an application on a phone, where background timers are throttled to seconds.
 * On Grbl the whole sequence is now one `estop` command: the server holds, waits
 * for the machine to report a standstill, and resets then, so nothing about the
 * press depends on this page still being alive. It is also faster, because a
 * machine that stops in 130ms no longer waits out half a second.
 *
 * Marlin, Smoothie and TinyG keep the two-step, because their controllers have
 * no `estop` and inventing one for firmware nothing on this bench can exercise
 * would be a stop nobody has ever seen work. They are the same two commands as
 * before, sent the same way.
 *
 * @param {string} type The controller type, from `machine.type`.
 */
export const controlledStop = (type) => {
  if (type === GRBL) {
    controller.command('estop');
    return;
  }

  controller.command('feedhold');
  setTimeout(() => {
    controller.command('reset');
  }, HOLD_BEFORE_RESET);
};

export default emergencyStop;

/**
 * Put a library file through the controller's check mode, `$C` — to the end,
 * or to the first error. The server reads the file and keeps the result with
 * it; see `ui/CheckButton` for the question asked first.
 */
export const checkFile = (name, { firstError = false } = {}) => {
  controller.command('file:check', { name, firstError });
};

/**
 * One of Grbl's `$` settings, into its EEPROM, through the server:
 * `{ name, value, units }`, `units` the server's unit the value was shown in.
 * The server converts, checks, writes and reads `$$` back; the answer is the
 * new value in `machine:settings`, or a refusal.
 */
export const writeSetting = ({ name, value, units }) => {
  controller.command('settings:write', { name, value, units });
};

/** Take the loaded program off the controller — the Pliki screen's way back out of LOAD. */
export const unloadProgram = () => {
  controller.command('gcode:unload');
};
