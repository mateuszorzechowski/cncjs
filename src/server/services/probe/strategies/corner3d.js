import { touch } from '../moves';
import { overTheTop } from './boss';
import { CORNERS } from './corner';
import { cornerOf } from './distance';
import {
  edgeLine, edgeOf, edgeSteps, wallSteps,
} from './edge';

/**
 * Pomiar: a corner with a 3D probe, both its edges from one start (audit
 * 2026-10-05, the sense report's #26: a corner sondą is one cycle in every
 * probing program, not two halves with a jog between). From outside — a
 * part's corner — the ball starts over the top a few millimetres in from
 * both edges; from inside — a pocket's — down in the pocket near the corner.
 * Each edge is touched at two points, the first square across from the
 * start, the second `spacing` further from the corner along it, so neither
 * point falls off the end of the edge past the corner. What comes out is the
 * pair corner's: the angle between the two edges and where they meet, for a
 * zero there.
 *
 * `corner` names it as the L plate's corners are named — `front-left` — and
 * says which way the part (or the pocket) lies from it: there the second
 * points go.
 */
export const CORNER_SIDES = { out: 'outside', in: 'inside' };

// The corner's two edges, by the way each faces: off the part from outside, into the pocket from inside.
const edgesOf = (corner) => {
  const { x, y } = CORNERS[corner];
  return { xEdge: x > 0 ? 'left' : 'right', yEdge: y > 0 ? 'front' : 'back', x, y };
};

/** The moves for a corner `corner` from `side` (`outside` or `inside`); `start`, where the ball stands. */
export const cornerSteps = (corner, side, params, start) => {
  const {
    xEdge, yEdge, x, y,
  } = edgesOf(corner);
  // Along the X edge the points go along Y, into the part; along the Y edge, along X — in rising order, as an
  // edge's two points always are: `edgeOf` reads the edge's way from the first to the second.
  const rising = (to) => [Math.min(0, to), Math.max(0, to)];
  const alongX = rising(y * params.spacing);
  const alongY = rising(x * params.spacing);
  if (side === 'inside') {
    return [...wallSteps(xEdge, params, start, alongX), ...wallSteps(yEdge, params, start, alongY)];
  }
  return [
    ...touch('z', -1, params.maxZ, 'z', params),
    overTheTop(params),
    ...edgeSteps(xEdge, params, { shifts: alongX, top: false }),
    ...edgeSteps(yEdge, params, { shifts: alongY, top: false }),
  ];
};

/** The corner from its two edges' touches: the pair corner's `{ kind: 'angle', size, centre, parts }`. */
export const cornerSize = (corner, side, params, seen) => {
  const { xEdge, yEdge } = edgesOf(corner);
  const inside = side === 'inside';
  const lineOf = (edge) => ({ ...edgeOf(edge, params, seen, inside), line: edgeLine(edge, params, seen, inside) });
  return cornerOf(lineOf(xEdge), lineOf(yEdge));
};
