/**
 * The L plate's moves, as its drawings play them (Claude Design,
 * `templates/probe-corner-proposal`, 2026-09-30) and as the server runs them
 * (`services/probe/strategies/corner`): positions of the front-left corner in
 * the drawing's units, the figures each move uses and says, and its G-code.
 * The cycle through them is `cornerCycle`.
 */

const number = (text) => Number(String(text ?? '').replace(',', '.')) || 0;
const sum = (...texts) => String(texts.reduce((all, text) => all + number(text), 0));

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
 * dashed); a set-up's legs (`legs`, `[from, to, plane, label(texts, say), code,
 * word, parts]` — `word` its own short name, `parts` the two figures a Z leg
 * adds up, below and above the plate's top, review notes 2026-09-30);
 * its dimension or the figure by its arrow; the touch it makes; its G-code;
 * and the figures it uses, lit in the list beside it.
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
  xSet: {
    group: 'x', view: 'top',
    frames: [[0, C0, 1], [0.05, C0, 1], [0.45, XO, 1], [0.55, XO, 1], [0.95, XO, 0], [1, XO, 0]],
    legs: [
      [0, 0.5, 'xy', (v, say) => say('clear', v.clear), (v) => `G0 X-${v.clear}`, 'out'],
      [0.5, 1, 'z', () => '', (v) => `G38.3 Z-${sum(v.retract, v.depth)} F${v.fast}`, 'down', ['depth', 'retract']],
    ],
    titleKey: 'probe.corner.move.xSet',
    uses: ['retract', 'clear', 'depth'],
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
  ySet: {
    group: 'y', view: 'top',
    frames: [[0, XB, 0], [0.05, XB, 0], [0.21, XB, 1], [0.25, XB, 1], [0.46, YM, 1], [0.5, YM, 1], [0.71, YO, 1], [0.75, YO, 1], [0.96, YO, 0], [1, YO, 0]],
    legs: [
      [0, 0.25, 'z', () => '', (v) => `G0 Z+${sum(v.retract, v.depth)}`, 'up', ['depth', 'retract']],
      // Back over the plate, to where Z was touched: a place, not a figure of the form's — its
      // line says so in words, there being no numbers to show (review note, 2026-10-01).
      [0.25, 0.5, 'xy', () => '', () => null, 'over'],
      [0.5, 0.75, 'xy', (v, say) => say('clear', v.clear), (v) => `G0 Y-${v.clear}`, 'out'],
      [0.75, 1, 'z', () => '', (v) => `G38.3 Z-${sum(v.retract, v.depth)} F${v.fast}`, 'down', ['depth', 'retract']],
    ],
    titleKey: 'probe.corner.move.ySet',
    uses: ['retract', 'clear', 'depth'],
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
  // lift after it — two segments of the bar, as the Z plate's.
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
   * already, straight up to the lift, and over the corner found, X0 Y0.
   */
  lift: {
    group: 'zero', view: 'both', frames: [[0, YB, 0], [0.05, YB, 0], [0.45, YB, LIFTED], [0.55, YB, LIFTED], [0.95, K0, LIFTED], [1, K0, LIFTED]], zero: true, zeroAt: 1, kind: 'rapid',
    rise: 'lift',
    // Its moves one by one, each on the bar and said under it (review note, 2026-09-30).
    legs: [
      [0, 0.5, 'z', () => '', (v) => `G0 Z+${sum(v.depth, v.lift)}`, 'lift', ['depth', 'lift']],
      [0.5, 1, 'xy', () => '', () => 'G0 X0 Y0', 'corner'],
    ],
    legsKey: 'probe.corner.move.liftLeg',
    titleKey: 'probe.corner.move.lift',
    code: (v) => [`G0 Z+${v.lift}`],
    uses: ['lift'],
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
