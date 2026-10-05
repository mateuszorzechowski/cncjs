/*
 * Pomiar (Mateusz, 2026-10-03: *"odpada jeden przycisk na każdy z tych
 * elementów"*): one method, what is measured chosen first (`KINDS`), then
 * how it lies — from inside or outside, a width's axis too. Both steps set
 * one choice, the shape, the server's `size` strategy's `SHAPES`.
 */
export const KINDS = [
  { id: 'circle', key: 'probe.kind.circle', note: 'probe.kind.circleNote' },
  { id: 'rect', key: 'probe.kind.rect', note: 'probe.kind.rectNote' },
  { id: 'width', key: 'probe.kind.width', note: 'probe.kind.widthNote' },
  { id: 'slot', key: 'probe.kind.slot', note: 'probe.kind.slotNote' },
  { id: 'edge', key: 'probe.kind.edge', note: 'probe.kind.edgeNote' },
  { id: 'distance', key: 'probe.kind.distance', note: 'probe.kind.distanceNote' },
];

export const SHAPES = [
  { id: 'circle-inside', kind: 'circle', key: 'probe.shape.circleInside', side: 'inside', place: 'probe.place.hole' },
  { id: 'circle-outside', kind: 'circle', key: 'probe.shape.circleOutside', side: 'outside', place: 'probe.place.boss' },
  { id: 'rect-inside', kind: 'rect', key: 'probe.shape.rectInside', side: 'inside', place: 'probe.place.pocket' },
  { id: 'rect-outside', kind: 'rect', key: 'probe.shape.rectOutside', side: 'outside', place: 'probe.place.boss' },
  // At an angle (the server's `strategies/turned`): four sides at two points each.
  { id: 'rect-inside-turned', kind: 'rect', key: 'probe.shape.rectInsideTurned', side: 'inside', place: 'probe.place.pocket' },
  { id: 'rect-outside-turned', kind: 'rect', key: 'probe.shape.rectOutsideTurned', side: 'outside', place: 'probe.place.boss' },
  { id: 'groove-x', kind: 'width', key: 'probe.shape.grooveX', side: 'inside', axis: 'x', place: 'probe.place.groove' },
  { id: 'groove-y', kind: 'width', key: 'probe.shape.grooveY', side: 'inside', axis: 'y', place: 'probe.place.groove' },
  { id: 'bar-x', kind: 'width', key: 'probe.shape.barX', side: 'outside', axis: 'x', place: 'probe.place.bar' },
  { id: 'bar-y', kind: 'width', key: 'probe.shape.barY', side: 'outside', axis: 'y', place: 'probe.place.bar' },
  // A circle's ovality (Mateusz, 2026-10-05: the oval is the circle's check, not a shape of its own): the ellipse
  // through eight touches, its two axes and their angle (the server's `strategies/oval`).
  { id: 'oval-inside', kind: 'circle', key: 'probe.shape.ovalInside', side: 'inside', place: 'probe.place.hole' },
  { id: 'oval-outside', kind: 'circle', key: 'probe.shape.ovalOutside', side: 'outside', place: 'probe.place.boss' },
  // A slot — a fasolka — cut or standing, along the axes or turned (`strategies/slot`).
  { id: 'slot-inside', kind: 'slot', key: 'probe.shape.slotInside', side: 'inside', place: 'probe.place.slot' },
  { id: 'slot-outside', kind: 'slot', key: 'probe.shape.slotOutside', side: 'outside', place: 'probe.place.boss' },
  // An edge, by the way it faces: the front faces −Y (the server's `strategies/edge`).
  { id: 'edge-front', kind: 'edge', key: 'probe.shape.edgeFront', side: 'outside', place: 'probe.place.edge' },
  { id: 'edge-back', kind: 'edge', key: 'probe.shape.edgeBack', side: 'outside', place: 'probe.place.edge' },
  { id: 'edge-left', kind: 'edge', key: 'probe.shape.edgeLeft', side: 'outside', place: 'probe.place.edge' },
  { id: 'edge-right', kind: 'edge', key: 'probe.shape.edgeRight', side: 'outside', place: 'probe.place.edge' },
  // One feature to another (Mateusz, 2026-10-05): the two picked on the step that says how the others lie.
  { id: 'distance', kind: 'distance', key: 'probe.shape.distance', side: 'inside', place: 'probe.place.hole' },
];

/*
 * A distance's two ends (the server's `strategies/distance`): a hole, a stud
 * or an edge. Kept in the wizard's one choice as `distance:a:b`, so it goes
 * wherever a shape goes; asked for as `{ shape: 'distance', a, b }`.
 */
export const PARTS = ['circle-inside', 'circle-outside', 'edge-front', 'edge-back', 'edge-left', 'edge-right'];
const DISTANCE = 'distance';
const FIRST_PAIR = `${DISTANCE}:circle-inside:circle-inside`;

/** A distance's two ends, `{ a, b }`, from the choice; null for any other shape. */
export const pairOf = (value) => {
  const [shape, a, b] = String(value ?? '').split(':');
  return shape === DISTANCE ? { a: PARTS.includes(a) ? a : PARTS[0], b: PARTS.includes(b) ? b : PARTS[0] } : null;
};

/** The choice a distance's two ends make. */
export const pairChoice = ({ a, b }) => `${DISTANCE}:${a}:${b}`;

// Two edges square to each other meet in a corner: the server refuses them (`edges-crossing`).
const across = (part) => (['edge-front', 'edge-back'].includes(part) ? 'y' : 'x');
export const pairCrosses = (a, b) => a.startsWith('edge-') && b.startsWith('edge-') && across(a) !== across(b);

export const shapeOf = (id) => SHAPES.find((one) => one.id === String(id ?? '').split(':')[0]) ?? SHAPES[0];

/** The shape the tool is at now: a distance's end being measured (`part`), or the shape itself. */
export const partShape = (value, part = 'a') => pairOf(value)?.[part] ?? value;

/** The choice back from a shape asked for, `value`, with the options it was asked with: a distance's two ends in one. */
export const choiceOf = (value, options) => (value === DISTANCE ? pairChoice(options) : value);

/** The shape a kind picked comes to: the one chosen if it is of that kind, else the kind's first — lying the same way where it can. */
export const shapeOfKind = (kind, now) => {
  const was = shapeOf(now);
  if (was.kind === kind) {
    return kind === DISTANCE ? now : was.id;
  }
  if (kind === DISTANCE) {
    return FIRST_PAIR;
  }
  const same = SHAPES.find((one) => one.kind === kind && one.side === was.side);
  return (same ?? SHAPES.find((one) => one.kind === kind)).id;
};
