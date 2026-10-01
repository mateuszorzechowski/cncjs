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
import { overSurface } from './probeCycle';
import { SURFACE } from './surface';

// The work's face, and the sheet's top on it — drawn thick, not to scale.
export const FACE_Y = 156;
export const SHEET_Y = 150;

export const SPAN_MS = 3400;
export const RUN_MS = 2600;
export const LOOP_HOLD_MS = 2500;

// The tool's height over the sheet as the coarse steps start, and where the fine ones do: 5 units a step.
const HIGH = 60;
const NEAR = 10;
// Few steps, held apart, so each press reads as one (review note, 2026-10-01: *"mniej kroków zejścia, ale dłuższe przerwy"*).
const STEP = 10;
const FINE = 2.25;

// The hand's to-and-fro: its period's measure. How far it swings, and what the tool does to the sheet, by `FEEL`.
const SWING_MS = 80;
// Pressed hard, the hand still pushes a little in: the sheet bows.
const PUSH = 1.5;
// How long a change of feel takes to reach the hand, as a part of a move's run.
const RAMP = 0.08;

const clamp = (v) => Math.max(0, Math.min(1, v));
// How far the lift goes on the drawing — a little, as the figure is.
const LIFT = 14;
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2);

/*
 * What the operator feels with the tool this high over the sheet (Mateusz,
 * 2026-09-30): it slides freely; it drags — the one to stop at, green; it
 * resists, amber, one step too far; it stands, red — too low, the zero would
 * be under the paper. How much of a push stays as slack (`grip`), how far
 * the hand still swings, the tag and its tone.
 *
 * Told apart by what the sheet does, not only the colour (review note, the
 * same day: *"nie widzę różnicy między drags i resists"*): dragging, it still
 * slides under the tool — its far end goes to and fro — and ripples a little
 * by the hand; resisting, it hardly slides, and a push piles up in folds.
 */
const FEEL = {
  free: { grip: { friction: 0 }, amp: 5 },
  drag: {
    grip: { friction: 0.15 }, amp: 3, tag: 'probe.paper.drag', tone: 'grn',
  },
  resist: {
    grip: { friction: 0.95 }, amp: 2.5, tag: 'probe.paper.resist', tone: 'amb',
  },
  stuck: {
    grip: { pinned: true }, amp: 1, push: PUSH, tag: 'probe.paper.stuck', tone: 'red',
  },
};

export const feelAt = (gap) => {
  if (gap > 0.75) {
    return 'free';
  }
  if (gap > 0.25) {
    return 'drag';
  }
  return gap > -0.25 ? 'resist' : 'stuck';
};

// `n` steps of `by` from `from`, spread over the run from 0.1 to 0.85.
const stepsOf = (from, by, n) => [[0, from], ...Array.from({ length: n }, (_, i) => [0.1 + (0.75 * i) / n, from - by * (i + 1)])];

// The step the tool stands on at `p`, and the one before.
const stepAt = (steps, p) => {
  let i = 0;
  while (i + 1 < steps.length && steps[i + 1][0] <= p) {
    i += 1;
  }
  return i;
};

/*
 * Each move: the tool's `steps` — `[p, height]`, held until the next; the
 * hand's swing and push follow the feel at the tool's height, eased over a
 * moment when it changes. `still` from where the hand stops; `end`, where
 * through its run the move stops changing; its title.
 */
const MOVES = {
  coarse: { steps: stepsOf(HIGH, STEP, 5), end: 0.85, titleKey: 'probe.paper.coarse' },
  fine: { steps: stepsOf(NEAR, FINE, 4), end: 0.85, titleKey: 'probe.paper.fine' },
  // One more step each: it drags, it resists, it stands (Mateusz: each its own stage).
  drag: { steps: [[0, 1], [0.15, 0.5]], end: 0.8, titleKey: 'probe.paper.drags' },
  resist: { steps: [[0, 0.5], [0.15, 0]], end: 0.8, titleKey: 'probe.paper.resists' },
  stuck: { steps: [[0, 0], [0.15, -0.5]], end: 0.8, titleKey: 'probe.paper.stands' },
  // Back a step: it resists; another: it drags — "here", and the hand stops.
  back: { steps: [[0, -0.5], [0.15, 0]], end: 0.8, titleKey: 'probe.paper.back' },
  here: {
    steps: [[0, 0], [0.15, 0.5]], still: [0.45, 0.85], end: 0.85, titleKey: 'probe.paper.here', tag: 'probe.paper.ok',
  },
  zero: {
    steps: [[0, 0.5]], still: [-1, 0], zeroAt: [0.1, 0.3], end: 0.3, titleKey: 'probe.paper.zero', after: true,
  },
  // Off the surface by the lift, so the sheet comes out (review note, 2026-10-01): a G0, not a step.
  lift: {
    steps: [[0, 0.5]], still: [-1, 0], zeroAt: [-1, 0], end: 0.6, titleKey: 'probe.paper.lift', after: true,
    gap: (p) => 0.5 + LIFT * ease(clamp((p - 0.2) / 0.4)),
  },
};

