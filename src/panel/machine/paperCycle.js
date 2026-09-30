/**
 * The paper's cycle as its drawing moves through it — the moves of the
 * design's proposal (Claude Design, `templates/probe-paper-proposal`,
 * 2026-09-30) without its lift, which the paper does not do: the operator
 * jogs down 1 mm at a time, then 0.1 mm while sliding the sheet to and fro,
 * until it drags and then holds — "here"; stops; and the zero is written.
 *
 * The sheet is `paperSheet`'s: this says where the hand is and how the tool
 * grips at each moment, and the sheet follows. A side is drawn in the same
 * layout as the top — the work below, its face the line the sheet lies on —
 * with the tool seen from above; the right and back sides mirrored.
 *
 * Heights are the drawing's units and the timings the drawing's; the figures
 * said come from the form.
 */

import { sheetAt, sheetShape } from './paperSheet';
import { frameAt, layOut, totalOf } from './timeline';

// The work's face, and the sheet's top on it — drawn thick, not to scale.
export const FACE_Y = 156;
export const SHEET_Y = 150;

export const SPAN_MS = 3400;
export const RUN_MS = 2600;
export const LOOP_HOLD_MS = 2500;

// The tool's height over the sheet as the coarse steps start, and where the fine ones do: 5 units a step.
const HIGH = 60;
const NEAR = 10;
const STEP = 5;
const FINE = 0.5;

// The hand's to-and-fro: its period's measure, and how far it goes each way while the sheet slides freely.
const SWING_MS = 80;
const SWING = 5;
// Pushed in once it holds — a little: held at both ends a strip bows high for a small slack — and how
// far the hand still swings then; drawn back past straight when the hand lets go.
const PUSH = 1.5;
const HELD_SWING = 1;
const LET_GO = -6;

const clamp = (v) => Math.max(0, Math.min(1, v));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2);

// Where through its run the tool's steps are over.
const steps = (p) => clamp((p - 0.1) / 0.75);
// The drag comes on over the last fine steps; at most this much of a push stays as slack, the rest slides.
const dragAt = (gap) => clamp((0.5 - gap / NEAR) / 0.5);
const DRAG = 0.6;
// When the drag becomes a hold, in the "here" move.
const HOLDS = 0.45;

/*
 * Each move: the tool's height over the sheet at `p`; how the tool grips;
 * where the hand is on top of its swing (`mean`) and how far it swings
 * (`amp`); `end`, where through its run it stops changing; the keys of its
 * title and its tag.
 */
const MOVES = {
  coarse: {
    gap: (p) => HIGH - Math.min(10, Math.floor(steps(p) * 11)) * STEP,
    grip: () => ({ friction: 0 }),
    mean: () => 0,
    amp: () => SWING,
    end: 0.85,
    titleKey: 'probe.paper.coarse',
  },
  fine: {
    gap: (p) => NEAR - Math.min(20, Math.floor(steps(p) * 21)) * FINE,
    grip: (p) => ({ friction: DRAG * dragAt(MOVES.fine.gap(p)) }),
    mean: () => 0,
    amp: (p) => SWING * (1 - 0.75 * dragAt(MOVES.fine.gap(p))),
    end: 0.85,
    titleKey: 'probe.paper.fine',
  },
  here: {
    gap: () => 0,
    grip: (p) => (p < HOLDS ? { friction: DRAG } : { pinned: true }),
    mean: (p) => PUSH * ease(clamp((p - HOLDS) / 0.4)),
    amp: (p) => (p < HOLDS ? SWING * 0.25 : HELD_SWING),
    end: 0.85,
    titleKey: 'probe.paper.here',
  },
  // The hand stops; the folds stand; then it lets go and the sheet lies straight.
  stop: {
    gap: () => 0,
    grip: () => ({ pinned: true }),
    mean: (p) => PUSH + (LET_GO - PUSH) * ease(clamp((p - 0.55) / 0.35)),
    amp: (p) => HELD_SWING * (1 - ease(clamp(p / 0.25))),
    end: 0.9,
    titleKey: 'probe.paper.stop',
  },
  zero: {
    gap: () => 0,
    grip: () => ({ pinned: true }),
    mean: () => LET_GO,
    amp: () => 0,
    zeroAt: [0.1, 0.3],
    end: 0.3,
    titleKey: 'probe.paper.zero',
    after: true,
  },
};

export const PAPER_ORDER = ['coarse', 'fine', 'here', 'stop', 'zero'];

export const PAPER_GROUPS = [
  { id: 'coarse', key: 'probe.paper.barCoarse', folded: true, subs: [{ key: 'probe.paper.barCoarse', moves: ['coarse'] }] },
  { id: 'fine', key: 'probe.paper.barFine', folded: true, subs: [{ key: 'probe.paper.barFine', moves: ['fine', 'here', 'stop'] }] },
  { id: 'zero', key: 'probe.bar.zero', folded: true, subs: [{ key: 'probe.stage.zero', moves: ['zero'] }] },
];

// The figures beside the drawing: the sheet, and on a side the tool it is measured from.
export const PAPER_PARAMS = [
  { id: 'paper', key: 'probe.group.paper', fields: ['paperThickness'] },
  { id: 'tool', key: 'probe.group.tool', fields: ['toolDiameter'], side: true },
];

// A figure being set loops the zero, its part lit.
const EDIT = { paperThickness: 'zero', toolDiameter: 'zero' };

