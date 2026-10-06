/*
 * What the 3D probe measures in Sonda v2, split by what it is for (the sense
 * report of 2026-10-05, §5): **Sonda 3D — zero** (`probe3d`), the everyday
 * zeros — a hole's or a stud's middle, a pocket's or a part's (both axes or
 * one: a groove, a bar), an edge, a corner in one cycle — and **Pomiar**
 * (`measure`), the measurements — a distance, a height. Each tile picks a
 * kind first (`KINDS`, its `of` the tile), then how it lies; both steps set
 * one choice, the shape, the server's `size` strategy's `SHAPES`.
 *
 * Mateusz's *"odpada jeden przycisk na każdy z tych elementów"* still holds:
 * two tiles, not one a shape. The set is the report's, trimmed to what an
 * operator needs (Mateusz, 2026-10-06: his asks were to find out the need):
 * no slot, no rectangle at an angle, no one surface's Z, no ovality — a
 * machine's own ovality is measured by the axes that made it.
 */
export const KINDS = [
  { id: 'circle', of: 'probe3d', key: 'probe2.kind.circle', note: 'probe2.kind.circleNote' },
  { id: 'rect', of: 'probe3d', key: 'probe2.kind.rect', note: 'probe2.kind.rectNote' },
  { id: 'edge', of: 'probe3d', key: 'probe.kind.edge', note: 'probe2.kind.edgeNote' },
  { id: 'corner', of: 'probe3d', key: 'probe2.kind.corner', note: 'probe2.kind.cornerNote' },
  { id: 'distance', of: 'measure', key: 'probe.kind.distance', note: 'probe2.kind.distanceNote' },
  { id: 'height', of: 'measure', key: 'probe.kind.height', note: 'probe2.kind.heightNote' },
];

/** The kinds a tile offers. */
export const kindsOf = (of) => KINDS.filter((kind) => kind.of === of);

// A corner of the part, or of a pocket: the L plate's four, named alike (`corner3d` on the server).
const CORNER_IDS = ['back-left', 'back-right', 'front-left', 'front-right'];
const CORNER_KEYS = {
  'back-left': 'probe.corner.backLeft', 'back-right': 'probe.corner.backRight', 'front-left': 'probe.corner.frontLeft', 'front-right': 'probe.corner.frontRight',
};

export const SHAPES = [
  { id: 'circle-inside', kind: 'circle', key: 'probe.shape.circleInside', side: 'inside', place: 'probe.place.hole' },
  { id: 'circle-outside', kind: 'circle', key: 'probe.shape.circleOutside', side: 'outside', place: 'probe.place.boss' },
  // A rectangle's middle on both axes, or on one — a groove from inside, a bar from outside (report #22: one kind).
  { id: 'rect-inside', kind: 'rect', key: 'probe.shape.rectInside', side: 'inside', place: 'probe.place.pocket' },
  { id: 'rect-outside', kind: 'rect', key: 'probe.shape.rectOutside', side: 'outside', place: 'probe.place.boss' },
  { id: 'groove-x', kind: 'rect', key: 'probe.shape.grooveX', side: 'inside', axis: 'x', place: 'probe.place.groove' },
  { id: 'groove-y', kind: 'rect', key: 'probe.shape.grooveY', side: 'inside', axis: 'y', place: 'probe.place.groove' },
  { id: 'bar-x', kind: 'rect', key: 'probe.shape.barX', side: 'outside', axis: 'x', place: 'probe.place.bar' },
  { id: 'bar-y', kind: 'rect', key: 'probe.shape.barY', side: 'outside', axis: 'y', place: 'probe.place.bar' },
  // An edge, by the way it faces: the front faces −Y (the server's `strategies/edge`).
  { id: 'edge-front', kind: 'edge', key: 'probe.shape.edgeFront', side: 'outside', place: 'probe.place.edge' },
  { id: 'edge-back', kind: 'edge', key: 'probe.shape.edgeBack', side: 'outside', place: 'probe.place.edge' },
  { id: 'edge-left', kind: 'edge', key: 'probe.shape.edgeLeft', side: 'outside', place: 'probe.place.edge' },
  { id: 'edge-right', kind: 'edge', key: 'probe.shape.edgeRight', side: 'outside', place: 'probe.place.edge' },
  // A corner in one cycle (the server's `strategies/corner3d`): a part's from over its top, a pocket's from inside.
  ...CORNER_IDS.map((corner) => ({
    id: `corner-out-${corner}`, kind: 'corner', key: 'probe2.shape.cornerOut', corner, cornerKey: CORNER_KEYS[corner], side: 'outside', place: 'probe2.place.cornerOut',
  })),
  ...CORNER_IDS.map((corner) => ({
    id: `corner-in-${corner}`, kind: 'corner', key: 'probe2.shape.cornerIn', corner, cornerKey: CORNER_KEYS[corner], side: 'inside', place: 'probe2.place.cornerIn',
  })),
  // A pocket's wall from inside: no kind of its own here — the pocket corner's two walls, named for its result.
  { id: 'wall-front', kind: 'wall', key: 'probe.shape.wallFront', side: 'inside', place: 'probe.place.wall' },
  { id: 'wall-back', kind: 'wall', key: 'probe.shape.wallBack', side: 'inside', place: 'probe.place.wall' },
  { id: 'wall-left', kind: 'wall', key: 'probe.shape.wallLeft', side: 'inside', place: 'probe.place.wall' },
  { id: 'wall-right', kind: 'wall', key: 'probe.shape.wallRight', side: 'inside', place: 'probe.place.wall' },
  // One feature to another: the two picked on the step that says how the others lie.
  { id: 'distance', kind: 'distance', key: 'probe.shape.distance', side: 'inside', place: 'probe.place.hole' },
  // Two surfaces, how far one stands over the other; a surface, no kind of its own here — a height's two ends.
  { id: 'height', kind: 'height', key: 'probe.shape.height', side: 'outside', place: 'probe.place.surface' },
  { id: 'surface', kind: 'surface', key: 'probe2.shape.surface', side: 'outside', place: 'probe.place.surface' },
];

