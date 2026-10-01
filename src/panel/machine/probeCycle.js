/**
 * The Z plate's cycle as its drawing moves through it — the design's proposal
 * (`templates/probe-z-proposal`, Claude Design, 2026-09-30): four moves in
 * two stages, each drawn by one rule — on the left the move's arrow with its
 * feed, on the right a grey dimension with the figure from the form.
 *
 * Nothing here is the machine's: heights are the drawing's units and the
 * timings are the drawing's. What a move *says* — its dimension, its feed,
 * its G-code — is made from the figures typed, so the drawing reads back
 * the form.
 */

import { SURFACE, surfaceShifts } from './surface';
import { frameAt, layOut, totalOf } from './timeline';

// The plate's top, where the tip touches, in the drawing's units.
export const TOP = 156;

// One move: played for `RUN`, then held to `SPAN` before the next.
export const SPAN_MS = 3400;
export const RUN_MS = 2600;
/*
 * A move looped on its own — picked on the bar, or its figure being set —
 * holds its end the same long while for every move, and longer than the
 * whole cycle's stop (review notes, 2026-09-30).
 */
export const LOOP_HOLD_MS = 2500;

// How high the tool starts the fast touch, and how far it backs off.
const HIGH = 84;
const BACK = 24;
const LIFT = 56;

// The tool's Z against the old zero at the touch — an example figure.
export const BEFORE_MM = 37.482;

const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2);

/** The tool's height above the plate at `p`, a fraction of one move, from `[at, height, eased]` keyframes. */
export const gapAt = (frames, p) => {
  for (let i = 0; i < frames.length - 1; i++) {
    const [a, from] = frames[i];
    const [b, to, eased] = frames[i + 1];
    if (p >= a && p <= b) {
      const u = (p - a) / Math.max(1e-6, b - a);
      return from + (to - from) * (eased ? ease(u) : u);
    }
  }
  return frames[frames.length - 1][1];
};

const number = (text) => Number(String(text ?? '').replace(',', '.')) || 0;
const fmt = (v) => String(Math.round(v * 1000) / 1000);

/**
 * How far the surface measured on is above Z0 (Mateusz, 2026-10-01,
 * `services/probe/surface`): the work's thickness when the plate is on the
 * work and Z0 on the table, less it when the plate is on the table and Z0 on
 * the top, nothing when they are the same.
 */
export const overSurface = (surface = SURFACE, stock = 0) => {
  if (!surfaceShifts(surface)) {
    return 0;
  }
  return surface.on === 'work' ? stock : -stock;
};

/*
 * Each move: its keyframes; the way it goes (`from` → `to`, heights) and how
 * (`kind`: `probe` a G38.2 touch in the accent, `rapid` a G0 dashed in the
 * rapid colour, as the Ścieżka screen draws them); the feed's figure; its
 * dimension — top and bottom heights on the drawing, the figure it shows,
 * `limit` for a search limit (dashed, one head) and `upTo` to say so; the
 * figures it uses, lit in the list beside it; `after` once the new zero is
 * written.
 */
const MOVES = {
  fast: {
    frames: [[0, HIGH], [0.15, HIGH], [0.7, 0, true], [1, 0]],
    from: HIGH, to: 0, kind: 'probe', feed: 'fast',
    dim: { top: TOP - HIGH, bottom: TOP + 26, field: 'maxZ', limit: true, upTo: true },
    titleKey: 'probe.plate.fast',
    code: (v) => [`G38.2 Z-${v.maxZ} F${v.fast}`],
    uses: ['fast', 'maxZ'],
  },
  retract: {
    frames: [[0, 0], [0.2, 0], [0.55, BACK, true], [1, BACK]],
    from: 0, to: BACK, kind: 'rapid', feed: null,
    dim: { top: TOP - BACK, bottom: TOP, field: 'retract' },
    titleKey: 'probe.plate.retract',
    code: (v) => [`G0 Z+${v.retract}`],
    uses: ['retract'],
  },
  slow: {
    frames: [[0, BACK], [0.15, BACK], [0.75, 0, true], [1, 0]],
    from: BACK, to: 0, kind: 'probe', feed: 'slow',
    // The slow touch searches twice the back-off (`services/probe/moves`): drawn as the two
    // they are — back to the plate, and the margin past it to the limit (review note, 2026-10-01).
    dim: { top: TOP - BACK, bottom: TOP + BACK, split: 'retract', upTo: true },
    titleKey: 'probe.plate.slow',
    code: (v) => [`G38.2 Z-${number(v.retract) * 2} F${v.slow}`],
    uses: ['slow', 'retract'],
  },
  // The zero written at the touch, and the lift off the plate after it: two
  // moves, two segments of the bar (review note, 2026-09-30).
  zero: {
    frames: [[0, 0], [1, 0]],
    from: 0, to: 0, kind: null, feed: null, zeroAt: [0.25, 0.45],
    dim: { top: TOP, bottom: TOP + 14, field: 'plateThickness' },
    titleKey: 'probe.plate.zero',
    code: (v, wcs, surface) => [`G10 L20 P${wcs} Z${fmt(number(v.plateThickness) + overSurface(surface, number(v.stockThickness)))}`],
    uses: ['plateThickness'],
    after: true,
  },
  lift: {
    frames: [[0, 0], [0.2, 0], [0.6, LIFT, true], [1, LIFT]],
    from: 0, to: LIFT, kind: 'rapid', feed: null,
    // The zero is written by now: its line stays.
    zeroAt: [-1, 0],
    dim: { top: TOP - LIFT, bottom: TOP, field: 'lift' },
    titleKey: 'probe.plate.lift',
    code: (v) => [`G0 Z+${v.lift}`],
    uses: ['lift'],
    after: true,
  },
  // What the limit means: no plate, the whole way down, and the alarm.
  miss: {
    frames: [[0, HIGH], [0.1, HIGH], [0.7, -26, true], [1, -26]],
    from: HIGH, to: -26, kind: 'probe', feed: 'fast', miss: true, alarmAt: 0.7,
    dim: { top: TOP - HIGH, bottom: TOP + 26, field: 'maxZ', limit: true, upTo: true },
    titleKey: 'probe.plate.miss',
    code: () => ['ALARM:5'],
    uses: ['maxZ'],
  },
};