export const moveOf = (name) => MOVES[name];

export const paperTimeline = () => layOut(PAPER_ORDER, {
  spanOf: () => SPAN_MS,
  runOf: () => RUN_MS,
  partsOf: (name) => [[0, MOVES[name].end]],
});

const ITEMS = paperTimeline();
const TOTAL = totalOf(ITEMS);
const startOf = (name) => ITEMS.find((item) => item.name === name).start;

/** Where the hand wants to be and how the tool grips, at `ms` on the cycle's clock. */
export const scriptAt = (ms) => {
  const { name, p } = frameAt(ITEMS, ms % TOTAL);
  const move = MOVES[name];
  return { hand: move.mean(p) + move.amp(p) * Math.sin(ms / SWING_MS), grip: move.grip(p) };
};

/** Which move plays at `ms`: the whole cycle, a figure's loop, or `pinned` alone. */
export const playAt = (ms, { pinned = null, field = null, still = false } = {}) => {
  const alone = (field && EDIT[field]) || pinned;
  if (!alone) {
    const frame = frameAt(ITEMS, ms % TOTAL);
    return { ...frame, focus: null, p: still ? 1 : frame.p };
  }
  const span = RUN_MS * MOVES[alone].end + LOOP_HOLD_MS;
  const into = ms % span;
  return {
    name: alone, focus: field || null, p: still ? 1 : Math.min(1, into / RUN_MS), span, run: RUN_MS, into,
  };
};

// Each surface by the way the tool faces it, as the server's strategy has them.
const EDGES_BY_ID = {
  z: { axis: 'z', sign: -1 },
  'x-left': { axis: 'x', sign: 1 },
  'x-right': { axis: 'x', sign: -1 },
  'y-front': { axis: 'y', sign: 1 },
  'y-back': { axis: 'y', sign: -1 },
};

/** The right and back sides are drawn as the left and front, mirrored. */
export const mirrored = (edge) => EDGES_BY_ID[edge].sign < 0 && edge !== 'z';

const number = (text) => Number(String(text ?? '').replace(',', '.')) || 0;
const fmt = (v) => String(Math.round(v * 1000) / 1000);

/** How far the zero is from where the tool stands: the sheet, and on a side the tool's radius too. */
export const offsetOf = (edge, mm) => mm.paperThickness + (edge === 'z' ? 0 : mm.toolDiameter / 2);

/**
 * The drawing of move `name` at `p` — the sheet's history worked out up to
 * there; `texts` the figures, `say(field, text)` a figure as a label says it.
 */
export const paperScene = (name, p, { edge = 'z', texts = {}, say = (field, text) => text, focus = null } = {}) => {
  const move = MOVES[name];
  const at = startOf(name) + p * RUN_MS;
  const sheet = sheetAt(at, scriptAt);
  const grip = move.grip(p);
  const gap = move.gap(p);
  let zero = 0;
  if (move.zeroAt) {
    const [a, b] = move.zeroAt;
    zero = clamp((p - a) / (b - a));
  }
  let tag = null;
  if (name === 'here') {
    tag = grip.pinned ? 'probe.paper.held' : 'probe.paper.drag';
  } else if (name === 'stop') {
    tag = sheet.slack > 0.05 ? 'probe.paper.stopped' : 'probe.paper.loose';
  }
  const side = edge !== 'z';
  const paper = say('paperThickness', texts.paperThickness ?? '');
  return {
    gap,
    sheet: sheetShape(sheet),
    held: Boolean(grip.pinned),
    // The jog: from where the steps began down to the tip, a tick a step.
    jog: name === 'coarse' && gap < HIGH ? { from: HIGH, to: gap, every: STEP } : null,
    fine: name === 'fine' && gap < NEAR - 1 ? { from: NEAR, to: gap } : null,
    tag,
    zero,
    axis: EDGES_BY_ID[edge].axis.toUpperCase(),
    dim: name === 'zero' ? { text: paper } : null,
    dia: name === 'zero' && side ? { text: say('toolDiameter', texts.toolDiameter ?? '') } : null,
    side,
    mirror: mirrored(edge),
    focus,
  };
};

/** The move's line: the jog as the pad sends it, or the zero written; null where the machine does not move. */
export const paperCode = (name, edge, texts, wcs = 1, mm = { paperThickness: number(texts.paperThickness), toolDiameter: number(texts.toolDiameter) }) => {
  const { axis, sign } = EDGES_BY_ID[edge];
  const A = axis.toUpperCase();
  const toward = sign > 0 ? '' : '-';
  if (name === 'coarse') {
    return `$J=G91 ${A}${toward}1`;
  }
  if (name === 'fine') {
    return `$J=G91 ${A}${toward}0.1`;
  }
  if (name === 'zero') {
    return `G10 L20 P${wcs} ${A}${fmt(-sign * offsetOf(edge, mm))}`;
  }
  return null;
};

// An example of where the tool stood against the old zero, before it is written.
export const BEFORE_MM = 12.34;

/** The readout: the axis against the old zero before, the offset after — held, not following the moves. */
export const paperReadout = (name, edge, mm) => {
  const after = Boolean(MOVES[name].after);
  const { axis, sign } = EDGES_BY_ID[edge];
  return { axis, value: after ? -sign * offsetOf(edge, mm) : BEFORE_MM, after };
};
