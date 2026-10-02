/**
 * The L plate's moves, as its drawings play them (Claude Design,
 * `templates/probe-corner-proposal`, 2026-09-30) and as the server runs them
 * (`services/probe/strategies/corner`): positions of the front-left corner in
 * the drawing's units, the figures each move uses and says, and its G-code.
 * The cycle through them is `cornerCycle`.
 */

import { slowReachWhy } from './probeFields';

const number = (text) => Number(String(text ?? '').replace(',', '.')) || 0;
const sum = (...texts) => String(texts.reduce((all, text) => all + number(text), 0));

/** A Z move's way, the sum of its two figures (`parts`). */
export const sumOf = (move, texts) => sum(...move.parts.map((field) => texts[field]));

/*
 * Where a Z move's figure comes from, said under the drawing after its title
 * (rule 1, Mateusz 2026-10-02) — `[key, vars]`, or null.
 */
const SUM_KEYS = { 'depth,retract': 'probe.sum.retractDepth', 'depth,lift': 'probe.sum.depthLift' };
export const explainOf = (move, texts, say = (field, text) => text) => {
  if (move.feed === 'slow') {
    return slowReachWhy(texts, say);
  }
  return move.parts
    ? [SUM_KEYS[move.parts.join()], { sum: say(move.parts[0], sumOf(move, texts)), ...Object.fromEntries(move.parts.map((field) => [field, say(field, texts[field])])) }]
    : null;
};

// Where the tool stands from above: over the plate, out past each wall, at
// each wall (a radius off it) and backed off it.
export const C0 = [142, 116];
// How high the lift takes the tool, as a level (1 is a back-off over the plate's top).
export const LIFTED = 1.6;
export const XO = [75, 116];
const XC = [98.8, 116];
const XB = [86.8, 116];
const YM = [154, 116];
const YO = [154, 195];
const YC = [154, 171.2];
const YB = [154, 183.2];
// The corner found, X0 Y0, where the lift ends (Mateusz, 2026-09-30).
const K0 = [130, 140];

/*
 * Each move: from which view it is drawn (`side` a Z touch, `top` a move on
 * the wall's plane); its keyframes (a Z touch by its `gap` over the plate's
 * top); the way it goes and how (`probe` a G38.2 in the accent, `rapid` a G0
 * dashed); its dimension or the figure by its arrow; the touch it makes; its
 * G-code; and the figures it uses, lit in the list beside it.
 *
 * A set-up and the lift are a move a line of G-code (rule, Mateusz
 * 2026-10-02), each on its `plane`: `xy` with the figure it goes by (`say`),
 * `z` with the two figures it adds up (`parts`, below and above the plate's
 * top), said as their sum (rule 1) — `down` a G38.3, the rest G0.
 */
