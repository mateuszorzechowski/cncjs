import { bossCycleOf } from './bossCycle';
import { holeCycleOf } from './holeCycle';

/**
 * The drawings of a size measured (Pomiar, Mateusz 2026-10-03; the server's
 * `services/probe/strategies/size`): a hole's or a part's centre cycle, by
 * the shape — round or square, both axes, or one for a groove from inside
 * or a bar from outside, or one side of a part at two points for its angle —
 * ending in the size rather than a zero. Its rough
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
  'edge-front': bossCycleOf({ edge: 'front' }),
  'edge-back': bossCycleOf({ edge: 'back' }),
  'edge-left': bossCycleOf({ edge: 'left' }),
  'edge-right': bossCycleOf({ edge: 'right' }),
};

/**
 * The cycle of a size, by its shape; null for any other method. `angle`, an
 * edge measured: its part drawn turned that way — at least `SEEN` degrees, at
 * most `STEEP`, so a small angle can be seen and a large one still reads as
 * an edge; level when it is.
 */
const SEEN = 8;
const STEEP = 20;
export const sizeCycle = (method, shape, angle = null) => {
  if (method !== 'measure') {
    return null;
  }
  const edge = /^edge-(\w+)$/.exec(shape || '');
  if (edge && Number.isFinite(angle)) {
    const size = Math.abs(angle) < 0.0005 ? 0 : Math.min(STEEP, Math.max(SEEN, Math.abs(angle)));
    return bossCycleOf({ edge: edge[1], tilt: Math.sign(angle) * size });
  }
  return CYCLES[shape] ?? CYCLES['circle-inside'];
};

/**
 * How many passes are drawn: the ones that find the centre (`holePasses` −
 * 1) and the counted ones (`repeats`), every pass past the second drawn as
 * the second — each starts at the centre found.
 */
export const drawnPasses = (holePasses, repeats) => Math.min(2, (Number(holePasses) === 1 ? 0 : 1) + (Number(repeats) || 1));
