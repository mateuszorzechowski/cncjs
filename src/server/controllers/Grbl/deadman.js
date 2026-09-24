/**
 * Ending a held jog whose client has stopped being able to let go.
 *
 * A continuous jog is the one command on this server with no end of its own.
 * Everything else is bounded — a step is a distance, a travel is a point, a
 * program is a file — but a hold runs until the client that started it says
 * stop, and a client that has wedged never will. `removeConnection` covers
 * the client that *goes*; it does not cover the one that stays connected and
 * stops responding, because the socket is still open and socket.io takes up
 * to its ping timeout to think otherwise.
 *
 * **Measured, 2026-09-24: a wedged client held a jog for 15.8 seconds and
 * 166mm at 600 mm/min.** The only thing that stopped it was the axis running
 * out of travel. On a machine with mechanics that is not a defect, it is a
 * crash.
 *
 * So a held jog has to be confirmed rather than merely started: the client
 * says "still held" on a rhythm of its own, and a gap longer than it declared
 * it could manage ends the jog the polite way — `stopJog`, which waits for the
 * segments already sent to be acknowledged and then cancels, because the
 * machine is still listening.
 *
 * **Why not the keepalive that already exists.** engine.io's ping cannot be
 * set per link: `schedulePing` reads `this.server.opts` every cycle and the
 * handshake hands every client the same number, so there is one pair of
 * figures for the whole process. The deeper reason is that the cost of being
 * wrong differs. Mistaking "the socket is dead" tears down a session;
 * mistaking "the key is no longer held" costs one more press. Movement safety
 * is not something to hang on a keepalive tuned for sessions — and this is our
 * own protocol, so it is free per connection.
 */

/**
 * The shortest tolerance worth honouring, in milliseconds.
 *
 * Below this the deadman starts cutting off jogs that nobody let go of. A
 * client beats on a timer, that timer is late, and the beat still has to cross
 * the link — so a tolerance near the beat period is a tolerance that expires
 * during ordinary operation, which trains an operator to distrust the pad.
 *
 * **Measured in the panel's own browser**, because that is the load the beat
 * actually runs under: on this laptop a 100ms timer inside the jog screen ran
 * 95ms apart typically and 111ms at its worst, unchanged whether the scene was
 * sitting still or being dragged. Three hundred is nearly three times that
 * worst gap, which is the margin a control surface deserves.
 *
 * It is also what governs on a healthy panel here, since the figure the panel
 * declares from those numbers is smaller. The declaration starts to matter
 * when the link does — see `panel/machine/deadman`.
 */
export const DEADMAN_FLOOR_MS = 300;

/**
 * The longest tolerance worth honouring, in milliseconds.
 *
 * Past this the deadman stops being one. A second of unasked-for travel is
 * 10mm at 600 mm/min and 83mm at 5000, which is the distance this exists to
 * remove rather than to permit; a client that genuinely cannot confirm itself
 * inside a second has a link that should not be driving a spindle.
 */
export const DEADMAN_CEILING_MS = 1000;

/**
 * The tolerance to hold this jog to, or null for no deadman at all.
 *
 * **Declared by the client, because the client is the side that knows.** How
 * punctual its timers are is a property of the browser and of the computer it
 * is running on; how long a beat takes to arrive is a property of the link,
 * which the panel measures for its own stopping distance already. The server
 * knows neither, and a figure it picked would be a guess about somebody
 * else's machine.
 *
 * Clamped, because the declaration is not trusted to be sensible: between a
 * floor that keeps a healthy client from cutting itself off and a ceiling past
 * which this stops being a deadman.
 *
 * **Nothing declared means no deadman, and that is deliberate.** A client that
 * has not been taught to confirm a jog would otherwise have every hold cut
 * short by a rule it has never heard of — the old application, a script, a
 * third-party pendant. The safety is the panel's to opt into, and what a
 * client that opts out is left with is the travel limit, which is what
 * everybody had before this existed.
 */
export const deadmanMsFor = (declared) => {
  if (!(declared > 0)) {
    return null;
  }

  return Math.min(DEADMAN_CEILING_MS, Math.max(DEADMAN_FLOOR_MS, declared));
};

/**
 * Whether this jog has gone unconfirmed for longer than was agreed.
 *
 * False whenever there is no deadman, so a caller does not have to ask twice.
 */
export const isAbandoned = ({ deadmanMs, confirmedAt, now }) => (
  Boolean(deadmanMs) && now - confirmedAt > deadmanMs
);
