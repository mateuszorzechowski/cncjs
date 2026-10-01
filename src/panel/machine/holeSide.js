/**
 * The hole seen from the front (review note, 2026-10-01: *"możesz też dodać
 * rzut z boku do pomiaru otworu"*), as the part's: always along X, Z up, the
 * hole cut through so the ball in it is seen; a way along Y goes into the
 * drawing, larger nearer the front, smaller further back. On the way into
 * place it comes down from over the work to a few millimetres under the
 * hole's edge.
 *
 * `move` is the hole's step with the ball's place `at` (and, into place, its
 * `level`: 1 over the work, 0 in the hole), `going` whether it is on its way;
 * `part` the hole's sizes.
 */

// The height of the ball's bottom over the top: down in the hole, and over the work on the way into place.
const IN_HOLE = -30;
const OVER = 40;
const NEARER = 0.3;

// What each step across X draws: its arrow's kind, where it goes from and to, and the figure on it.
const ARROWS = {
  fast: (move) => ['probe', move.from, move.wall, 'fast', 'feed'],
  back: (move) => ['rapid', move.wall, move.off, null, null],
  slow: (move) => ['probe', move.off, move.wall, 'slow', 'feed'],
  centre: (move) => ['rapid', move.from, move.to, null, null],
};

export const holeSide = (move, p, {
  say = (field, text) => text, texts = {}, focus = null,
} = {}, part) => {
  const [x, y] = move.at;
  const level = move.level ?? 0;
  const h = IN_HOLE + (OVER - IN_HOLE) * level;
  const r = part.toolR * (1 - NEARER * Math.max(-1, Math.min(1, y / part.r)));
  const said = (field) => say(field, texts[field] ?? '');
  const flat = move.axis === 'x';
  let motion = null;
  let contact = null;
  let gap = null;
  if (move.kind === 'place') {
    // Down in the hole, a few millimetres under its edge — said as the Z plate says it.
    gap = level < 0.01 ? { at: x + r + 12, from: 0, to: h + 2 * r, key: 'probe.position.few' } : null;
  } else if (flat && ARROWS[move.kind] && move.going) {
    // A way along Y goes into the drawing: no arrow, only nearer or further.
    const [kind, from, to, figure, lit] = ARROWS[move.kind](move);
    motion = {
      dir: 'h', at: h, from: from[0], to: to[0], kind, text: figure ? said(figure) : null, lit: focus === lit,
    };
  }
  if ((move.kind === 'fast' || move.kind === 'slow') && Math.hypot(x - move.wall[0], y - move.wall[1]) < 0.5) {
    // Across X the touch is at the ball's side; along Y it faces into the drawing, at its middle.
    contact = [flat ? x + move.sign * r : x, h + r];
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
