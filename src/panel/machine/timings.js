/**
 * How long each part of this installation takes, as one reading.
 *
 * The status sheet already answers *which* of the things between an operator
 * and a machine is missing — the server, the port, the machine. This answers
 * the other half of the same question: **how fast each of them is**, on this
 * particular set of hardware and this particular network.
 *
 * Nothing here is a constant, and that is the point. The same cncjs runs on a
 * mini PC bolted beside a spindle with the pendant on a phone across a
 * workshop, and on one laptop doing everything. The numbers differ by an order
 * of magnitude between those, and an operator who cannot see their own has no
 * way to tell a slow link from a busy computer from a slow cable.
 *
 * **Every figure here is measured by whoever is in a position to measure it.**
 * The server times its own clock while it jogs and the firmware's replies over
 * the cable; the panel times the link and its own beat. Nothing is estimated
 * and nothing is a default, which is why every one of them can be null —
 * "not measured yet" is a different answer from "nothing", and saying zero
 * for either would be a figure dressed up as a finding.
 */

/**
 * Below this, the link is not worth a line of its own, in milliseconds.
 *
 * A server on this computer measures as a fraction of a millisecond, and
 * rounding that up to `1 ms to the server` is noise dressed up as a finding.
 * The common case is that the two are the same machine, and a row reading
 * `0 ms` invites somebody to wonder what is wrong with it.
 */
export const LINK_WORTH_SHOWING_MS = 2;

/**
 * A figure in whole milliseconds, or null when there is not one.
 *
 * **Null explicitly, because `Number(null)` is nought.** Every one of these
 * readings is null until the side that owns it has measured — and with the
 * coercion alone, a panel that had never held a jog reported its own worst
 * gap as `0 ms`, which reads as a perfect one. Seen on screen; the unit tests
 * had passed, because they left the field out rather than setting it to null.
 */
const asMs = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
};

/**
 * Every timing worth showing, in milliseconds, with null for anything that has
 * not been measured.
 *
 * @param {object} reading
 * @param {object} reading.timing `{ tickMs, leadMs, ackMs, stopMs }` from the
 *   server, or null before it has said.
 * @param {number} reading.linkMs One way to the server, as the panel measures
 *   it. Null until it has.
 * @param {number} reading.beatMs The worst gap between this panel's own
 *   confirmations of a held jog. Null until it has held one.
 */
export const installationTimings = ({ timing, linkMs, beatMs } = {}) => {
  const link = asMs(linkMs);

  return {
    /** This pendant: the worst it has managed between two confirmations. */
    beatMs: asMs(beatMs),
    /** The link: one way, or null when it has not been timed. */
    linkMs: link,
    /** Whether the link has been timed at all. */
    linkKnown: link !== null,
    /**
     * Whether the link is far enough away to be worth naming.
     *
     * Not the same question as whether it is known. A link that has not been
     * timed and a link that is nought both fail this, and they are different
     * facts: one is "the server is this computer", the other is "nobody has
     * asked yet". A row that said the first while the second was true would be
     * answering for a measurement it did not have.
     */
    linkMatters: link !== null && link >= LINK_WORTH_SHOWING_MS,
    /** The server: how much travel it keeps queued ahead of the machine. */
    leadMs: asMs(timing?.leadMs),
    /** The cable: how long the firmware takes to answer a line. */
    ackMs: asMs(timing?.ackMs),
  };
};

export default installationTimings;
