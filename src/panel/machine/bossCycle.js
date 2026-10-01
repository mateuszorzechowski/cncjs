/**
 * The centre of a part, touched from outside, as its drawing moves through
 * it (Mateusz, 2026-10-01; the server's `services/probe/strategies/boss`):
 * seen from above, the ball touches the top first, then for each side goes
 * out past it over the top, down beside it, touches it moving in and rises
 * again — +X, −X, to the middle, then the same across Y; twice, or once
 * (`passes`). Then X0 Y0 is written there; Z is not touched.
 *
 * In the corner's steps (review note, 2026-10-01: *"w pomiarze XYZ wygląda
 * inaczej"*): the top's search and its measuring; each side's set-up (out,
 * down), fast touch, back off, slow touch, and the way up — each a move of
 * its own on the bar, with its own line and arrow.
 *
 * Height is drawn as size, as the corner and the hole do: the ball larger
 * the higher it is — `level` 1 where it starts, `ABOVE` just over the top,
 * 0 down beside a side.
 *
 * Positions are the drawing's units, the part's centre at the origin and Y
 * up; the figures said come from the form. Nothing here is the machine's.
 */

import {
  AXES, BACK, BOSS_R, HOLD_MS, LOOP_HOLD_MS, ON_TOP, RUNS, START, TOOL_R, build, clamp, ease, isGoing, legAt, setOn, toolAt,
} from './bossMoves';
import { bossSide } from './bossSide';
import { frameAt, layOut, totalOf } from './timeline';

const { moves: MOVES, order: ORDER } = build();

/** The moves in order, for one pass or two. */
export const bossOrder = (passes = 2) => ORDER.filter((name) => passes !== 1 || MOVES[name].pass !== 2);
export const moveOf = (name) => MOVES[name];

/** A move's spoken name: `t(key, vars)`. */
export const titleOf = (name) => {
  const move = MOVES[name];
  return [move.titleKey, { pass: move.pass, axis: move.way }];
};

const STEPS = ['Set', 'Fast', 'Back', 'Slow', 'Up'];

/** The bar's stages, as the corner's: the top's search and measuring, each pass across X and across Y, the zero. */
export const bossGroups = (passes = 2) => [{
  id: 'z', name: 'Z', subs: [{ key: 'probe.stage.search', moves: ['zFast'] }, { key: 'probe.bar.measure', moves: ['zBack', 'zSlow'] }],
}].concat([1, 2].slice(0, passes).flatMap((pass) => AXES.map((axis) => {
  const AXIS = axis.toUpperCase();
  return {
    id: `${axis}${pass}`,
    name: passes > 1 ? `${AXIS} · ${pass}` : AXIS,
    subs: [
      { name: `${AXIS}+`, moves: STEPS.map((step) => `${axis}${pass}p${step}`) },
      { name: `${AXIS}−`, moves: STEPS.map((step) => `${axis}${pass}m${step}`) },
      { key: 'probe.hole.middle', moves: [`${axis}${pass}c`] },
    ],
  };
}))).concat([{
  id: 'zero', key: 'probe.bar.zero', folded: true, subs: [{ key: 'probe.stage.zero', moves: ['zero'] }],
}]);

export const BOSS_PARAMS = [
  { id: 'part', key: 'probe.group.part', fields: ['bossSize'] },
  { id: 'reach', key: 'probe.group.reach', fields: ['clear', 'depth', 'maxZ'] },
  // How many passes, a switch at the group's head.
  { id: 'measure', key: 'probe.group.measure', fields: ['fast', 'slow', 'retract'], passes: true },
  // Only for the part's size said back: the centre needs no radius.
  { id: 'probe', key: 'probe.group.probe', fields: ['ballDiameter'] },
];

// A figure being set loops the step it changes, its part lit.
const EDIT = {
  bossSize: ['x1pSet', 'size'],
  clear: ['x1pSet', 'clear'],
  depth: ['x1pSet', 'depth'],
  fast: ['x1pFast', 'feed'],
  slow: ['x1pSlow', 'feed'],
  retract: ['x1pBack', 'retract'],
  maxZ: ['zFast', 'dim'],
  ballDiameter: ['zero', 'dim'],
};

const runOf = (name) => RUNS[MOVES[name].kind];

// A set-up's legs are a segment each on the bar, as the corner's.
const partsOf = (name) => (MOVES[name].legs ? MOVES[name].legs.map((leg) => [leg.from, leg.to]) : [[0, MOVES[name].end]]);

