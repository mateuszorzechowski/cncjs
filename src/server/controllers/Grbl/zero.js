/**
 * Setting the work zero, composed on the side that knows which one it is.
 *
 * `G10 L20` moves nothing. It rewrites the offset between machine coordinates
 * and work coordinates so that where the tool is *now* reads as zero — which
 * is what an operator means by "zero it here" after jogging onto the corner of
 * the stock.
 *
 * **It was composed in the browser, and that is what moved.** A panel that
 * builds `G10 L20 P<n>` has to know which coordinate system the machine is
 * working in, which it can only learn by watching the state this side already
 * has — and if it gets it wrong the wrong system is written, silently, to be
 * discovered by a tool moving to the wrong place under power. The command that
 * crosses the socket is now the intention, `zero({ axes })`, and the line is
 * built here.
 */

/**
 * Which `P` number a coordinate system is.
 *
 * `n` is not a free choice: it has to be the system the machine is currently
 * working in. There is no default in here on purpose — a fallback to `P1`
 * would be a guess that looks exactly like an answer.
 */
const WCS_TO_P = {
  G54: 1,
  G55: 2,
  G56: 3,
  G57: 4,
  G58: 5,
  G59: 6,
};

/** The `P` number of the active system, or 0 when the machine has not said. */
export const activeWcsNumber = (modal = {}) => WCS_TO_P[modal.wcs] || 0;

/**
 * The one line that sets some axes to zero, or null when it cannot be built.
 *
 * Null for an unknown coordinate system and null for an empty set of axes.
 * Both are the caller's to turn into a refusal with a reason; returning a line
 * that does nothing would be the same silence this replaces.
 */
export const zeroLine = ({ modal, axes }) => {
  const p = activeWcsNumber(modal);
  const wanted = (axes || []).filter((axis) => typeof axis === 'string' && axis.trim());

  if (!p || !wanted.length) {
    return null;
  }

  const words = wanted.map((axis) => `${axis.toUpperCase().trim()}0`).join(' ');
  return `G10 L20 P${p} ${words}`;
};

export default zeroLine;
