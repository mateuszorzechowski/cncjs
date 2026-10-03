/**
 * A height map's moves as its Setup drawing plays them (Mateusz, 2026-10-02):
 * side-on, one point measured the way every touch is — fast, back, slow —
 * then up by the lift and across to the next point, and the fast touch
 * there from the lift. The board bows a little, so the next point is not
 * where the first one was.
 *
 * Built as the Z plate's cycle is (`probeCycle`): each move its arrow and
 * its dimension, from the figures typed; nothing here is the machine's.
 */

import { slowReach, slowReachWhy } from './probeFields';
import { frameAt, layOut, totalOf } from './timeline';

export const SPAN_MS = 3400;
export const RUN_MS = 2600;
export const LOOP_HOLD_MS = 2500;

// The board's top across the drawing: around this, bowed a little.
export const TOP = 140;
export const surfaceAt = (x) => TOP + 6 * Math.sin((x - 30) / 70);
// Its slope there, in degrees: what a plate lying on it is tipped by.
export const slopeAt = (x) => (Math.atan((6 / 70) * Math.cos((x - 30) / 70)) * 180) / Math.PI;

// The two points, across the drawing; the heights the tool goes to over them.
export const P1 = 100;
export const P2 = 250;
const HIGH = 70;
const BACK = 20;
const LIFT = 36;
const PAST = 22;
// The Z plate moved by hand (Mateusz, 2026-10-03): its thickness and width in the drawing.
export const PLATE_H = 14;
export const PLATE_W = 40;

const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2);
const between = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

const number = (text) => Number(String(text ?? '').replace(',', '.')) || 0;

/*
 * Each move: where the tool is through it (`at(p)`: across, `x`, and its
 * tip's height, `tip`, in the drawing's units); its arrow (`motion`, down the
 * drawing or across it, `probe` a touch, `rapid` a G0, `hand` the
 * operator's); its dimension; the figures it uses, lit beside it; its G-code.
 *
 * With the Z plate every touch is on the plate's top, its thickness over the
 * board, and the operator puts it under the tool over the next point before
 * the touch there (`place`) — nothing is sent meanwhile. `plate(p)` is where
 * the plate is across, or null with none.
 */
