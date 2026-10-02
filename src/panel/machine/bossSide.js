import {
  ABOVE, BOSS_R, ON_TOP, TOOL_R, isGoing, toolAt,
} from './bossMoves';

/**
 * The part touched from outside, seen from the front (review notes,
 * 2026-10-01: *"czy można zrobić rzut z boku"*, and *"nie zmieniaj osi,
 * tylko pokaż ruch osi Y w głębi, czyli linia przerywana za, i
 * powiększenie/pomniejszenie"*): always along X, with Z up. What the view
 * from above draws as size is drawn here as height — the top touched, the
 * ball out over it, down beside a side by the depth, the touch moving in, up
 * again. A move along Y goes into the drawing: the ball drawn larger nearer
 * the front, smaller further back, and dashed while the part hides it.
 *
 * Along X, the same units as from above; up, how high the ball's bottom is
 * over the top (negative: down beside a side). The part's top is at 0.
 */

// The height of the ball's bottom over the top at each level: down beside a side, on the top, just over it, set, into place.
const HEIGHTS = [[0, -26], [ON_TOP, 0], [ABOVE, 18], [1, 40], [2, 80]];

// How far forward or back a side's way out goes, from above: the ball is drawn this much larger or smaller there.
const REACH = BOSS_R + 26;
const NEARER = 0.3;

/** How high the ball's bottom is at `level`. */
export const heightOf = (level) => {
  for (let i = 0; i < HEIGHTS.length - 1; i++) {
    const [a, ha] = HEIGHTS[i];
    const [b, hb] = HEIGHTS[i + 1];
    if (level <= b) {
      return ha + ((hb - ha) * Math.max(0, level - a)) / (b - a);
    }
  }
  return HEIGHTS[HEIGHTS.length - 1][1];
};

/** How large the ball is drawn at `y`: the front (−Y) nearer, larger. */
export const scaleAt = (y) => 1 - NEARER * Math.max(-1, Math.min(1, y / REACH));

/*
 * Each step's arrow from the front, while it goes: Z moves only, up or down
 * at the ball — X and Y are drawn from above (the animation rules). An
 * arrow carries its feed; a G0 nothing.
 */
const arrowOf = (move, p, x, said, lit) => {
  const v = (from, to, kind, text = null, on = false) => ({
    dir: 'v', at: x, from: heightOf(from), to: heightOf(to), kind, text, lit: on,
  });
  switch (move.kind) {
    case 'topFast': return v(1, ON_TOP, 'probe', said('fast'), lit('feed'));
    case 'topBack': return v(ON_TOP, ABOVE, 'rapid');
    case 'topSlow': return v(ABOVE, ON_TOP, 'probe', said('slow'), lit('feed'));
    case 'down': return v(ABOVE, 0, 'probe', said('fast'), lit('feed'));
    case 'up': return v(0, ABOVE, 'rapid');
    default: return null;
  }
};

/*
 * Each Z step's distances beside the ball, on the other side from its arrow:
 * the top's search reach, its back-off, the slow touch's way to the top and
 * its margin past it; down beside a side and up again, the back-off over the
 * top and the depth under it — one dimension split at the top, a figure each
 * (rule, Mateusz 2026-10-01).
 */
const distancesOf = (move, p, beside, said, upTo, lit) => {
  const one = (id, from, to, text, on, limit = false) => ({
    id, at: beside, from, to, text, lit: on, limit,
  });
  const parts = () => [
    one('retract', heightOf(ABOVE), 0, said('retract'), lit('retract')),
    one('depth', 0, heightOf(0), said('depth'), lit('depth')),
  ];
  switch (move.kind) {
    case 'topFast': return [one('reach', heightOf(1), -14, upTo(said('maxZ')), lit('dim'), true)];
    case 'topBack': return [one('retract', 0, heightOf(ABOVE), said('retract'), lit('retract'))];
    case 'topSlow': return [{
      id: 'reach', at: beside, from: heightOf(ABOVE), mid: 0, to: -heightOf(ABOVE), text: said('retract'), far: upTo(said('retract')), lit: lit('retract'),
    }];
    case 'down': return parts();
    case 'up': return parts();
    default: return [];
  }
};

/**
 * The front's drawing of step `move` at `p`: the ball's place along X, its
 * height and size, whether the part hides it, the arrow of the step under
 * way, the depth's dimension, a touch, the zero.
 */
export const bossSide = (move, p, {
  texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null,
} = {}) => {
  const { at, level } = toolAt(move, p);
  const [x, y] = at;
  const h = heightOf(level);
  const r = TOOL_R * scaleAt(y);
  const flat = move.axis === 'x';
  const said = (field) => say(field, texts[field] ?? '');
  const lit = (part) => focus === part;
  // Behind the part, under its top: hidden.
  const hidden = y > 0 && h < 0 && Math.abs(x) < BOSS_R + r;
  // The step's arrow over its whole run, drawn only while it goes: labels keep off it all along, so they
  // stand still through the move (L16).
  const way = move.kind !== 'place' ? arrowOf(move, p, x, said, lit) : null;
  const motion = way && isGoing(move, p) ? way : null;
  const vdims = move.kind === 'place' ? [] : distancesOf(move, p, x + r + 14, said, upTo, lit);
  let gap = null;
  let contact = null;
  if (move.kind === 'place') {
    // Into place: a few millimetres over the top, said as the Z plate says it.
    // Once the ball is in place, not growing as it comes down.
    gap = level <= 1.001 ? {
      at: x + r + 12, from: 0, to: heightOf(1), key: 'probe.position.few',
    } : null;
  }
  if ((move.kind === 'fast' || move.kind === 'slow') && level < 0.01 && Math.hypot(x - move.wall[0], y - move.wall[1]) < 0.5) {
    // Across X the touch is at the ball's side; along Y it faces into the drawing, at its middle.
    contact = [flat ? x - move.sign * r : x, h + r];
  } else if ((move.kind === 'topFast' || move.kind === 'topSlow') && Math.abs(level - ON_TOP) < 0.01) {
    contact = [x, 0];
  }
  return {
    along: x,
    r,
    hidden,
    h,
    motion,
    way,
    gap,
    vdims,
    contact,
    zero: move.zeroAt ? Math.max(0, Math.min(1, (p - move.zeroAt[0]) / (move.zeroAt[1] - move.zeroAt[0]))) : 0,
  };
};
