/**
 * Which lines make the work offsets this server is holding out of date.
 *
 * `$#` is asked once, when the port opens, and the answer is handed to every
 * client and then kept for ever. It is right until somebody sets a zero —
 * after which the server, the old application and the panel are all drawing a
 * work origin the machine no longer has.
 *
 * **Reading the line rather than trusting the command.** The panel's `zero`
 * arrives as an intention, so that one could be caught where it is composed —
 * but a program on the sender can carry `G10` just as well, and so can a line
 * typed into a console. There is one thing all three have in common, and it is
 * the line on the wire.
 */

/**
 * The words that move a coordinate system.
 *
 * `G10` writes one — `L2` sets it outright, `L20` sets it to where the tool is
 * standing. `G92` is the other kind of offset, applied on top of whichever
 * system is active, and `G92.1` clears it again; both report through `$#` and
 * both are matched by the same word.
 *
 * **Not `G28` or `G30`.** They report through `$#` too, and their positions
 * are set by `G28.1` and `G30.1` — but a bare `G28` is an ordinary "go home"
 * that changes nothing, and it is the form that appears in programs. Matching
 * the word would mean a re-read after every homing move in every job. The
 * `.1` forms are rare enough to be worth missing rather than worth paying for
 * on every line; a port re-open picks them up.
 *
 * `$RST=#` wipes every offset back to zero, which is the one operator action
 * that changes all of them at once.
 *
 * **`G43.1` and `G49` too.** They set and clear the tool length offset, which
 * `$#` reports as `TLO` and a probe's zero is written net of (audit
 * 2026-10-05, K3: the tool-change routine sends `G43.1`, and the zero then came
 * out off by the whole offset). Matched with or without a space after the
 * word — Grbl takes `G10L2P1` as readily as `G10 L2 P1`.
 */
const CHANGES_OFFSETS = /\bG(?:10|92(?:\.[12])?|43\.1|49)(?![\d.])|\$RST\s*=\s*#/i;

/**
 * Whether a line about to go on the wire changes a work offset.
 *
 * Cheap on purpose: this is asked of every line written, including the jog
 * loop's segments at one every ten milliseconds.
 */
export const changesWorkOffsets = (line) => (
  typeof line === 'string' && line.length > 0 && CHANGES_OFFSETS.test(line)
);

/**
 * The offsets whose every change the journal keeps: the six coordinate
 * systems, the two stored positions and `G92`.
 */
export const JOURNALED = new Set(['G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G28', 'G30', 'G92']);

/**
 * What changed between two readings of one offset, for the journal — the
 * axes that moved, and their values before and after as Grbl reported them
 * (review, 2026-09-29: an offset zeroed from a phone left no trace of what it
 * had been). Null for the first reading, which is where the port started,
 * and for a reading that changed nothing.
 */
export const offsetChange = (from, to) => {
  if (!from || !to) {
    return null;
  }
  const axes = Object.keys(to).filter((axis) => Number(from[axis]) !== Number(to[axis]));
  if (!axes.length) {
    return null;
  }
  return {
    axes: axes.map((axis) => axis.toUpperCase()).join(' '),
    from: axes.map((axis) => from[axis]).join(' · '),
    to: axes.map((axis) => to[axis]).join(' · '),
  };
};

export default changesWorkOffsets;
