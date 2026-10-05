import { bossCycleOf } from './bossCycle';
import { holeCycleOf } from './holeCycle';

/**
 * The drawings of a size measured (Pomiar, Mateusz 2026-10-03; the server's
 * `services/probe/strategies/size`): a hole's or a part's centre cycle, by
 * the shape — round or square, both axes, or one for a groove from inside
 * or a bar from outside — ending in the size rather than a zero. Its rough
 * size is named for what it is: a stud's diameter, a pocket's longer side.
 */
const STUD = { group: 'probe.group.stud', size: 'probe.field.studSize' };
const POCKET = { group: 'probe.group.pocket', size: 'probe.field.pocketSize' };
const PART = { group: 'probe.group.part', size: 'probe.field.partSize' };
const GROOVE = { group: 'probe.group.groove', size: 'probe.field.grooveSize' };
const BAR = { group: 'probe.group.bar', size: 'probe.field.barSize' };

const CYCLES = {
  'circle-inside': holeCycleOf(),
  'circle-outside': bossCycleOf({ names: STUD }),
  'rect-inside': holeCycleOf({ square: true, names: POCKET }),
  'rect-outside': bossCycleOf({ square: true, names: PART }),
  'groove-x': holeCycleOf({ axes: ['x'], names: GROOVE }),
  'groove-y': holeCycleOf({ axes: ['y'], names: GROOVE }),
  'bar-x': bossCycleOf({ axes: ['x'], names: BAR }),
  'bar-y': bossCycleOf({ axes: ['y'], names: BAR }),
};

/** The cycle of a size, by its shape; null for any other method. */
export const sizeCycle = (method, shape) => (method === 'measure' ? CYCLES[shape] ?? CYCLES['circle-inside'] : null);

/**
 * How many passes are drawn: the ones that find the centre (`holePasses` −
 * 1) and the counted ones (`repeats`), every pass past the second drawn as
 * the second — each starts at the centre found.
 */
export const drawnPasses = (holePasses, repeats) => Math.min(2, (Number(holePasses) === 1 ? 0 : 1) + (Number(repeats) || 1));