const gapOf = (move, p) => (move.gap ? move.gap(p) : move.steps[stepAt(move.steps, p)][1]);

// How long a jog key shows pressed after its step, as a part of a move's run.
const CLICK = 0.06;
// Which way each jogged move goes: towards the surface, or back off it.
const BACK = new Set(['back', 'here']);

/** The hand's swing and push at `p`: the feel's, eased from the step before's. */
const handOf = (move, p) => {
  const i = stepAt(move.steps, p);
  const now = FEEL[feelAt(move.steps[i][1])];
  const was = FEEL[feelAt(move.steps[Math.max(0, i - 1)][1])];
  const u = clamp((p - move.steps[i][0]) / RAMP);
  let amp = was.amp + (now.amp - was.amp) * u;
  const push = (was.push || 0) + ((now.push || 0) - (was.push || 0)) * u;
  if (move.still) {
    const [a, b] = move.still;
    amp *= 1 - clamp((p - a) / (b - a));
  }
  return { amp, push };
};

export const PAPER_ORDER = ['coarse', 'fine', 'drag', 'resist', 'stuck', 'back', 'here', 'zero', 'lift'];

export const PAPER_GROUPS = [
  { id: 'coarse', key: 'probe.paper.barCoarse', folded: true, subs: [{ key: 'probe.paper.barCoarse', moves: ['coarse'] }] },
  { id: 'fine', key: 'probe.paper.barFine', folded: true, subs: [{ key: 'probe.paper.barFine', moves: ['fine', 'drag', 'resist', 'stuck'] }] },
  { id: 'back', key: 'probe.paper.barBack', folded: true, subs: [{ key: 'probe.paper.barBack', moves: ['back', 'here'] }] },
  { id: 'zero', key: 'probe.bar.zero', folded: true, subs: [{ key: 'probe.stage.zero', moves: ['zero', 'lift'] }] },
];

// The figures beside the drawing: the sheet, and on a side the tool it is measured from.
export const PAPER_PARAMS = [
  { id: 'paper', key: 'probe.group.paper', fields: ['paperThickness'] },
  { id: 'tool', key: 'probe.group.tool', fields: ['toolDiameter'], side: true },
  { id: 'moves', key: 'probe.group.moves', fields: ['paperLift'] },
  // On the top: where Z0 goes, last and closed (`SurfaceChoice`).
  { id: 'z0', key: 'probe.surface.title', fields: ['stockThickness'], top: true, surface: true },
];

// A figure being set loops the zero, its part lit.
const EDIT = {
  paperThickness: 'zero', toolDiameter: 'zero', stockThickness: 'zero', paperLift: 'lift',
};

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
  const { amp, push } = handOf(move, p);
  return { hand: push + amp * Math.sin(ms / SWING_MS), grip: FEEL[feelAt(gapOf(move, p))].grip };
};

// The feel, stage by stage: what the measuring step shows beside its buttons.
export const FEEL_ORDER = ['drag', 'resist', 'stuck', 'back', 'here'];