export const bossTimeline = (passes = 2) => layOut(bossOrder(passes), {
  spanOf: (name) => runOf(name) + HOLD_MS,
  runOf,
  partsOf,
});

const ITEMS = { 1: bossTimeline(1), 2: bossTimeline(2) };

/** Which move plays at `ms`: the cycle of `passes`, a figure's loop, or `pinned` alone. */
export const playAt = (ms, {
  pinned = null, field = null, still = false, passes = 2,
} = {}) => {
  const [alone, focus] = (field && EDIT[field]) || (pinned ? [pinned, null] : [null, null]);
  if (!alone) {
    const items = ITEMS[passes] || ITEMS[2];
    const frame = frameAt(items, ms % totalOf(items));
    return { ...frame, focus: null, p: still ? 1 : frame.p };
  }
  const run = runOf(alone);
  const span = run * MOVES[alone].end + LOOP_HOLD_MS;
  const into = ms % span;
  return {
    name: alone, focus, p: still ? 1 : Math.min(1, into / run), span, run, into,
  };
};

const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5;

// Where the ball meets the side, from where its centre stands then.
const onSide = (centre) => [centre[0] * (BOSS_R / (BOSS_R + TOOL_R)), centre[1] * (BOSS_R / (BOSS_R + TOOL_R))];

// The steps after a side's fast touch: the side is touched.
const TOUCHED = ['back', 'slow', 'up'];

/*
 * What each step draws from above, apart from the ball: an arrow, a word
 * by the ball for what goes up and down. `said` a figure's words, `lit(part)`
 * whether the figure being set is that part.
 */
const above = (move, p, going, said, upTo, lit, { reach, rise }) => {
  const arrow = (from, to, kind, feed = null, on = false) => (going
? {
    axis: move.axis, from, to, kind, feed, lit: on,
  }
: null);
  switch (move.kind) {
    case 'topFast': return { tag: { text: `Z ${upTo(said('maxZ'))}`, lit: lit('dim') } };
    case 'topBack': return { tag: { text: `↑ ${said('retract')}`, lit: lit('retract') } };
    case 'topSlow': return { tag: { text: `↓ ${said('slow')}`, lit: lit('feed') } };
    case 'set': return legAt(p).name === 'out' ? { motion: arrow(move.from, move.out, 'rapid') } : { tag: { text: `↓ ${said('depth')}`, lit: lit('depth') } };
    // The search goes in no further than the middle thought.
    // Its reach: half the part's width and the way out past it (review note, 2026-10-01: *"w pomiarze czopa brakuje odległości"*).
    case 'fast': return { motion: arrow(move.out, move.wall, 'probe', said('fast'), lit('feed')), limit: { axis: move.axis, from: move.out, to: setOn(move.axis, move.out, move.guess), text: upTo(reach), lit: false } };
    // As the Z plate's: the arrow bare, the way back a dimension with its figure.
    case 'back': return { motion: arrow(move.wall, move.off, 'rapid'), dims: [{ id: 'retract', axis: move.axis, from: move.wall, to: move.off, text: said('retract'), lit: lit('retract') }] };
    // The slow touch, from off the side, with its own feed; it searches twice the back-off, drawn as the two they
    // are — back to the side, and the margin past it to the limit — as the Z plate's (review notes, 2026-10-01).
    case 'slow': return {
      motion: arrow(move.off, move.wall, 'probe', said('slow'), lit('feed')),
      dims: [{ id: 'retract', axis: move.axis, from: move.off, to: move.wall, text: said('retract'), lit: lit('retract'), tagAt: 0.15 }],
      // Its words a row lower, or past its end: apart from the way back's.
      limit: {
        axis: move.axis, from: move.wall, to: setOn(move.axis, move.wall, move.wall[AXES.indexOf(move.axis)] - move.sign * BACK), text: upTo(said('retract')), lit: lit('retract'), tagAt: 1.6, row: 1,
      },
    };
    case 'up': return { tag: { text: `↑ ${rise}`, lit: false } };
    case 'centre': return { motion: arrow(move.from, move.to, 'rapid') };
    default: return {};
  }
};

/**
 * The drawing of move `name` at `p`: the ball's centre and height, the arrow
 * of the step under way, a figure's dimension, the sides this pass has
 * touched, the touch under way and the zero's lines. `texts` the figures,
 * `say(field, text)` one as a label says it, `upTo(v)` as a limit.
 */
