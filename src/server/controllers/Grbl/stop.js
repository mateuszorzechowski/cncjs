/**
 * When a stop has landed, and how long it is allowed to take.
 *
 * The big red button is a feed hold followed by a soft reset, and the gap
 * between them is the whole design: a reset on its own stops by abandoning the
 * motion planner, which leaves the position in doubt, and a hold on its own is
 * resumable by Cycle Start and therefore not a stop at all. Chosen by Mateusz
 * on 2026-09-20.
 *
 * **The gap belongs on this side of the socket, and it should be a condition
 * rather than a number.** It was a `setTimeout` in a browser tab: half a
 * second, not measured, and undeliverable if the tab slept or closed in the
 * middle — which on a phone, where timers in the background are throttled to
 * seconds, is the ordinary case rather than the edge one. The side holding the
 * port can do better than wait: it can watch the machine stop and reset the
 * moment it has.
 *
 * So the number here is only a *ceiling* on that wait, and it is worked out
 * from the machine — the feed rate it reports and the acceleration in
 * `$120`-`$122` — rather than picked.
 */

// `$120`/`$121`/`$122` — acceleration, mm/sec².
const ACCELERATION = ['$120', '$121', '$122'];

/**
 * The acceleration that governs how fast this machine can stop, in mm/sec².
 *
 * The slowest axis, because a move along more than one stops no faster than its
 * most sluggish part, and a stop must not be promised sooner than the worst
 * case. Null when the firmware has not said, which the caller answers with a
 * fixed ceiling rather than a guess.
 */
export const slowestAcceleration = (settings) => {
  const rates = ACCELERATION
    .map((name) => Number.parseFloat(settings?.[name]))
    .filter((rate) => Number.isFinite(rate) && rate > 0);

  return rates.length ? Math.min(...rates) : null;
};

/**
 * The least time to allow, in seconds.
 *
 * A stop is not instant even from a standstill: the hold has to reach the
 * firmware and the firmware has to say it arrived, and its status reports come
 * every 100ms, so anything under about that is a deadline that expires before
 * the first evidence could possibly arrive.
 */
export const HOLD_FLOOR_SECONDS = 0.15;

/**
 * The most time to allow, in seconds.
 *
 * Past this something is wrong — a machine that has not reported a standstill
 * in a second is not decelerating, it is not answering — and the reset is the
 * thing to do about that, not more waiting. It is also the old hard-coded half
 * second doubled, so this can only ever be more patient than what it replaces,
 * never less.
 */
export const HOLD_CEILING_SECONDS = 1;

/**
 * How long the machine may take to come to rest after a feed hold, in seconds.
 *
 * `v / a`, plus whatever the answer costs to observe. Grbl decelerates a hold
 * along the programmed path at the axis rate, so the distance does not come
 * into it — only the speed it was doing and how hard it can brake.
 *
 * Clamped both ways, and with no reading at all it is the ceiling: a machine
 * that has not said how fast it was going or how hard it can stop gets the most
 * patience, not the least.
 *
 * @param {number} feedrate mm/min, as the controller reports it.
 * @param {number} acceleration mm/sec², from `slowestAcceleration`.
 * @param {number} [latencySeconds] How stale the evidence may be — one status
 *   query period, because that is the soonest a standstill can be seen.
 */
export const holdSeconds = ({ feedrate, acceleration, latencySeconds = 0 }) => {
  const speed = (Number(feedrate) || 0) / 60;
  const rate = Number(acceleration) || 0;
  const latency = Number(latencySeconds) || 0;

  if (!(speed > 0) || !(rate > 0)) {
    return HOLD_CEILING_SECONDS;
  }

  return Math.min(HOLD_CEILING_SECONDS, Math.max(HOLD_FLOOR_SECONDS, (speed / rate) + latency));
};

/** The three states in which the machine is under way. */
const MOVING = ['Run', 'Jog', 'Home'];

/**
 * Whether the machine has come to rest, from one status report.
 *
 * **`Hold` is two states and only one of them is stopped.** Grbl reports
 * `Hold:1` while it is still decelerating and `Hold:0` once it has finished, so
 * treating the word alone as a standstill would reset the controller mid-brake
 * — which is exactly the failure the gap exists to avoid.
 *
 * Silence is not a standstill. A report that says nothing about the state reads
 * as still moving, so the wait runs to its ceiling and the reset goes out
 * anyway. That is the safe direction: the cost of being wrong here is half a
 * second of patience, and the cost of the other way is a reset into a moving
 * axis.
 *
 * A reported feed rate above zero overrides the word, because a jog that this
 * controller is feeding reports `Jog` with `FS:0` between segments and then
 * `FS:600` again — measured 2026-09-24. Nothing should read that gap as having
 * stopped.
 */
export const hasStopped = ({ activeState, subState, feedrate } = {}) => {
  if (Number(feedrate) > 0) {
    return false;
  }
  if (!activeState || MOVING.includes(activeState)) {
    return false;
  }
  if (activeState === 'Hold') {
    return Number(subState) === 0;
  }

  return true;
};

export default hasStopped;
