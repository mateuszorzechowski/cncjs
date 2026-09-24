/**
 * How far the machine travels after a jog key is released.
 *
 * The one number an operator has to be able to predict before they put their
 * hand near a spindle, and it is not knowable from the firmware alone. It has
 * three parts and they come from three different places:
 *
 *   - the **lead** the server keeps in the planner, which depends on how
 *     punctual the host computer's timers are and is measured from its own
 *     jogging;
 *   - the **reply** time of the firmware over its cable, measured while
 *     running, because a cancel cannot take effect until the last segment
 *     sent has been acknowledged;
 *   - the machine's own **deceleration**, which is `$120`–`$122` and the feed
 *     rate in use.
 *
 * There is a fourth on an installation where the server is not this
 * computer — a mini PC by the machine, the panel on a laptop — and it is the
 * **link**: releasing a key has to reach the server before anything can be
 * cancelled, and the machine keeps moving meanwhile. On one computer it
 * measures as nothing and changes nothing.
 *
 * The server's two arrive together as milliseconds and are the same whatever
 * anybody is doing. The link and the deceleration are the panel's, because
 * only the panel knows how far away the server is and which feed rate is set
 * on which axis group.
 */

// `$120`/`$121`/`$122` — acceleration, mm/sec².
const ACCELERATION = { x: '$120', y: '$121', z: '$122' };

const setting = (settings, name) => {
  const value = Number.parseFloat(settings?.settings?.[name]);
  return Number.isFinite(value) ? value : null;
};

/**
 * The acceleration that governs a move, in mm/sec².
 *
 * The slowest of the axes involved, because a diagonal stops no faster than
 * its most sluggish part. Null when the machine has not said, in which case
 * there is no honest figure to give.
 */
export const accelerationFor = (axes, settings) => {
  const rates = axes
    .map((axis) => setting(settings, ACCELERATION[axis]))
    .filter((rate) => rate !== null && rate > 0);

  return rates.length ? Math.min(...rates) : null;
};

/**
 * How far the machine goes after the key comes up, in millimetres.
 *
 * `v * t + v² / 2a` — the travel still queued, then the distance spent
 * slowing down. Null when either half is unknown, because half of this
 * number is worse than none of it: it would read as a safety margin that has
 * not been measured.
 *
 * @param {object} timing `{ stopMs }` as measured by the server.
 * @param {number} feedrate mm/min, as set on the panel.
 * @param {number} acceleration mm/sec², from the firmware.
 * @param {number} [linkMs] One-way milliseconds to the server, when it is
 *   somewhere else. Absent and zero mean the same thing here, because a
 *   server on this computer really does cost nothing.
 */
/**
 * How far a stretch of time carries the tool, in millimetres.
 *
 * The half of a stop that is simply travel: the machine is still going at the
 * feed it was given, so every millisecond is `v * dt` and the parts add up.
 * Null rather than nought when either half is unknown, because a distance of
 * nought is a claim.
 */
export const travelDuring = (ms, feedrate) => {
  // Null explicitly, because `Number(null)` is nought and nought here is a
  // claim: "this costs no distance" is a different statement from "nobody has
  // measured this yet". The same coercion put `0 ms` on screen for a pendant
  // that had never held a jog.
  if (ms === null || ms === undefined || !(feedrate > 0)) {
    return null;
  }

  const number = Number(ms);
  return Number.isFinite(number) ? (feedrate / 60) * (number / 1000) : null;
};

/**
 * How far the tool goes while slowing down, in millimetres.
 *
 * `v² / 2a`, and it is the machine's own — `$120`–`$122` and the feed rate in
 * use. It is the part of a stop that no amount of a faster computer or a
 * shorter cable will remove, which is worth being able to see separately from
 * the parts that a better installation does remove.
 */
export const brakingDistance = (feedrate, acceleration) => {
  if (!(feedrate > 0) || !(acceleration > 0)) {
    return null;
  }

  const speed = feedrate / 60;
  return (speed * speed) / (2 * acceleration);
};

export const stoppingDistance = ({ timing, feedrate, acceleration, linkMs = 0 }) => {
  const stopMs = Number(timing?.stopMs);
  const link = Number.isFinite(Number(linkMs)) ? Number(linkMs) : 0;

  if (!Number.isFinite(stopMs) || !(feedrate > 0) || !(acceleration > 0)) {
    return null;
  }

  return travelDuring(stopMs + link, feedrate) + brakingDistance(feedrate, acceleration);
};

/**
 * The same figure, from what a screen actually has in its hands.
 *
 * A view holds the controller's settings and the axes a control moves, not an
 * acceleration; composing the two at the call site is how the **link came to
 * be left out of the millimetres while the sentence beside them counted it**.
 * One entry point that takes everything and forgets nothing.
 */
export const stoppingDistanceFor = ({ timing, settings, feedrate, axes, linkMs }) => (
  stoppingDistance({
    timing,
    feedrate,
    acceleration: accelerationFor(axes, settings),
    linkMs,
  })
);

export default stoppingDistance;