const movesOf = (tool) => {
  const up = tool === 'plate' ? PLATE_H : 0;
  const S1 = surfaceAt(P1) - up;
  const S2 = surfaceAt(P2) - up;
  const lies = (x) => (up ? () => x : null);
  return {
    fast: {
      at: (p) => ({ x: P1, tip: S1 - HIGH + HIGH * ease(between(p, 0.15, 0.7)) }),
      plate: lies(P1),
      motion: { axis: 'v', from: S1 - HIGH, to: S1, kind: 'probe', feed: 'fast' },
      dim: { x: P1, top: S1 - HIGH, bottom: S1 + PAST, field: 'maxZ', limit: true, upTo: true },
      titleKey: 'probe.map.move.fast',
      code: (v) => `G38.2 Z-${v.maxZ} F${v.fast}`,
      uses: ['fast', 'maxZ'],
      touches: 0.7,
    },
    retract: {
      at: (p) => ({ x: P1, tip: S1 - BACK * ease(between(p, 0.2, 0.55)) }),
      plate: lies(P1),
      motion: { axis: 'v', from: S1, to: S1 - BACK, kind: 'rapid' },
      dim: { x: P1, top: S1 - BACK, bottom: S1, field: 'retract' },
      titleKey: 'probe.map.move.retract',
      code: (v) => `G0 Z+${v.retract}`,
      uses: ['retract'],
    },
    slow: {
      at: (p) => ({ x: P1, tip: S1 - BACK + BACK * ease(between(p, 0.15, 0.75)) }),
      plate: lies(P1),
      motion: { axis: 'v', from: S1 - BACK, to: S1, kind: 'probe', feed: 'slow' },
      // Twice the back-off, one figure, a short tick at the surface (rule 1).
      dim: { x: P1, top: S1 - BACK, bottom: S1 + BACK, split: true, upTo: true },
      titleKey: 'probe.map.move.slow',
      code: (v) => `G38.2 Z-${number(v.retract) * 2} F${v.slow}`,
      uses: ['slow', 'retract'],
      touches: 0.75,
    },
    // Off the touch and up by the lift: two rapids the same way, one move (the runner joins them).
    lift: {
      at: (p) => ({ x: P1, tip: S1 - LIFT * ease(between(p, 0.2, 0.6)) }),
      plate: lies(P1),
      motion: { axis: 'v', from: S1, to: S1 - LIFT, kind: 'rapid' },
      dim: { x: P1, top: S1 - LIFT, bottom: S1, field: 'mapLift' },
      titleKey: 'probe.map.move.lift',
      code: (v) => `G0 Z+${v.mapLift}`,
      uses: ['mapLift'],
    },
    over: {
      at: (p) => ({ x: P1 + (P2 - P1) * ease(between(p, 0.1, 0.8)), tip: S1 - LIFT }),
      plate: lies(P1),
      motion: { axis: 'h', from: P1, to: P2, kind: 'rapid' },
      dim: null,
      titleKey: 'probe.map.move.over',
      code: () => 'G0 X… Y…',
      uses: ['mapLift'],
    },
    // The plate slid under the tool by hand; the machine stands until told it is there.
    place: {
      at: () => ({ x: P2, tip: S1 - LIFT }),
      plate: (p) => P1 + (P2 - P1) * ease(between(p, 0.1, 0.8)),
      motion: { axis: 'h', from: P1, to: P2, kind: 'hand', y: S2 - 8 },
      // Its thickness once it lies there.
      dim: { x: P2, top: S2, bottom: S2 + PLATE_H, field: 'plateThickness', from: 0.8 },
      titleKey: 'probe.map.move.place',
      code: () => '',
      uses: ['plateThickness'],
    },
    // The next point's fast touch, from the lift over the last one.
    next: {
      at: (p) => ({ x: P2, tip: S1 - LIFT + (S2 - S1 + LIFT) * ease(between(p, 0.15, 0.7)) }),
      plate: lies(P2),
      motion: { axis: 'v', from: S1 - LIFT, to: S2, kind: 'probe', feed: 'fast' },
      dim: { x: P2, top: S1 - LIFT, bottom: S2 + PAST, field: 'maxZ', limit: true, upTo: true },
      titleKey: 'probe.map.move.next',
      code: (v) => `G38.2 Z-${v.maxZ} F${v.fast}`,
      uses: ['fast', 'maxZ'],
      touches: 0.7,
    },
    // What the limit means: nothing under the tool, the whole way down, and the alarm.
    miss: {
      at: (p) => ({ x: P1, tip: S1 - HIGH + (HIGH + PAST) * ease(between(p, 0.1, 0.7)) }),
      plate: null,
      motion: { axis: 'v', from: S1 - HIGH, to: S1 + PAST, kind: 'probe', feed: 'fast' },
      dim: { x: P1, top: S1 - HIGH, bottom: S1 + PAST, field: 'maxZ', limit: true, upTo: true },
      titleKey: 'probe.map.move.miss',
      code: () => 'ALARM:5',
      uses: ['maxZ'],
      miss: true,
      alarmAt: 0.7,
    },
  };
};

const MOVES = { board: movesOf('board'), probe: movesOf('probe'), plate: movesOf('plate') };
const movesFor = (tool) => MOVES[tool] || MOVES.board;

/** The moves in their order: with the Z plate, put under the tool by hand before the next touch. */
export const mapOrder = (tool) => ['fast', 'retract', 'slow', 'lift', 'over', ...(tool === 'plate' ? ['place'] : []), 'next'];

// The point measured, then on to the next.
export const mapGroups = (tool) => [
  {
    id: 'point',
    key: 'probe.map.stage.point',
    subs: [{ key: 'probe.stage.search', moves: ['fast'] }, { key: 'probe.bar.measure', moves: ['retract', 'slow'] }],
  },
  { id: 'next', key: 'probe.map.stage.next', subs: [{ key: 'probe.map.stage.next', moves: mapOrder(tool).slice(3) }] },
];

