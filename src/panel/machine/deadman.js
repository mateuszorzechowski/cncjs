/**
 * Saying "the key is still down", and working out how long a gap between
 * those is bearable.
 *
 * A held jog is the one command with no end of its own, and the client is the
 * only thing that ends it. **Measured 2026-09-24: a wedged client held one for
 * 15.8 seconds and 166mm at 600 mm/min**, and the only thing that stopped it
 * was the axis running out of travel.
 *
 * So the panel confirms the hold on a rhythm, and the server ends the jog when
 * a confirmation is late by more than the panel said it could be.
 *
 * **The tolerance is the panel's to declare, because the panel is the side
 * that knows.** How punctual a browser timer is depends on the browser and on
 * what else that computer is doing — a 3D scene renders beside this one — and
 * how long a beat takes to arrive depends on the link, which this panel
 * measures already for its stopping distance. The server knows neither, and
 * clamps what it is told rather than guessing.
 */

/**
 * How often the hold is confirmed, in milliseconds.
 *
 * It costs one tiny frame each way on a socket that is already carrying a
 * status report every 100ms, so the rate is chosen for the tolerance it buys
 * rather than to spare the link: the tolerance is two beats, so a slower beat
 * is a longer run-on after a client wedges.
 */
export const BEAT_MS = 100;

/**
 * The tolerance to declare before this browser has measured itself.
 *
 * **Stated, not measured — the same choice `LEAD_START_SECONDS` makes on the
 * server, and for the same reason.** A figure taken from the first beat or two
 * of the first jog of a session would be a measurement of a browser that has
 * just finished loading a page, which is the least typical moment of its life,
 * and a wrong number that looks measured is worse than a stated one.
 *
 * Four hundred milliseconds is above the server's floor and two beats clear of
 * the rhythm, and it holds for one jog.
 *
 * What it has to cover, measured on this laptop: a 100ms timer inside the jog
 * screen ran 95ms apart typically and 111ms at its worst, whether the scene
 * was sitting still or being dragged under a finger. A backgrounded tab throttles
 * far worse than that and does not matter, because `useHoldToJog` releases the
 * key on `blur` — a hold cannot survive the page going away.
 */
export const TOLERANCE_START_MS = 400;

/**
 * How many gaps to remember.
 *
 * Two hundred beats is about twenty seconds of jogging, so the figure follows
 * the browser as it is now — a tab that has since had the scene opened in it,
 * a phone that has since been put in a pocket.
 */
const KEEP_GAPS = 200;

/**
 * The worst gap seen recently, in milliseconds, and the gaps it is taken from.
 *
 * **The server's `tick-jitter` is not reused here, and that is the second
 * answer to the same question.** It summarises a distribution — a median, a
 * 99th percentile — because the jog lead is sized on a percentile and the tail
 * is warned about separately. The worst of a window is one `Math.max`, and
 * reaching across for a summariser to take one field of it would have meant
 * moving that module into `src/lib` — where the server build does not look:
 * `build-dev.sh` transpiles `src/server` and nothing else, so the packaged
 * server would have started missing a file that every jog reads.
 */
let gaps = [];

/**
 * How long a gap to ask to be tolerated, in milliseconds.
 *
 * **From the worst gap seen, not the typical one** — and that is the opposite
 * of the choice the jog lead makes from the same machinery, deliberately. A
 * lead sized too large costs stopping distance on every single jog, so it is
 * sized on a percentile and the tail is warned about instead. A tolerance
 * sized too large costs only the difference between catching a wedged client
 * in four hundred milliseconds and catching it in six hundred, while one sized
 * too small cuts off a jog nobody let go of — which teaches an operator to
 * distrust the pad, and a distrusted pad is a worse safety failure than the
 * one this is for.
 *
 * Twice the worst, plus the link: one beat's worth so a single late beat is
 * survivable and two in a row are not, and the crossing because a beat has to
 * get there before it counts.
 */
export const toleranceMsFor = ({ worstGapMs, linkMs = 0 }) => {
  if (!(worstGapMs > 0)) {
    return TOLERANCE_START_MS;
  }

  return Math.round(2 * (worstGapMs + (linkMs || 0)));
};

/**
 * What this browser has earned, from the beats it has actually managed.
 *
 * `linkMs` is null until the link has been timed, which reads as nothing
 * rather than as a guess — this computer is the usual case and there the
 * answer really is nothing.
 */
export const jogToleranceMs = (linkMs) => toleranceMsFor({
  worstGapMs: worstBeatMs() ?? 0,
  linkMs,
});

/**
 * The worst gap between two confirmations this panel has managed, or null.
 *
 * The same figure `jogToleranceMs` is built from, exposed because it is worth
 * showing: it is this pendant's own contribution to how far a machine travels
 * after the page it is being driven from stops responding.
 */
export const worstBeatMs = () => (gaps.length ? Math.max(...gaps) : null);

/** Take note of a gap between two beats. */
export const observeBeatGap = (gapMs) => {
  if (!(gapMs > 0)) {
    return;
  }

  gaps = [...gaps, gapMs].slice(-KEEP_GAPS);
};
