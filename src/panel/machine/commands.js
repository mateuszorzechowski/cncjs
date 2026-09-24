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
 * The big red button. Feed hold first, soft reset after.
 *
 * Reset alone stops just as fast but stops by abandoning the motion planner: on
 * a machine at feed rate that is a stop with unknown position afterwards. A hold
 * alone is recoverable and therefore not a stop at all — Cycle Start resumes it.
 * Chosen by Mateusz on 2026-09-20, and unchanged.
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
export const emergencyStop = (type) => {
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