export const MOVES = {
  zFast: {
    group: 'z', view: 'side', gap: [40, 0], kind: 'probe', feed: 'fast',
    dim: { from: 106, to: 154, field: 'maxZ', limit: true },
    titleKey: 'probe.corner.move.zFast',
    code: (v) => [`G38.2 Z-${v.maxZ} F${v.fast}`],
    uses: ['fast', 'maxZ'],
  },
  zBack: {
    group: 'z', view: 'side', gap: [0, 12], kind: 'rapid', feed: null,
    dim: { from: 134, to: 146, field: 'retract' },
    titleKey: 'probe.corner.move.zBack',
    code: (v) => [`G0 Z+${v.retract}`],
    uses: ['retract'],
  },
  zSlow: {
    group: 'z', view: 'side', gap: [12, 0], kind: 'probe', feed: 'slow',
    // Twice the back-off, drawn as the two: back to the plate, and the margin past it (review note, 2026-10-01).
    dim: { from: 134, to: 158, split: 'retract' },
    titleKey: 'probe.corner.move.zSlow',
    code: (v) => [`G38.2 Z-${number(v.retract) * 2} F${v.slow}`],
    uses: ['slow', 'retract'],
  },
  // Off the touch that counts, a move of its own (rule, Mateusz 2026-10-01).
  zOff: {
    group: 'z', view: 'side', gap: [0, 12], kind: 'rapid', feed: null,
    dim: { from: 134, to: 146, field: 'retract' },
    titleKey: 'probe.corner.move.zOff',
    code: (v) => [`G0 Z+${v.retract}`],
    uses: ['retract'],
  },
  xOut: {
    group: 'x', view: 'top', plane: 'xy',
    frames: [[0, C0, 1], [0.1, C0, 1], [0.9, XO, 1], [1, XO, 1]],
    say: (v, say) => say('travel', v.travel),
    titleKey: 'probe.corner.move.xOut',
    code: (v) => [`G0 X-${v.travel}`],
    uses: ['travel'],
  },
  xDown: {
    group: 'x', view: 'top', plane: 'z', down: true, parts: ['depth', 'retract'],
    frames: [[0, XO, 1], [0.1, XO, 1], [0.9, XO, 0], [1, XO, 0]],
    titleKey: 'probe.corner.move.xDown',
    code: (v) => [`G38.3 Z-${sum(v.retract, v.depth)} F${v.fast}`],
    uses: ['depth', 'retract'],
  },
  xFast: {
    group: 'x', view: 'top', frames: [[0, XO, 0], [0.15, XO, 0], [0.75, XC, 0], [1, XC, 0]], kind: 'probe', feed: 'fast',
    dim: { name: 'limitX', field: 'maxXY' }, touch: [106, 116], by: 'fast',
    titleKey: 'probe.corner.move.xFast',
    code: (v) => [`G38.2 X+${v.maxXY} F${v.fast}`],
    uses: ['fast', 'maxXY'],
  },
  xBack: {
    group: 'x', view: 'top', frames: [[0, XC, 0], [0.2, XC, 0], [0.6, XB, 0], [1, XB, 0]], kind: 'rapid', feed: null,
    by: 'retract',
    titleKey: 'probe.corner.move.xBack',
    code: (v) => [`G0 X-${v.retract}`],
    uses: ['retract'],
  },
  xSlow: {
    group: 'x', view: 'top', frames: [[0, XB, 0], [0.15, XB, 0], [0.75, XC, 0], [1, XC, 0]], kind: 'probe', feed: 'slow',
    by: 'slow', touch: [106, 116],
    titleKey: 'probe.corner.move.xSlow',
    code: (v) => [`G38.2 X+${number(v.retract) * 2} F${v.slow}`],
    uses: ['slow', 'retract'],
  },
  /*
   * Backed off the X wall first, as the server does — rising straight off the
   * touch drew the tool rubbing along the work (review note, 2026-09-30).
   */
  xOff: {
    group: 'x', view: 'top', frames: [[0, XC, 0], [0.2, XC, 0], [0.6, XB, 0], [1, XB, 0]], kind: 'rapid', feed: null,
    by: 'retract', touch: [106, 116],
    titleKey: 'probe.corner.move.xOff',
    code: (v) => [`G0 X-${v.retract}`],
    uses: ['retract'],
  },
  yUp: {
    group: 'y', view: 'top', plane: 'z', parts: ['depth', 'retract'],
    frames: [[0, XB, 0], [0.1, XB, 0], [0.9, XB, 1], [1, XB, 1]],
    titleKey: 'probe.corner.move.yUp',
    code: (v) => [`G0 Z+${sum(v.retract, v.depth)}`],
    uses: ['depth', 'retract'],
  },
  // Back over the plate, to where Z was touched: a place, not a figure of the form's — its
  // line says so in words, there being no numbers to show (review note, 2026-10-01).
  yOver: {
    group: 'y', view: 'top', plane: 'xy',
    frames: [[0, XB, 1], [0.1, XB, 1], [0.9, YM, 1], [1, YM, 1]],
    say: () => '',
    titleKey: 'probe.corner.move.yOver',
    code: () => [],
    uses: [],
  },
  yOut: {
    group: 'y', view: 'top', plane: 'xy',
    frames: [[0, YM, 1], [0.1, YM, 1], [0.9, YO, 1], [1, YO, 1]],
    say: (v, say) => say('travel', v.travel),
    titleKey: 'probe.corner.move.yOut',
    code: (v) => [`G0 Y-${v.travel}`],
    uses: ['travel'],
  },
  yDown: {
    group: 'y', view: 'top', plane: 'z', down: true, parts: ['depth', 'retract'],
    frames: [[0, YO, 1], [0.1, YO, 1], [0.9, YO, 0], [1, YO, 0]],
    titleKey: 'probe.corner.move.yDown',
    code: (v) => [`G38.3 Z-${sum(v.retract, v.depth)} F${v.fast}`],
    uses: ['depth', 'retract'],
  },
  yFast: {
    group: 'y', view: 'top', frames: [[0, YO, 0], [0.15, YO, 0], [0.75, YC, 0], [1, YC, 0]], kind: 'probe', feed: 'fast',
    dim: { name: 'limitY', field: 'maxXY' }, touch: [154, 164], by: 'fast',
    titleKey: 'probe.corner.move.yFast',
    code: (v) => [`G38.2 Y+${v.maxXY} F${v.fast}`],
    uses: ['fast', 'maxXY'],
  },
  yBack: {
    group: 'y', view: 'top', frames: [[0, YC, 0], [0.2, YC, 0], [0.6, YB, 0], [1, YB, 0]], kind: 'rapid', feed: null,
    by: 'retract',
    titleKey: 'probe.corner.move.yBack',
    code: (v) => [`G0 Y-${v.retract}`],
    uses: ['retract'],
  },
  ySlow: {
    group: 'y', view: 'top', frames: [[0, YB, 0], [0.15, YB, 0], [0.75, YC, 0], [1, YC, 0]], kind: 'probe', feed: 'slow',
    by: 'slow', touch: [154, 164],
    titleKey: 'probe.corner.move.ySlow',
    code: (v) => [`G38.2 Y+${number(v.retract) * 2} F${v.slow}`],
    uses: ['slow', 'retract'],
  },
  yOff: {
    group: 'y', view: 'top', frames: [[0, YC, 0], [0.2, YC, 0], [0.6, YB, 0], [1, YB, 0]], kind: 'rapid', feed: null,
    by: 'retract', touch: [154, 164],
    titleKey: 'probe.corner.move.yOff',
    code: (v) => [`G0 Y-${v.retract}`],
    uses: ['retract'],
  },
  // The zero, written: Z0 from the side, then X0 and Y0 from above; and the
  // lift and the way over X0 Y0 after it.
  zero: {
    group: 'zero', view: 'both', frames: [[0, YB, 0], [1, YB, 0]], zero: true,
    walls: true, touch: [154, 164],
    titleKey: 'probe.corner.move.zero',
    code: (v, wcs) => [`G10 L20 P${wcs}`],
    uses: ['cornerThickness', 'wallX', 'wallY', 'toolDiameter'],
    after: true,
  },
  /*
   * As the server runs it (review notes, 2026-09-30: the tool rose along the
   * wall; going back over the plate was a move too many): off the Y wall
   * already, straight up to the lift, then over the corner found, X0 Y0.
   */
  lift: {
    group: 'zero', view: 'both', plane: 'z', parts: ['depth', 'lift'],
    frames: [[0, YB, 0], [0.1, YB, 0], [0.9, YB, LIFTED], [1, YB, LIFTED]], zero: true, zeroAt: 1,
    rise: 'lift',
    titleKey: 'probe.corner.move.lift',
    code: (v) => [`G0 Z+${sum(v.depth, v.lift)}`],
    uses: ['depth', 'lift'],
    after: true,
  },
  corner: {
    group: 'zero', view: 'top', plane: 'xy',
    frames: [[0, YB, LIFTED], [0.1, YB, LIFTED], [0.9, K0, LIFTED], [1, K0, LIFTED]], zero: true, zeroAt: 1,
    say: () => '',
    titleKey: 'probe.corner.move.corner',
    code: () => ['G0 X0 Y0'],
    uses: [],
    after: true,
  },
  // Down beside the wall, from the side — the one place its depth shows.
  depth: {
    group: 'x', view: 'side', frames: [[0, XO, 1], [0.15, XO, 1], [0.75, XO, 0], [1, XO, 0]], kind: 'probe', depthOf: true,
    titleKey: 'probe.corner.move.depth',
    code: (v) => [`G38.3 Z-${sum(v.retract, v.depth)} F${v.fast}`],
    uses: ['depth'],
  },
};
