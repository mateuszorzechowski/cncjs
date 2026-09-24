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
 */
const CHANGES_OFFSETS = /\bG10\b|\bG92\b|\$RST\s*=\s*#/i;

/**
 * Whether a line about to go on the wire changes a work offset.
 *
 * Cheap on purpose: this is asked of every line written, including the jog
 * loop's segments at one every ten milliseconds.
 */
export const changesWorkOffsets = (line) => (
  typeof line === 'string' && line.length > 0 && CHANGES_OFFSETS.test(line)
);

export default changesWorkOffsets;
