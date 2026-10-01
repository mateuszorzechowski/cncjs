import { checkSurface, surfaceOptions, surfaceShift } from '../surface';

/**
 * A sheet of paper, by hand, no probe (Mateusz, 2026-09-29): the operator
 * jogs the tool onto the paper until it drags and says "here". Nothing moves
 * on its own, so there are no steps — the zero is where the tool stands, less
 * the paper, and on a side the tool's radius too.
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
  fields: ['paperThickness', 'toolDiameter', 'stockThickness'],
  // On the top, the sheet may lie on the work or the table, and Z0 go on either (`surface`).
  options: { edge: Object.keys(EDGES), ...surfaceOptions },
  // No probe on the tool, so nothing to find lit.
  touches: false,

  check: (options = {}) => (EDGES[options.edge] ? checkSurface(options) : 'bad-edge'),

  steps: () => [],

  zero: (params, options, seen, start) => {
    const { axis, sign, radius } = EDGES[options.edge];
    const off = params.paperThickness + (radius ? params.toolDiameter / 2 : 0);
    const shift = axis === 'z' ? surfaceShift(params, options) : 0;
    return { [axis]: start[axis] + sign * off + shift };
  },
};