export const bossScene = (name, p, {
  texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null,
} = {}) => {
  const move = MOVES[name];
  const { at: tool, level } = toolAt(move, p);
  const said = (field) => say(field, texts[field] ?? '');
  const lit = (part) => focus === part;
  // Each side this pass touched before this step, once its fast touch is done — this one's too.
  const sides = [...new Set(ORDER.slice(0, ORDER.indexOf(name))
    .filter((one) => MOVES[one].kind === 'fast' && MOVES[one].pass === move.pass && (MOVES[one].side !== move.side || TOUCHED.includes(move.kind)))
    .map((one) => MOVES[one].side))];
  const {
    motion = null, limit = null, tag = null, dims: stepDims = [],
  } = above(move, p, isGoing(move, p), said, upTo, lit, {
    reach: say('clear', fmt(numberOf(texts.bossSize) / 2 + numberOf(texts.clear))),
    rise: say('depth', fmt(numberOf(texts.depth) + numberOf(texts.retract))),
  });
  // The part's rough width, and how far out past it, on a set-up.
  let dims = stepDims;
  if (move.kind === 'set') {
    const edge = setOn(move.axis, move.out, move.guess + move.sign * BOSS_R);
    dims = [
      { id: 'clear', axis: move.axis, from: edge, to: move.out, text: said('clear'), lit: lit('clear') },
      {
        // Its words a quarter of the way, off the middle where the touches across X sit.
        id: 'size', axis: move.axis, from: setOn(move.axis, move.out, move.guess - move.sign * BOSS_R), to: edge, text: said('bossSize'), lit: lit('size'), tagAt: 0.25,
      },
    ];
  }
  const zero = move.zeroAt ? clamp((p - move.zeroAt[0]) / (move.zeroAt[1] - move.zeroAt[0])) : 0;
  let contact = null;
  if ((move.kind === 'fast' || move.kind === 'slow') && near(tool, move.wall)) {
    contact = onSide(move.wall);
  } else if ((move.kind === 'topFast' || move.kind === 'topSlow') && Math.abs(level - ON_TOP) < 0.01) {
    contact = tool;
  }
  return {
    tool,
    level,
    motion,
    limit,
    dims,
    tag,
    touched: sides.map((side) => onSide(MOVES[`${side}Fast`].wall)),
    contact,
    centre: move.kind === 'centre' && p >= move.end ? move.to : null,
    zero,
    // The ball's diameter, the one figure the zero uses: it is taken off to say the part's size.
    dia: move.kind === 'zero' ? { text: `Ø${said('ballDiameter')}`, lit: lit('dim'), fade: zero } : null,
    focus,
  };
};

const numberOf = (text) => Number(String(text ?? '').replace(',', '.'));
const fmt = (v) => String(Math.round(v * 1000) / 1000);

/** The step's line at `p`, with the figures typed; a way with no figures is said in words, `[key]`. */
export const bossCode = (name, texts, wcs = 1, p = 0) => {
  const move = MOVES[name];
  const twice = fmt(2 * numberOf(texts.retract));
  const down = fmt(numberOf(texts.retract) + numberOf(texts.depth));
  const AXIS = move.axis?.toUpperCase();
  // Moving in towards the part is against the side's sign.
  const inward = `${AXIS}${move.sign > 0 ? '-' : '+'}`;
  const outward = `${AXIS}${move.sign > 0 ? '+' : '-'}`;
  const CODES = {
    topFast: () => `G38.2 Z-${texts.maxZ} F${texts.fast}`,
    topBack: () => `G0 Z+${texts.retract}`,
    // The slow touch goes twice the way back, as the server's `touch` does.
    topSlow: () => `G38.2 Z-${twice} F${texts.slow}`,
    set: () => (legAt(p).name === 'down' ? `G38.3 Z-${down} F${texts.fast}` : ['probe.boss.outCode']),
    fast: () => `G38.2 ${inward}${fmt(numberOf(texts.bossSize) / 2 + numberOf(texts.clear))} F${texts.fast}`,
    back: () => `G0 ${outward}${texts.retract}`,
    slow: () => `G38.2 ${inward}${twice} F${texts.slow}`,
    up: () => `G0 Z+${down}`,
    zero: () => `G10 L20 P${wcs} X0 Y0`,
    centre: () => ['probe.hole.centreCode'],
  };
  return CODES[move.kind]();
};

/** What lights at `p` of a move: a set-up's leg's figures, or the whole move's. */
export const usesAt = (name, p) => (MOVES[name].legs ? legAt(p).uses : MOVES[name].uses);

