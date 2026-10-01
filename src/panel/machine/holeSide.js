/**
 * The hole seen from the front (review note, 2026-10-01: *"możesz też dodać
 * rzut z boku do pomiaru otworu"*), as the part's: always along X, Z up, the
 * hole cut through so the ball in it is seen; a way along Y goes into the
 * drawing, larger nearer the front, smaller further back. On the way into
 * place it comes down from over the work to a few millimetres under the
 * hole's edge.
 *
 * `move` is the hole's move with the ball's place `at` (and, into place, its
 * `level`: 1 over the work, 0 in the hole); `part` the hole's sizes.
 */

// The height of the ball's bottom over the top: down in the hole, and over the work on the way into place.
const IN_HOLE = -30;
const OVER = 40;
const NEARER = 0.3;

export const holeSide = (move, p, {
  say = (field, text) => text, texts = {}, focus = null,
} = {}, part) => {
  const [x, y] = move.at;
  const level = move.level ?? 0;
  const h = IN_HOLE + (OVER - IN_HOLE) * level;
  const r = part.toolR * (1 - NEARER * Math.max(-1, Math.min(1, y / part.r)));
  const said = (field) => say(field, texts[field] ?? '');
  let motion = null;
  let contact = null;
  let gap = null;
  if (move.kind === 'place') {
    // Down in the hole, a few millimetres under its edge — said as the Z plate says it.
    gap = level < 0.01 ? { at: x + r + 12, from: 0, to: h + 2 * r, key: 'probe.position.few' } : null;
  } else if (move.kind === 'touch') {
    const flat = move.axis === 'x';
    if (flat && p > part.fast[0] && p < part.fast[1]) {
      motion = {
        dir: 'h', at: h, from: move.from[0], to: move.wall[0], kind: 'probe', text: said('fast'), lit: focus === 'feed',
      };
    } else if (flat && p > part.slow[0] && p < part.slow[1]) {
      motion = {
        dir: 'h', at: h, from: move.wall[0] - move.sign * part.back, to: move.wall[0], kind: 'probe', text: said('slow'), lit: focus === 'feed',
      };
    }
    if (Math.hypot(x - move.wall[0], y - move.wall[1]) < 0.5) {
      // Across X the touch is at the ball's side; along Y it faces into the drawing, at its middle.
      contact = [flat ? x + move.sign * r : x, h + r];
    }
  } else if (move.kind === 'centre' && move.axis === 'x' && p > 0.15 && p < 0.6) {
    motion = {
      dir: 'h', at: h, from: move.from[0], to: move.to[0], kind: 'rapid',
    };
  }
  return {
    along: x,
    r,
    h,
    motion,
    gap,
    contact,
    zero: move.zeroAt ? Math.max(0, Math.min(1, (p - move.zeroAt[0]) / (move.zeroAt[1] - move.zeroAt[0]))) : 0,
  };
};
