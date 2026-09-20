import controller from 'app/lib/controller';

/**
 * How long the hold is given to take effect before the reset lands.
 *
 * NOT MEASURED. It is a deliberate guess, and it is the one number in this
 * file that wants checking against a real machine: too short and the reset
 * arrives while the axes are still decelerating, which is the same as not
 * holding at all; too long and an operator who has just hit the big red button
 * is watching the tool keep moving.
 *
 * Grbl decelerates a feed hold at the axis deceleration from `$120`-`$122`, so
 * the right value is a property of the machine rather than of the interface.
 * When the mechanics are attached, time a hold from a rapid and set this from
 * what is seen.
 */
const HOLD_BEFORE_RESET = 500;

/**
 * The big red button.
 *
 * Feed hold first, soft reset after. The hold brings the axes down under
 * controlled deceleration — the planner is respected, so nothing is lost to a
 * skipped step — and the reset then aborts the job outright rather than
 * leaving a machine paused mid-cut with a spindle down in the work.
 *
 * Reset alone was the old behaviour and it stops just as fast, but it stops by
 * abandoning the motion planner: on a machine at feed rate that is a stop with
 * unknown position afterwards. Hold alone is recoverable and therefore not a
 * stop at all — it is a pause, and Cycle Start resumes it.
 *
 * Chosen by Mateusz on 2026-09-20, over reset alone and over feed hold alone.
 */
export const emergencyStop = () => {
  controller.command('feedhold');
  setTimeout(() => {
    controller.command('reset');
  }, HOLD_BEFORE_RESET);
};

export default emergencyStop;