/*
 * The whole cycle's moves in order, grouped as the bar under the drawing
 * shows them: the stage (Z, then the zero) and within it the step.
 */
export const PLATE_ORDER = ['fast', 'retract', 'slow', 'zero', 'lift'];

/*
 * Z being the one axis, its steps are the stages themselves — no Z above
 * them (review note, 2026-09-30). Each named only folded: open, its one step
 * names it.
 */
export const PLATE_GROUPS = [
  { id: 'search', key: 'probe.stage.search', folded: true, subs: [{ key: 'probe.stage.search', moves: ['fast'] }] },
  { id: 'measure', key: 'probe.bar.measure', folded: true, subs: [{ key: 'probe.bar.measure', moves: ['retract', 'slow'] }] },
  { id: 'zero', key: 'probe.bar.zero', folded: true, subs: [{ key: 'probe.stage.zero', moves: ['zero', 'lift'] }] },
];

/*
 * A figure being set loops the move it changes, with its part of the drawing
 * lit (`focus`: `dim` its dimension, `feed` the arrow's feed). The travel
 * limit loops twice: the touch, then the same way with no plate.
 */
const EDIT = {
  maxZ: [['fast', 'dim'], ['miss', 'dim']],
  fast: [['fast', 'feed']],
  retract: [['retract', 'dim']],
  slow: [['slow', 'feed']],
  plateThickness: [['zero', 'dim']],
  stockThickness: [['zero', 'stock']],
  lift: [['lift', 'dim']],
};

/*
 * The figures in the list beside the drawing, by what they are about
 * (proposal: Płytka, Pomiar, Dojazd, Przejazdy).
 */
export const PLATE_PARAMS = [
  { id: 'plate', key: 'probe.group.plate', fields: ['plateThickness'] },
  { id: 'measure', key: 'probe.group.measure', fields: ['fast', 'slow', 'retract'] },
  { id: 'reach', key: 'probe.group.reach', fields: ['maxZ'] },
  { id: 'moves', key: 'probe.group.moves', fields: ['lift'] },
  // Where Z0 goes, last and closed; the work's thickness in it only while needed (`SurfaceChoice`).
  { id: 'z0', key: 'probe.surface.title', fields: ['stockThickness'], surface: true },
];

export const moveOf = (name) => MOVES[name];

/** Where through its run a move stops changing: its last keyframe that moves, the zero come in, the alarm up. */
export const motionEnd = (name) => {
  const move = MOVES[name];
  let end = 0;
  move.frames.forEach(([at, height], i) => {
    if (i && height !== move.frames[i - 1][1]) {
      end = at;
    }
  });
  if (move.zeroAt) {
    end = Math.max(end, move.zeroAt[1]);
  }
  return Math.max(end, move.alarmAt || 0);
};

/** The cycle on its clock, for the Setup's player: each move a span, one segment up to where it stops changing. */
export const plateTimeline = () => layOut(PLATE_ORDER, {
  spanOf: () => SPAN_MS,
  runOf: () => RUN_MS,
  partsOf: (name) => [[0, motionEnd(name)]],
});

/**
 * Which move plays at `ms`, and how far into it: the whole cycle, or `pinned`
 * alone — the machine's step on the measurement screen — or, a figure being
 * set, its loop, each move held longer (`span` is how long one lasts).
 * `still` holds every move at its end (the system asks for reduced motion).
 */