/** The feel's stages on a loop of their own, each for a span. */
export const feelLoopAt = (ms) => {
  const at = ms % (FEEL_ORDER.length * SPAN_MS);
  return { name: FEEL_ORDER[Math.floor(at / SPAN_MS)], p: Math.min(1, (at % SPAN_MS) / RUN_MS) };
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

/** The axis a surface is felt on, and the way towards it: `x-left` is +X, the top −Z. */
export const surfaceOf = (edge) => EDGES_BY_ID[edge];

/** The right and back sides are drawn as the left and front, mirrored. */
export const mirrored = (edge) => EDGES_BY_ID[edge].sign < 0 && edge !== 'z';

const number = (text) => Number(String(text ?? '').replace(',', '.')) || 0;
const fmt = (v) => String(Math.round(v * 1000) / 1000);

/** How far the zero is from where the tool stands: the sheet, and on a side the tool's radius too. */
export const offsetOf = (edge, mm) => mm.paperThickness + (edge === 'z' ? 0 : mm.toolDiameter / 2);

/** The jog key a step of move `name` is pressed with, `{ way, step, on }`, or null for a move not jogged. */
const clickOf = (name, p, edge) => {
  const move = MOVES[name];
  if (move.gap || move.steps.length < 2) {
    return null;
  }
  const { axis, sign } = EDGES_BY_ID[edge];
  const by = BACK.has(name) ? -sign : sign;
  const i = stepAt(move.steps, p);
  return {
    way: `${axis.toUpperCase()}${by > 0 ? '+' : '−'}`,
    step: name === 'coarse' ? 'probe.paper.mm1' : 'probe.paper.mm01',
    on: i > 0 && p - move.steps[i][0] < CLICK,
  };
};

/**
 * The drawing of move `name` at `p` — the sheet's history worked out up to
 * there; `texts` the figures, `say(field, text)` a figure as a label says it.
 */
export const paperScene = (name, p, {
  edge = 'z', texts = {}, say = (field, text) => text, focus = null, surface = SURFACE,
} = {}) => {
  const move = MOVES[name];
  const at = startOf(name) + p * RUN_MS;
  const sheet = sheetAt(at, scriptAt);
  const gap = gapOf(move, p);
  const feel = FEEL[feelAt(gap)];
  let zero = 0;
  if (move.zeroAt) {
    const [a, b] = move.zeroAt;
    zero = clamp((p - a) / (b - a));
  }
  const side = edge !== 'z';
  const paper = say('paperThickness', texts.paperThickness ?? '');
  return {
    gap,
    sheet: sheetShape(sheet),
    // What the tool does to the sheet, by its colour: none while it slides freely.
    tone: feel.tone || null,
    // "Here" is said once it drags; the zero's figures say the rest.
    tag: name === 'zero' ? null : (feelAt(gap) === 'drag' && move.tag) || feel.tag || null,
    // The jog: from where the steps began down to the tip, a tick a step.
    // Each step is one press of a jog key (review note, 2026-10-01): the key, lit as it is pressed.
    click: clickOf(name, p, edge),
    // The lift: a rapid off the surface, bare; its way a dimension on the other side.
    motion: name === 'lift' && gap > 0.6 && gap < LIFT + 0.4 ? { from: SHEET_Y - 0.5, to: SHEET_Y - gap, kind: 'rapid' } : null,
    lift: name === 'lift' ? {
      text: say('paperLift', texts.paperLift ?? ''), lit: focus === 'paperLift', top: SHEET_Y - 0.5 - LIFT, bottom: SHEET_Y - 0.5,
    } : null,
    jog: name === 'coarse' && gap < HIGH ? { from: HIGH, to: gap, every: STEP } : null,
    fine: name === 'fine' && gap < NEAR ? { from: NEAR, to: gap, every: FINE } : null,
    zero,
    axis: EDGES_BY_ID[edge].axis.toUpperCase(),
    dim: name === 'zero'
? {
      top: SHEET_Y, bottom: FACE_Y, text: paper, field: 'paperThickness',
    }
: null,
    dia: name === 'zero' && side ? { text: say('toolDiameter', texts.toolDiameter ?? '') } : null,
    side,
    mirror: mirrored(edge),
    focus,
    // On the top, where the sheet lies and Z0 goes; the work's thickness drawn at the zero and while set.
    surface: side ? SURFACE : surface,
    stock: !side && (move.after || focus === 'stockThickness')
      ? { text: say('stockThickness', texts.stockThickness ?? ''), lit: focus === 'stockThickness' }
      : null,
  };
};

/** The move's line: the jog as the pad sends it — down, or back up — or the zero written. */
export const paperCode = (name, edge, texts, wcs = 1, surface = SURFACE, mm = {
  paperThickness: number(texts.paperThickness), toolDiameter: number(texts.toolDiameter), stockThickness: number(texts.stockThickness),
}) => {
  const { axis, sign } = EDGES_BY_ID[edge];
  const A = axis.toUpperCase();
  const toward = sign > 0 ? '' : '-';
  if (name === 'coarse') {
    return `$J=G91 ${A}${toward}1`;
  }
  if (['fine', 'drag', 'resist', 'stuck'].includes(name)) {
    return `$J=G91 ${A}${toward}0.1`;
  }
  if (name === 'back' || name === 'here') {
    return `$J=G91 ${A}${toward ? '' : '-'}0.1`;
  }
  if (name === 'lift') {
    return `G0 ${A}${sign > 0 ? '-' : '+'}${fmt(number(texts.paperLift))}`;
  }
  const over = edge === 'z' ? overSurface(surface, mm.stockThickness) : 0;
  return `G10 L20 P${wcs} ${A}${fmt(-sign * offsetOf(edge, mm) + over)}`;
};

// An example of where the tool stood against the old zero, before it is written.
export const BEFORE_MM = 12.34;

/** The readout: the axis against the old zero before, the offset after — held, not following the moves. */
export const paperReadout = (name, edge, mm, surface = SURFACE) => {
  const after = Boolean(MOVES[name].after);
  const { axis, sign } = EDGES_BY_ID[edge];
  const over = edge === 'z' ? overSurface(surface, mm.stockThickness ?? 0) : 0;
  return { axis, value: after ? -sign * offsetOf(edge, mm) + over : BEFORE_MM, after };
};