// An example of where the ball stood against the old zero.
export const BEFORE = { x: 123.456, y: 78.9 };

/** The readout: X and Y against the old zero before, 0 after — held through the moves. */
export const bossReadout = (name) => {
  const after = Boolean(MOVES[name].after);
  return { axes: after ? [['x', 0], ['y', 0]] : [['x', BEFORE.x], ['y', BEFORE.y]], after };
};

/*
 * Into place: from off to the side, across over the part, down to a few
 * millimetres above its top — drawn as the ball coming over its middle-ish
 * and shrinking as it goes down.
 */
export const POSITION_MS = 6000;
export const positionAt = (ms) => {
  const p = (ms % POSITION_MS) / POSITION_MS;
  const k = ease(clamp((p - 0.1) / 0.45));
  const from = [-150, 58];
  return {
    tool: [from[0] + (START[0] - from[0]) * k, from[1] + (START[1] - from[1]) * k],
    level: 2 - ease(clamp((p - 0.6) / 0.2)),
  };
};

// The server's parts of a touch, as the steps drawn: `x1a-out`, `-down`, `-fast`, `-back`, `-settle`, the slow one bare, `-up`.
const STEP_OF = {
  out: 'Set', down: 'Set', fast: 'Fast', back: 'Back', settle: 'Back', up: 'Up',
};
const TOP_OF = { fast: 'zFast', back: 'zBack', settle: 'zBack' };

/*
 * What the machine is doing, as the step it belongs to — the server's step
 * names: `z-fast` the top, `x1a-out` the first pass's +X side going out,
 * `y2b` the second's −Y slow touch, and `x1-centre` the way to the middle.
 */
export const moveOfPhase = (phase) => {
  const [step, part] = String(phase || '').split('-');
  if (step === 'z') {
    return TOP_OF[part] || 'zSlow';
  }
  const side = /^([xy])([12])([ab])$/.exec(step);
  if (side) {
    return `${side[1]}${side[2]}${side[3] === 'a' ? 'p' : 'm'}${STEP_OF[part] || 'Slow'}`;
  }
  const centre = /^([xy])([12])$/.exec(step);
  return centre && part === 'centre' ? `${centre[1]}${centre[2]}c` : 'zFast';
};

// The words of a step's part where the part's differ from a plate's.
const PHASE_KEYS = {
  fast: 'probe.boss.phase.fast',
  back: 'probe.phase.back',
  settle: 'probe.phase.settle',
  out: 'probe.phase.out',
  down: 'probe.phase.down',
  up: 'probe.boss.phase.up',
  centre: 'probe.hole.phase.centre',
};

/** What the ball is doing at the server's step, as `t(key, vars)`. */
export const bossWords = (phase) => {
  const [step, part] = String(phase || '').split('-');
  if (step === 'z') {
    return [part === 'fast' ? 'probe.boss.phase.top' : (PHASE_KEYS[part] || 'probe.phase.touch'), { axis: 'Z' }];
  }
  return [PHASE_KEYS[part] || 'probe.phase.touch', { axis: MOVES[moveOfPhase(phase)].way }];
};

/** The part as the centre screens take it — `CentreParams`, `CentreCycle`, `CentrePosition`. */
export const BOSS_CYCLE = {
  part: {
    kind: 'boss', r: BOSS_R, toolR: TOOL_R, grow: 0.6, view: [-101, -94, 202, 188],
  },
  // From the front too (review note, 2026-10-01): the move under way, or the ball on its way into place.
  side: (name, p, how) => bossSide(MOVES[name], p, how),
  sidePlace: ({ tool, level }) => bossSide({ kind: 'place', frames: [[0, tool, level], [1, tool, level]] }, 0),
  // Which view a phone shows by itself: the side for what goes up and down.
  viewOf: (name, p, focus) => {
    const move = MOVES[name];
    const vertical = ['topFast', 'topBack', 'topSlow', 'up'].includes(move.kind) || (move.kind === 'set' && legAt(p).name === 'down');
    return vertical || focus === 'depth' ? 'side' : 'top';
  },
  place: 'probe.place.boss',
  params: BOSS_PARAMS,
  hold: LOOP_HOLD_MS,
  order: bossOrder,
  groups: bossGroups,
  timeline: bossTimeline,
  playAt,
  moveOf,
  titleOf,
  scene: bossScene,
  code: bossCode,
  usesAt,
  readout: bossReadout,
  positionAt,
  moveOfPhase,
  words: bossWords,
};