/*
 * A pair, two features measured one after the other (the server's
 * `strategies/distance`): a distance's two ends — a hole, a stud or an edge
 * (no pocket walls: two walls are a groove's or a pocket's width, which the
 * zero tile measures in one go) — or two surfaces. Kept in the wizard's one
 * choice as `shape:a:b`, asked for as `{ shape, a, b }`.
 */
const EDGE_PARTS = ['edge-front', 'edge-back', 'edge-left', 'edge-right'];
const across = (part) => (/-(front|back)$/.test(part) ? 'y' : 'x');
// Two edges square to each other meet in a corner, not at a distance: the server refuses them (`edges-crossing`).
const crossing = (a, b) => EDGE_PARTS.includes(a) && EDGE_PARTS.includes(b) && across(a) !== across(b);
export const PAIRS = {
  distance: { parts: ['circle-inside', 'circle-outside', ...EDGE_PARTS], first: ['circle-inside', 'circle-inside'], fits: (a, b) => !crossing(a, b) },
  height: {
    parts: ['surface'], first: ['surface', 'surface'], fits: () => true, fixed: true,
  },
};

/** A pair's shape and two features, `{ shape, a, b }`, from the choice; null for any other shape. */
export const pairOf = (value) => {
  const [shape, a, b] = String(value ?? '').split(':');
  const pair = PAIRS[shape];
  if (!pair) {
    return null;
  }
  const one = (part, n) => (pair.parts.includes(part) ? part : pair.first[n]);
  return { shape, a: one(a, 0), b: one(b, 1) };
};

/** The choice a pair makes. */
export const pairChoice = ({ shape, a, b }) => `${shape}:${a}:${b}`;

/** Whether `a` and `b` make a pair of `shape`. */
export const pairFits = (shape, a, b) => PAIRS[shape].fits(a, b);

export const shapeOf = (id) => SHAPES.find((one) => one.id === String(id ?? '').split(':')[0]) ?? SHAPES[0];

/** The shape the tool is at now: a pair's feature being measured (`part`), or the shape itself. */
export const partShape = (value, part = 'a') => pairOf(value)?.[part] ?? value;

/** The choice back from a shape asked for, `value`, with the options it was asked with: a pair's two features in one. */
export const choiceOf = (value, options) => (PAIRS[value] ? pairChoice({ ...options, shape: value }) : value);

/*
 * A corner's two edges, as a pair names its ends — the X side's edge first,
 * then the Y side's; edges from outside, a pocket's walls from inside — so
 * the result and its drawing read it as the pair corner they share.
 */
const X_SIDE = { 'back-left': 'left', 'back-right': 'right', 'front-left': 'left', 'front-right': 'right' };
const Y_SIDE = { 'back-left': 'back', 'back-right': 'back', 'front-left': 'front', 'front-right': 'front' };
export const pairEnds = (options = {}) => {
  const { corner, side } = shapeOf(options.shape);
  if (!corner) {
    return { a: options.a, b: options.b };
  }
  const from = side === 'inside' ? 'wall' : 'edge';
  return { a: `${from}-${X_SIDE[corner]}`, b: `${from}-${Y_SIDE[corner]}` };
};

/** Whether how `choice` lies is a pick: its kind's shapes more than one, or a pair's two ends. */
export const liesManyWays = (choice) => {
  const { kind } = shapeOf(choice);
  return SHAPES.filter((one) => one.kind === kind).length > 1 || Boolean(PAIRS[kind] && !PAIRS[kind].fixed);
};

/** The shape a kind picked comes to: the one chosen if it is of that kind, else the kind's first — lying the same way where it can. */
export const shapeOfKind = (kind, now) => {
  const was = shapeOf(now);
  if (was.kind === kind) {
    return PAIRS[kind] ? now : was.id;
  }
  if (PAIRS[kind] && !PAIRS[kind].fixed) {
    const [a, b] = PAIRS[kind].first;
    return pairChoice({ shape: kind, a, b });
  }
  const same = SHAPES.find((one) => one.kind === kind && one.side === was.side);
  return (same ?? SHAPES.find((one) => one.kind === kind)).id;
};
