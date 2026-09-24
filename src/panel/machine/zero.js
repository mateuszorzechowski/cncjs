import controller from './controller';

/** The one firmware whose server side composes this itself. */
const GRBL = 'Grbl';

/**
 * Which `P` number the active work coordinate system is.
 *
 * `G10 L20 P<n>` sets the offset of one specific coordinate system, and `n` is
 * not a free choice — it has to be the one the machine is currently working
 * in, or the operator zeroes a coordinate system they are not using and the
 * tool goes somewhere else on the next move.
 *
 * Still read here, after the line moved to the server, and for a different
 * job: greying the buttons out. A button that cannot work must be dark before
 * it is pressed, and a panel that had to send a command to find that out would
 * be asking the machine what its own screen should look like.
 */
const WCS_TO_P = {
  G54: 1,
  G55: 2,
  G56: 3,
  G57: 4,
  G58: 5,
  G59: 6,
};

export const activeWcsNumber = (modal = {}) => WCS_TO_P[modal.wcs] || 0;

/**
 * The line that sets the current position as the work zero for some axes.
 *
 * **Only for a controller whose server side cannot do this itself.** On Grbl
 * the panel sends the intention and the server builds the line — see `zero`
 * below, and `src/server/controllers/Grbl/zero.js`.
 *
 * Returns null rather than guessing when the controller has not said which
 * coordinate system is active. Zeroing the wrong one is worse than not
 * zeroing: it is silent, and it is discovered by a tool moving to the wrong
 * place under power.
 */
export const zeroLine = ({ modal, axes }) => {
  const p = activeWcsNumber(modal);
  if (!p || !axes.length) {
    return null;
  }
  const words = axes.map((axis) => `${axis.toUpperCase()}0`).join(' ');
  return `G10 L20 P${p} ${words}`;
};

/**
 * Set the current position as the work zero for some axes.
 *
 * `G10 L20` moves nothing. It rewrites the offset between machine coordinates
 * and work coordinates so that where the tool is *now* reads as zero — which
 * is what an operator means by "zero it here" after jogging onto the corner of
 * the stock.
 *
 * **What crosses the socket is the intention, not the line.** Composing
 * `G10 L20 P<n>` here meant shadowing a reading the server already has, and
 * being wrong about it in silence: the wrong coordinate system written, or —
 * measured at the machine on 2026-09-23 — the right one written into an
 * alarmed controller, where the server drops the line before the cable and
 * says nothing. The server now refuses with a reason, which is the half a
 * client can never supply for itself.
 *
 * Marlin, Smoothie and TinyG keep the composed line, because their controllers
 * have no `zero` command and giving one to firmware nothing on this bench can
 * exercise would be a control nobody has ever seen work. They are the same
 * line as before, sent the same way.
 */
export const zero = ({ type, modal, axes }) => {
  if (type === GRBL) {
    controller.command('zero', { axes });
    return;
  }

  const line = zeroLine({ modal, axes });
  if (line) {
    controller.command('gcode', line);
  }
};

export default zero;
