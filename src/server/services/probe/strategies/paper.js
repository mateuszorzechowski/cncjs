import { move } from '../moves';
import { checkSurface, surfaceOptions, surfaceShift } from '../surface';

/**
 * A sheet of paper, by hand, no probe (Mateusz, 2026-09-29): the operator
 * jogs the tool onto the paper until it drags and says "here". The zero is
 * where the tool stood then, less the paper, and on a side the tool's radius
 * too; the one move after is off the surface by `paperLift`, so the sheet
 * comes out (review note, 2026-10-01: *"po pomiarze 1 mm/2 mm"*).
 *
 * Which surface is a direction: the way the tool faces it. `x-left` is the
 * tool left of the work, against its left side — the edge is further right
 * than the tool's centre by the radius and the paper.
 */
export const EDGES = {
  z: { axis: 'z', sign: -1, radius: false },
  'x-left': { axis: 'x', sign: 1, radius: true },
  'x-right': { axis: 'x', sign: -1, radius: true },
  'y-front': { axis: 'y', sign: 1, radius: true },
  'y-back': { axis: 'y', sign: -1, radius: true },
};

export default {
  fields: ['paperThickness', 'toolDiameter', 'stockThickness', 'paperLift'],
  // On the top, the sheet may lie on the work or the table, and Z0 go on either (`surface`).
  options: { edge: Object.keys(EDGES), ...surfaceOptions },
  // No probe on the tool, so nothing to find lit.
  touches: false,

  check: (options = {}) => (EDGES[options.edge] ? checkSurface(options) : 'bad-edge'),

  // Off the surface, the way the tool came, by the lift: up off the top, back off a side.
  steps: (params, { edge }) => {
    const { axis, sign } = EDGES[edge];
    return params.paperLift > 0 ? [move('lift', (here) => ({ [axis]: here[axis] - sign * params.paperLift }))] : [];
  },

  zero: (params, options, seen, start) => {
    const { axis, sign, radius } = EDGES[options.edge];
    const off = params.paperThickness + (radius ? params.toolDiameter / 2 : 0);
    const shift = axis === 'z' ? surfaceShift(params, options) : 0;
    return { [axis]: start[axis] + sign * off + shift };
  },
};
