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
  fields: ['paperThickness', 'toolDiameter'],
  options: { edge: Object.keys(EDGES) },
  // No probe on the tool, so nothing to find lit.
  touches: false,

  check: ({ edge } = {}) => (EDGES[edge] ? null : 'bad-edge'),

  steps: () => [],

  zero: (params, { edge }, seen, start) => {
    const { axis, sign, radius } = EDGES[edge];
    const off = params.paperThickness + (radius ? params.toolDiameter / 2 : 0);
    return { [axis]: start[axis] + sign * off };
  },
};
