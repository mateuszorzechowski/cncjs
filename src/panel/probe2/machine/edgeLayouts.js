import { BOSS_R, setOn } from './bossMoves';

/*
 * The sides Pomiar touches at two points each, and what each layout of
 * them touches (`edgeMoves` draws their moves): by the way a side faces —
 * the front faces −Y.
 */
export const EDGE_SIDES = {
  front: { axis: 'y', along: 'x', sign: -1 },
  back: { axis: 'y', along: 'x', sign: 1 },
  left: { axis: 'x', along: 'y', sign: -1 },
  right: { axis: 'x', along: 'y', sign: 1 },
};
// How far in from an edge the ball starts.
const INSIDE = 12;

/*
 * The layouts by name: an edge's (`edge-front` …), a pocket's wall, a
 * surface's, a corner's. `sides` in the order touched; `from`; where the
 * ball starts; what a side's search is said by (`reach`: the clearance, the
 * pocket's rough size); the figures to set.
 */
const REACH = { group: 'probe.group.reach' };
const MEASURE = { id: 'measure', key: 'probe.group.measure', fields: ['fast', 'slow', 'retract'] };
const PROBE = { id: 'probe', key: 'probe.group.probe', fields: ['ballDiameter'] };
const edgeLayout = (edge) => ({
  sides: [edge],
  from: 'outside',
  start: setOn(EDGE_SIDES[edge].axis, [0, 0], EDGE_SIDES[edge].sign * (BOSS_R - INSIDE)),
  reach: 'clear',
  params: [{ id: 'reach', key: REACH.group, fields: ['spacing', 'clear', 'overTop', 'depth', 'maxZ'] }, MEASURE, PROBE],
});
// A pocket's wall from inside (a pair's end): the pocket's moves, at one wall.
const wallLayout = (wall) => ({
  sides: [wall],
  from: 'inside',
  start: [3, 2],
  reach: 'holeSize',
  params: [
    { id: 'hole', key: 'probe.group.pocket', fields: ['holeSize'], names: { holeSize: 'probe.field.pocketSize' } },
    { id: 'reach', key: REACH.group, fields: ['spacing'] }, MEASURE, PROBE,
  ],
});
// A surface from above: the top's touch alone (Wysokość, 2026-10-05).
const surfaceLayout = {
  sides: [],
  from: 'outside',
  start: [0, 0],
  reach: 'clear',
  params: [{ id: 'reach', key: REACH.group, fields: ['maxZ'] }, MEASURE, PROBE],
};
/*
 * A corner in one cycle (the server's `strategies/corner3d`): the part's —
 * the ball over its top a little in from both edges — or a pocket's, the
 * ball down in it near the corner. `toward`, the way the part (or the
 * pocket) lies from the corner, each axis: there each edge's second point
 * goes, the first square across from the start (`shifts` in `edgeMoves`).
 */
const CORNER_WAYS = {
  'front-left': [1, 1], 'front-right': [-1, 1], 'back-left': [1, -1], 'back-right': [-1, -1],
};
const cornerLayout = (corner, from) => {
  const [dx, dy] = CORNER_WAYS[corner];
  const inside = from === 'inside';
  return {
    sides: [dx > 0 ? 'left' : 'right', dy > 0 ? 'front' : 'back'],
    from,
    corner: { x: dx, y: dy },
    start: [dx * (INSIDE - BOSS_R), dy * (INSIDE - BOSS_R)],
    reach: inside ? 'holeSize' : 'clear',
    params: inside ? [
      { id: 'hole', key: 'probe.group.pocket', fields: ['holeSize'], names: { holeSize: 'probe.field.pocketSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing'] }, MEASURE, PROBE,
    ] : [{ id: 'reach', key: REACH.group, fields: ['spacing', 'clear', 'overTop', 'depth', 'maxZ'] }, MEASURE, PROBE],
  };
};

export const LAYOUTS = {
  surface: surfaceLayout,
  ...Object.fromEntries(Object.keys(CORNER_WAYS).flatMap((corner) => [
    [`corner-out-${corner}`, cornerLayout(corner, 'outside')],
    [`corner-in-${corner}`, cornerLayout(corner, 'inside')],
  ])),
  ...Object.fromEntries(Object.keys(EDGE_SIDES).map((edge) => [`edge-${edge}`, edgeLayout(edge)])),
  ...Object.fromEntries(Object.keys(EDGE_SIDES).map((wall) => [`wall-${wall}`, wallLayout(wall)])),
};
export const layoutOf = (name) => LAYOUTS[name];