export const playAt = (ms, { pinned = null, field = null, still = false } = {}) => {
  if (!(field && EDIT[field]) && !pinned) {
    const items = plateTimeline();
    const frame = frameAt(items, ms % totalOf(items));
    return { ...frame, focus: null, p: still ? 1 : frame.p };
  }
  const loop = field && EDIT[field] ? EDIT[field] : [[pinned, null]];
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

/**
 * The drawing of move `name` at `p`, with `texts` the figures as typed and
 * `say(field, text)` a figure as a label says it (`F50`, `5 mm`), `upTo(v)`
 * as a search limit says it: everything the scene draws, in the drawing's
 * units.
 */
export const plateScene = (name, p, {
  texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null, surface = SURFACE,
} = {}) => {
  const said = (field) => say(field, texts[field] ?? '');
  const move = MOVES[name];
  const gap = gapAt(move.frames, p);
  const dim = move.dim || null;
  let dimText = null;
  let beyond = null;
  if (dim?.split) {
    // Twice a figure: the first way plain, the second a limit — "≤" on the margin alone.
    const mid = (dim.top + dim.bottom) / 2;
    dimText = said(dim.split);
    beyond = {
      top: mid, bottom: dim.bottom, limit: true, text: upTo(`+${said(dim.split)}`),
    };
  } else if (dim) {
    const figure = said(dim.field);
    dimText = dim.upTo ? upTo(figure) : figure;
  }
  let motion = null;
  if (move.kind && move.from !== move.to) {
    motion = { from: TOP - move.from, to: TOP - move.to, kind: move.kind, feed: move.feed ? said(move.feed) : null };
  }
  let zero = 0;
  if (move.zeroAt) {
    const [a, b] = move.zeroAt;
    zero = Math.min(1, Math.max(0, (p - a) / (b - a)));
  }
  return {
    gap,
    dim: dim ? {
      top: dim.top, bottom: beyond ? beyond.top : dim.bottom, limit: Boolean(dim.limit), text: dimText, beyond,
    } : null,
    motion,
    // The feed is said by the arrow's colour alone while a dimension is
    // drawn; its figure comes up only when it is the one being set.
    feedTag: Boolean(motion?.feed && (focus || !dim)),
    zero,
    contact: !move.miss && gap < 0.5,
    ghost: Boolean(move.miss),
    alarm: Boolean(move.miss && p >= move.alarmAt),
    focus,
    surface,
    // The work's thickness, drawn once the zero is written and while it is being set.
    stock: move.after || focus === 'stock' ? { text: said('stockThickness'), lit: focus === 'stock' } : null,
  };
};

/** The move's G-code, with the figures typed and the coordinate system's number. */
export const plateCode = (name, texts, wcs = 1, surface = SURFACE) => MOVES[name].code(texts, wcs, surface).join(' ');

/*
 * The tool's Z at the touch, as the readout says it: against the old zero
 * before it is written, the plate's thickness after — held, not following
 * the moves (review note, 2026-09-30: *"stała wartość przed i stała wartość
 * po, bez zmiany przy ruchu, która może rozpraszać"*).
 */
export const plateReadout = (name, mm, surface = SURFACE) => {
  const after = Boolean(MOVES[name].after);
  return { z: after ? mm.plateThickness + overSurface(surface, mm.stockThickness ?? 0) : BEFORE_MM, after };
};

/*
 * Getting the tool into place before measuring (review note, 2026-09-29: the
 * position step as the machine moving over the plate): from off to the side
 * and high, across until it is over the plate, then down to a few
 * millimetres above it, and a while there before it starts again — slower,
 * and held longer at the end (review note, 2026-09-30).
 */
export const POSITION_MS = 7000;
const ASIDE = -100;
const HIGH_OVER = 70;
export const OVER = 22;

export const positionAt = (ms) => {
  const p = (ms % POSITION_MS) / POSITION_MS;
  const across = Math.min(1, Math.max(0, (p - 0.1) / 0.3));
  const down = Math.min(1, Math.max(0, (p - 0.45) / 0.2));
  const gap = HIGH_OVER + (OVER - HIGH_OVER) * ease(down);
  const descending = down > 0 && down < 1;
  return {
    shift: ASIDE * (1 - ease(across)),
    gap,
    motion: descending ? { from: TOP - HIGH_OVER, to: TOP - OVER, kind: 'rapid', feed: null } : null,
    over: down >= 1,
  };
};

/*
 * What the machine is doing, as the move whose part of the cycle it is —
 * the server's step names (`services/probe/moves`), so the measurement
 * screen plays the move the machine is in.
 */
const PHASE_MOVE = {
  'z-fast': 'fast',
  'z-back': 'retract',
  'z-settle': 'retract',
  z: 'slow',
  lift: 'lift',
};

export const moveOfPhase = (phase) => PHASE_MOVE[phase] || 'fast';
