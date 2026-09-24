import controller from './controller';

/**
 * How long the hold is given to take effect before the reset lands.
 *
 * Too short and the reset arrives while the axes are still decelerating, which
 * is the same as not holding at all; too long and an operator who has just hit
 * the big red button watches the tool keep moving. Grbl decelerates a feed hold
 * at the axis rates in `$120`-`$122`, so the right value is a property of the
 * machine.
 *
 * **Measured for a jog on 2026-09-24, and 500 is generous there.** A feed hold
 * during a jog is a jog cancel: 63ms to a standstill and 0.8mm at 600 mm/min,
 * ending in `Idle`. The whole press now costs 0.988mm, so by the time the reset
 * goes out the machine has been still for most of half a second.
 *
 * **Still not measured for a program at feed rate, which is the case this
 * number is really for** — and that case is the one where the hold is a real
 * `Hold` that `~` would resume, so the reset arriving is what makes the press a
 * stop. Time a hold from a rapid once the mechanics are attached. The server
 * side of this is in `src/panel/server-backlog.md`.
 */
const HOLD_BEFORE_RESET = 500;

/**
 * The big red button. Feed hold first, soft reset after.
 *
 * Reset alone stops just as fast but stops by abandoning the motion planner:
 * on a machine at feed rate that is a stop with unknown position afterwards.
 * A hold alone is recoverable and therefore not a stop at all — Cycle Start
 * resumes it. Chosen by Mateusz on 2026-09-20.
 */
export const emergencyStop = () => {
  controller.command('feedhold');
  setTimeout(() => {
    controller.command('reset');
  }, HOLD_BEFORE_RESET);
};

export default emergencyStop;
