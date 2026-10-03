import { bossCycleOf } from './bossCycle';
import { holeCycleOf } from './holeCycle';

/**
 * The drawings of a size measured (Mateusz, 2026-10-03; the server's
 * `services/probe/strategies/size`): a hole's or a part's centre cycle, both
 * axes or one — a groove from inside, a bar from outside — ending in the
 * size rather than a zero.
 */
const CYCLES = {
  'hole-size': holeCycleOf({ size: true }),
  'boss-size': bossCycleOf({ size: true }),
  'groove-x': holeCycleOf({ axes: ['x'], size: true }),
  'groove-y': holeCycleOf({ axes: ['y'], size: true }),
  'bar-x': bossCycleOf({ axes: ['x'], size: true }),
  'bar-y': bossCycleOf({ axes: ['y'], size: true }),
};

/** The cycle of a size method, the width's by its shape; null for any other method. */
export const sizeCycle = (method, shape) => CYCLES[method === 'width' ? shape : method] ?? null;

/**
 * How many passes are drawn: once or twice across for a centre; for a size,
 * the ones that find the centre (`holePasses` − 1) and the counted ones
 * (`repeats`), every pass past the second drawn as the second — each starts
 * at the centre found.
 */
export const drawnPasses = (cycle, holePasses, repeats) => {
  const centring = Number(holePasses) === 1 ? 1 : 2;
  if (!cycle.size) {
    return centring;
  }
  return Math.min(2, centring - 1 + (Number(repeats) || 1));
};
