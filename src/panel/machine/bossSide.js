import {
  ABOVE, BOSS_R, ON_TOP, TOOL_R, legAt, toolAt,
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
const HEIGHTS = [[0, -26], [ON_TOP, 0], [ABOVE, 8], [1, 30], [2, 80]];

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

/**
 * The front's drawing of move `name` at `p`: the ball's place along X, its
 * height and size, whether the part hides it, the arrow of the leg under
 * way — across or up and down; a way along Y has none, it only nears —
 * the depth's dimension, a touch, the zero.
 */
export const bossSide = (move, p, {
  texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null,
} = {}) => {
  const { at, level } = toolAt(move, p);
  const [x, y] = at;
  const h = heightOf(level);
  const r = TOOL_R * scaleAt(y);
  // Behind the part, under its top: hidden.
  const hidden = y > 0 && h < 0 && Math.abs(x) < BOSS_R + r;
  const said = (field) => say(field, texts[field] ?? '');
  let motion = null;
  let depth = null;
  let gap = null;
  let dims = [];
  let contact = null;
  if (move.kind === 'place') {
    // Into place: a few millimetres over the top, said as the Z plate says it.
    gap = { at: x + r + 12, from: 0, to: h, key: 'probe.position.few' };
  } else if (move.kind === 'top') {
    if (p > 0.15 && p < 0.5) {
      motion = {
        dir: 'v', at: x, from: heightOf(1), to: 0, kind: 'probe', text: upTo(said('maxZ')), lit: focus === 'dim',
      };
    }
    if (Math.abs(level - ON_TOP) < 0.01) {
      contact = [x, 0];
    }
  } else if (move.kind === 'side') {
    const leg = legAt(p);
    const flat = move.axis === 'x';
    if (leg.name === 'out' && p > leg.from && flat) {
      motion = {
        dir: 'h', at: heightOf(ABOVE), from: move.from[0], to: move.out[0], kind: 'rapid',
      };
    }
    // How far out past the part, beside it under the top: on the way out across X, or while set.
    if (flat && (leg.name === 'out' || focus === 'clear')) {
      dims = [{
        id: 'clear', at: -10, from: move.sign * BOSS_R, to: move.out[0], text: said('clear'), lit: focus === 'clear',
      }];
    } else if (leg.name === 'down') {
      motion = {
        dir: 'v', at: x, from: heightOf(ABOVE), to: heightOf(0), kind: 'probe',
      };
    } else if (leg.name === 'touch' && p < 0.62 && flat) {
      motion = {
        dir: 'h', at: heightOf(0), from: move.out[0], to: move.wall[0], kind: 'probe', text: said('fast'), lit: focus === 'feed',
      };
    } else if (leg.name === 'up' && p > leg.from) {
      motion = {
        dir: 'v', at: x, from: heightOf(0), to: heightOf(ABOVE), kind: 'rapid',
      };
    }
    // How far down beside the side, under the top: while it goes down and touches, or while set.
    if (leg.name === 'down' || leg.name === 'touch' || focus === 'depth') {
      // Beside the part on the side away from the ball, where the drawing has room for its words.
      const away = flat ? -move.sign : -1;
      depth = {
        at: away * (BOSS_R + 14), text: said('depth'), lit: focus === 'depth',
      };
    }
    if (level < 0.01 && Math.hypot(x - move.wall[0], y - move.wall[1]) < 0.5) {
      // Across X the touch is at the ball's side; along Y it faces into the drawing, at its middle.
      contact = [flat ? x - move.sign * r : x, h + r];
    }
  }
  return {
    along: x,
    r,
    hidden,
    h,
    motion,
    depth,
    gap,
    dims,
    contact,
    zero: move.zeroAt ? Math.max(0, Math.min(1, (p - move.zeroAt[0]) / (move.zeroAt[1] - move.zeroAt[0]))) : 0,
  };
};
