/**
 * The centre of a part, touched from outside, as its drawing moves through
 * it (Mateusz, 2026-10-01; the server's `services/probe/strategies/boss`):
 * seen from above, the ball touches the top first, then for each side goes
 * out past it over the top, down beside it, touches it moving in and rises
 * again — +X, −X, to the middle, then the same across Y; twice, or once
 * (`passes`). Then X0 Y0 is written there; Z is not touched.
 *
 * Height is drawn as size, as the corner and the hole do: the ball larger
 * the higher it is — `level` 1 where it starts, `ABOVE` just over the top,
 * 0 down beside a side.
 *
 * Positions are the drawing's units, the part's centre at the origin and Y
 * up; the figures said come from the form. Nothing here is the machine's.
 */

import {
  AXES, BOSS_R, LOOP_HOLD_MS, ON_TOP, RUN_MS, SIDE_RUN_MS, SPAN_MS, START, TOOL_R, build, clamp, ease, legAt, setOn, toolAt,
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

// Written out, so the translations' check sees every key.
const PASS_KEYS = { 1: 'probe.hole.pass1', 2: 'probe.hole.pass2' };
const AXIS_KEYS = { x: 'probe.hole.axis.x', y: 'probe.hole.axis.y' };

/** The bar's stages: the top, each pass across X and Y, then the zero. */
export const bossGroups = (passes = 2) => [{
  id: 'top', name: 'Z', subs: [{ key: 'probe.boss.top', moves: ['z'] }],
}].concat([1, 2].slice(0, passes).map((pass) => ({
  id: `pass${pass}`,
  key: PASS_KEYS[pass],
  subs: AXES.map((axis) => ({ key: AXIS_KEYS[axis], moves: ORDER.filter((name) => name.startsWith(`${axis}${pass}`)) })),
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

// A figure being set loops the move it changes, its part lit.
const EDIT = {
  bossSize: ['x1p', 'size'],
  clear: ['x1p', 'clear'],
  depth: ['x1p', 'depth'],
  fast: ['x1p', 'feed'],
  slow: ['x1p', 'feed'],
  retract: ['x1p', 'feed'],
  maxZ: ['z', 'dim'],
  ballDiameter: ['zero', 'dim'],
};

const runOf = (name) => (MOVES[name].kind === 'side' ? SIDE_RUN_MS : RUN_MS);

export const bossTimeline = (passes = 2) => layOut(bossOrder(passes), {
  spanOf: (name) => runOf(name) + SPAN_MS - RUN_MS,
  runOf,
  partsOf: (name) => [[0, MOVES[name].end]],
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

/**
 * The drawing of move `name` at `p`: the ball's centre and height, the arrow
 * of the leg under way, a figure's dimension, the sides this pass has
 * touched, the touch under way and the zero's lines. `texts` the figures,
 * `say(field, text)` one as a label says it, `upTo(v)` as a limit.
 */
export const bossScene = (name, p, {
  texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null,
} = {}) => {
  const move = MOVES[name];
  const { at: tool, level } = toolAt(move, p);
  const said = (field) => say(field, texts[field] ?? '');
  const touched = ORDER.slice(0, ORDER.indexOf(name))
    .filter((one) => MOVES[one].kind === 'side' && MOVES[one].pass === move.pass)
    .map((one) => onSide(MOVES[one].wall));
  let motion = null;
  let limit = null;
  let dims = [];
  let tag = null;
  if (move.kind === 'top') {
    tag = { text: `Z ${upTo(said('maxZ'))}`, lit: focus === 'dim' };
  } else if (move.kind === 'side') {
    const leg = legAt(p);
    if (leg.name === 'out' && p > leg.from) {
      motion = {
        axis: move.axis, from: move.from, to: move.out, kind: 'rapid', feed: null,
      };
    } else if (leg.name === 'down' || (leg.name === 'up' && p > leg.from)) {
      tag = { text: leg.name === 'down' ? `↓ ${said('depth')}` : '↑', lit: focus === 'depth' };
    } else if (leg.name === 'touch') {
      if (p > leg.from && p < 0.62) {
        motion = {
          axis: move.axis, from: move.out, to: move.wall, kind: 'probe', feed: said('fast'), lit: focus === 'feed',
        };
      }
      // The search goes in no further than the middle thought.
      limit = { axis: move.axis, from: move.out, to: setOn(move.axis, move.out, move.guess), lit: false };
    }
    // The part's rough width, and how far out past it: shown with the leg out, or while set.
    if (leg.name === 'out' || focus === 'size' || focus === 'clear') {
      const edge = setOn(move.axis, move.out, move.guess + move.sign * BOSS_R);
      dims = [
        { id: 'clear', axis: move.axis, from: edge, to: move.out, text: said('clear'), lit: focus === 'clear' },
        {
          id: 'size', axis: move.axis, from: setOn(move.axis, move.out, move.guess - move.sign * BOSS_R), to: edge, text: said('bossSize'), lit: focus === 'size',
        },
      ];
    }
  } else if (move.kind === 'centre' && p > 0.15 && p < 0.6) {
    motion = {
      axis: move.axis, from: move.from, to: move.to, kind: 'rapid', feed: null,
    };
  }
  let zero = 0;
  if (move.zeroAt) {
    const [a, b] = move.zeroAt;
    zero = clamp((p - a) / (b - a));
  }
  let contact = null;
  if (move.kind === 'side' && level < 0.01 && near(tool, move.wall)) {
    contact = onSide(move.wall);
  } else if (move.kind === 'top' && Math.abs(level - ON_TOP) < 0.01) {
    contact = tool;
  }
  return {
    tool,
    level,
    motion,
    limit,
    dims,
    tag,
    touched,
    contact,
    centre: move.kind === 'centre' && p >= 0.6 ? move.to : null,
    zero,
    // The ball's diameter, the one figure the zero uses: it is taken off to say the part's size.
    dia: move.kind === 'zero' ? { text: `Ø${said('ballDiameter')}`, lit: focus === 'dim', fade: zero } : null,
    focus,
  };
};

const numberOf = (text) => Number(String(text ?? '').replace(',', '.'));
const fmt = (v) => String(Math.round(v * 1000) / 1000);

/** The move's line at `p`, with the figures typed; a way with no figures is said in words, `[key]`. */
export const bossCode = (name, texts, wcs = 1, p = 0) => {
  const move = MOVES[name];
  if (move.kind === 'top') {
    return `G38.2 Z-${texts.maxZ} F${texts.fast}`;
  }
  if (move.kind === 'side') {
    const leg = legAt(p).name;
    const out = numberOf(texts.bossSize) / 2 + numberOf(texts.clear);
    const down = numberOf(texts.retract) + numberOf(texts.depth);
    const axis = move.axis.toUpperCase();
    if (leg === 'down') {
      return `G38.3 Z-${fmt(down)} F${texts.fast}`;
    }
    if (leg === 'touch') {
      return `G38.2 ${axis}${move.sign > 0 ? '-' : '+'}${fmt(out)} F${texts.fast}`;
    }
    if (leg === 'up') {
      return `G0 Z+${fmt(down)}`;
    }
    return ['probe.boss.outCode'];
  }
  if (move.kind === 'zero') {
    return `G10 L20 P${wcs} X0 Y0`;
  }
  return ['probe.hole.centreCode'];
};

/** What lights at `p` of a move: a side's leg's figures, or the whole move's. */
export const usesAt = (name, p) => (MOVES[name].kind === 'side' ? legAt(p).uses : MOVES[name].uses);

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

/*
 * What the machine is doing, as the move it belongs to — the server's step
 * names: `z-fast` the top, `x1a-out` the first pass's +X side, `y2b` the
 * second's −Y, and `x1-centre` the way to the middle.
 */
export const moveOfPhase = (phase) => {
  const side = /^([xy])([12])([ab])/.exec(phase || '');
  if (side) {
    return `${side[1]}${side[2]}${side[3] === 'a' ? 'p' : 'm'}`;
  }
  const centre = /^([xy])([12])-centre/.exec(phase || '');
  return centre ? `${centre[1]}${centre[2]}c` : 'z';
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
  // From the side too (review note, 2026-10-01): the move under way, or the ball on its way into place.
  side: (name, p, how) => bossSide(MOVES[name], p, how),
  sidePlace: ({ tool, level }) => bossSide({ kind: 'place', frames: [[0, tool, level], [1, tool, level]] }, 0),
  // Which view a phone shows by itself: the side for what goes up and down.
  viewOf: (name, p, focus) => {
    const move = MOVES[name];
    const vertical = move.kind === 'top' || (move.kind === 'side' && ['down', 'up'].includes(legAt(p).name));
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