// A figure being set loops the move it changes, its part of the drawing lit.
const EDIT = {
  maxZ: [['fast', 'dim'], ['miss', 'dim']],
  fast: [['fast', 'feed']],
  retract: [['retract', 'dim']],
  slow: [['slow', 'feed']],
  mapLift: [['lift', 'dim'], ['over', null]],
  plateThickness: [['place', 'dim']],
};

// The figures beside the drawing, by what they are about; the plate's only with the plate.
const MAP_PARAMS = [
  { id: 'measure', key: 'probe.group.measure', fields: ['fast', 'slow', 'retract'] },
  { id: 'reach', key: 'probe.group.reach', fields: ['maxZ'] },
  { id: 'moves', key: 'probe.group.moves', fields: ['mapLift'] },
  { id: 'plate', key: 'probe.group.plate', fields: ['plateThickness'], tool: 'plate' },
];

export const mapParams = (tool) => MAP_PARAMS.filter((group) => !group.tool || group.tool === tool);

export const mapMoveOf = (name, tool) => movesFor(tool)[name];

/** Where through its run a move stops changing. */
const motionEnd = (name) => {
  const move = MOVES.plate[name];
  return Math.max(move.touches || 0.8, move.alarmAt || 0);
};

export const mapTimeline = (tool) => layOut(mapOrder(tool), {
  spanOf: () => SPAN_MS,
  runOf: () => RUN_MS,
  partsOf: (name) => [[0, motionEnd(name)]],
});

/** Which move plays at `ms`: the whole cycle, or a figure's own loop. `still` holds each move at its end. */
export const mapPlayAt = (ms, { field = null, still = false, tool } = {}) => {
  if (!(field && EDIT[field])) {
    const items = mapTimeline(tool);
    const frame = frameAt(items, ms % totalOf(items));
    return { ...frame, focus: null, p: still ? 1 : frame.p };
  }
  const loop = EDIT[field];
  const spans = loop.map(([one]) => RUN_MS * motionEnd(one) + LOOP_HOLD_MS);
  let at = ms % spans.reduce((all, one) => all + one, 0);
  let i = 0;
  while (at >= spans[i]) {
    at -= spans[i];
    i += 1;
  }
  const [name, focus] = loop[i];
  return {
    name, focus, p: still ? 1 : Math.min(1, at / RUN_MS), span: spans[i], run: RUN_MS, into: at,
  };
};

/** The drawing of move `name` at `p`: the tool, its arrow, its dimension, the touch — in the drawing's units. */
export const mapScene = (name, p, {
  texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null, tool,
} = {}) => {
  const move = movesFor(tool)[name];
  const { x, tip } = move.at(p);
  const said = (field) => say(field, texts[field] ?? '');
  let dim = null;
  // A dimension may come in partway: the plate's thickness once it lies under the tool.
  if (move.dim && p >= (move.dim.from ?? 0)) {
    const figure = move.dim.split ? say('retract', slowReach(texts)) : said(move.dim.field);
    dim = {
      x: move.dim.x,
      top: move.dim.top,
      bottom: move.dim.bottom,
      mid: move.dim.split ? (move.dim.top + move.dim.bottom) / 2 : null,
      limit: Boolean(move.dim.limit),
      text: move.dim.upTo ? upTo(figure) : figure,
    };
  }
  const motion = { ...move.motion, feed: move.motion.feed ? said(move.motion.feed) : null };
  return {
    x,
    tip,
    dim,
    motion,
    plate: move.plate ? { x: move.plate(p), w: PLATE_W, h: PLATE_H } : null,
    contact: Boolean(move.touches && p >= move.touches && !move.miss),
    ghost: Boolean(move.miss),
    alarm: Boolean(move.miss && p >= move.alarmAt),
    // The first point is measured once its slow touch has been; the second is where the tool goes.
    measured: ['lift', 'over', 'place', 'next'].includes(name),
    focus,
  };
};

export const mapExplain = (name, texts, say) => (name === 'slow' ? slowReachWhy(texts, say) : null);

export const mapCode = (name, texts, tool) => movesFor(tool)[name].code(texts);
