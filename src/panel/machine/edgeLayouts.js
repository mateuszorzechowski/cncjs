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
// A rectangle's four sides, in the order touched.
const FOUR = ['front', 'right', 'back', 'left'];
// How far in from an edge the ball starts.
const INSIDE = 12;

/*
 * The layouts by name: an edge's (`edge-front` …), the part's and the
 * pocket's at an angle. `sides` in the order touched; `from`; where the ball
 * starts; what a side's search is said by (`reach`: the clearance, the part's
 * half and the clearance, the pocket's rough size); the figures to set.
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
export const LAYOUTS = {
  ...Object.fromEntries(Object.keys(EDGE_SIDES).map((edge) => [`edge-${edge}`, edgeLayout(edge)])),
  ...Object.fromEntries(Object.keys(EDGE_SIDES).map((wall) => [`wall-${wall}`, wallLayout(wall)])),
  'turned-outside': {
    sides: FOUR,
    from: 'outside',
    start: [4, -3],
    reach: 'part',
    params: [
      { id: 'part', key: 'probe.group.part', fields: ['bossSize'], names: { bossSize: 'probe.field.partSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing', 'clear', 'overTop', 'depth', 'maxZ'] }, MEASURE, PROBE,
    ],
  },
  'turned-inside': {
    sides: FOUR,
    from: 'inside',
    start: [3, 2],
    reach: 'holeSize',
    params: [
      { id: 'hole', key: 'probe.group.pocket', fields: ['holeSize'], names: { holeSize: 'probe.field.pocketSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing'] }, MEASURE, PROBE,
    ],
  },
  // An oval: touched as the rectangle at an angle, the ellipse fitted (the server's `strategies/oval`).
  'oval-outside': {
    sides: FOUR,
    from: 'outside',
    start: [4, -3],
    reach: 'part',
    outline: 'oval',
    // Closer than a square's: on an oval the four ways' points would meet in pairs at its shoulders.
    span: 9,
    params: [
      { id: 'part', key: 'probe.group.stud', fields: ['bossSize'], names: { bossSize: 'probe.field.ovalStudSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing', 'clear', 'overTop', 'depth', 'maxZ'] }, MEASURE, PROBE,
    ],
  },
  'oval-inside': {
    sides: FOUR,
    from: 'inside',
    start: [3, 2],
    reach: 'holeSize',
    outline: 'oval',
    span: 9,
    params: [
      { id: 'hole', key: 'probe.group.hole', fields: ['holeSize'], names: { holeSize: 'probe.field.ovalHoleSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing'] }, MEASURE, PROBE,
    ],
  },
  // A slot — a fasolka: as the oval, its outline two half circles and two straight sides (`strategies/slot`).
  'slot-outside': {
    sides: FOUR,
    from: 'outside',
    start: [4, -3],
    reach: 'part',
    outline: 'slot',
    span: 7,
    params: [
      { id: 'part', key: 'probe.group.slot', fields: ['bossSize'], names: { bossSize: 'probe.field.slotStudSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing', 'clear', 'overTop', 'depth', 'maxZ'] }, MEASURE, PROBE,
    ],
  },
  'slot-inside': {
    sides: FOUR,
    from: 'inside',
    start: [3, 2],
    reach: 'holeSize',
    outline: 'slot',
    span: 7,
    params: [
      { id: 'hole', key: 'probe.group.slot', fields: ['holeSize'], names: { holeSize: 'probe.field.slotHoleSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing'] }, MEASURE, PROBE,
    ],
  },
};
export const layoutOf = (name) => LAYOUTS[name];
