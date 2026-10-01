/**
 * The centre of a hole as its drawing moves through it (Mateusz, 2026-10-01;
 * the server's `services/probe/strategies/hole`): seen from above, the tool
 * in a round hole touches the wall +X, then −X, goes to the middle of the
 * two, and does the same across Y — twice, the second pass from the centre
 * the first found, or once (`passes`). Then X0 Y0 is written there; Z is not
 * touched. The first pass already ends at the centre, so one pass is the
 * first half of the same moves and the zero.
 *
 * Positions are the drawing's units, the hole's centre at the origin and Y
 * up; the figures said come from the form. Nothing here is the machine's.
 */

import { holeSide } from './holeSide';
import { frameAt, layOut, totalOf } from './timeline';

export const SPAN_MS = 3400;
export const RUN_MS = 2600;
export const LOOP_HOLD_MS = 2500;

// The hole's radius and the tool's, and the way the tool's centre has inside.
export const HOLE_R = 62;
export const TOOL_R = 10;
const FREE = HOLE_R - TOOL_R;
// Off the wall after a touch, and where the tool starts, off the centre.
const BACK = 6;
const START = [14, -9];
// How far past the wall a search may go, on the drawing.
const PAST = 10;
// When in a touch the fast one runs, and the slow one — longer, as on the machine — back off the wall to it again.
const FAST = [0.1, 0.4];
export const SLOW = [0.55, 0.9];

const AXES = ['x', 'y'];
const clamp = (v) => Math.max(0, Math.min(1, v));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2);

/** Where the tool's centre meets the wall going `sign` along `axis` from `at`. */
const wallFrom = (at, axis, sign) => {
  const other = axis === 'x' ? at[1] : at[0];
  const reach = Math.sqrt(FREE * FREE - other * other);
  return axis === 'x' ? [sign * reach, at[1]] : [at[0], sign * reach];
};

const along = (axis, at, by) => (axis === 'x' ? [at[0] + by, at[1]] : [at[0], at[1] + by]);

/*
 * The moves, each with the keyframes of the tool's centre: a touch fast to
 * the wall, back, slow to it again, back — as the server's `touch`; a move to
 * the middle of the two touches; the zero, still.
 */
const build = () => {
  const moves = {};
  const order = [];
  let at = START;
  [1, 2].forEach((pass) => {
    AXES.forEach((axis) => {
      const touches = [];
      [1, -1].forEach((sign) => {
        const wall = wallFrom(at, axis, sign);
        const off = along(axis, wall, -sign * BACK);
        const name = `${axis}${pass}${sign > 0 ? 'p' : 'm'}`;
        const way = `${axis.toUpperCase()}${sign > 0 ? '+' : '−'}`;
        moves[name] = {
          kind: 'touch', axis, sign, pass, from: at, wall, way,
          frames: [[0, at], [FAST[0], at], [FAST[1], wall, true], [0.45, wall], [0.5, off], [SLOW[0], off], [SLOW[1], wall], [1, off]],
          titleKey: 'probe.hole.move.touch',
          uses: ['holeSize', 'fast', 'slow', 'retract'],
          end: 1,
        };
        order.push(name);
        touches.push(wall);
        at = off;
      });
      const middle = axis === 'x'
        ? [(touches[0][0] + touches[1][0]) / 2, at[1]]
        : [at[0], (touches[0][1] + touches[1][1]) / 2];
      const name = `${axis}${pass}c`;
      moves[name] = {
        kind: 'centre', axis, pass, from: at, to: middle, touches, way: axis.toUpperCase(),
        frames: [[0, at], [0.15, at], [0.6, middle, true], [1, middle]],
        titleKey: 'probe.hole.move.centre',
        uses: [],
        end: 0.6,
      };
      order.push(name);
      at = middle;
    });
  });
  moves.zero = {
    kind: 'zero', from: at, frames: [[0, at], [1, at]], zeroAt: [0.1, 0.35], titleKey: 'probe.hole.move.zero', uses: ['ballDiameter'], end: 0.35, after: true,
  };
  order.push('zero');
  return { moves, order };
};

const { moves: MOVES, order: ORDER } = build();

/** The moves in order, for one pass or two. */
export const holeOrder = (passes = 2) => ORDER.filter((name) => passes !== 1 || MOVES[name].pass !== 2);
export const moveOf = (name) => MOVES[name];

/** A move's spoken name: `t(key, vars)`. */
export const titleOf = (name) => {
  const move = MOVES[name];
  return [move.titleKey, { pass: move.pass, axis: move.way }];
};

// Written out, so the translations' check sees every key.
const PASS_KEYS = { 1: 'probe.hole.pass1', 2: 'probe.hole.pass2' };
const AXIS_KEYS = { x: 'probe.hole.axis.x', y: 'probe.hole.axis.y' };

/** The bar's stages: each pass across X and Y, then the zero. */
export const holeGroups = (passes = 2) => [1, 2].slice(0, passes).map((pass) => ({
  id: `pass${pass}`,
  key: PASS_KEYS[pass],
  subs: AXES.map((axis) => ({ key: AXIS_KEYS[axis], moves: ORDER.filter((name) => name.startsWith(`${axis}${pass}`)) })),
})).concat([{
  id: 'zero', key: 'probe.bar.zero', folded: true, subs: [{ key: 'probe.stage.zero', moves: ['zero'] }],
}]);

export const HOLE_PARAMS = [
  { id: 'hole', key: 'probe.group.hole', fields: ['holeSize'] },
  // How many passes, a switch at the group's head.
  { id: 'measure', key: 'probe.group.measure', fields: ['fast', 'slow', 'retract'], passes: true },
  // Only for the hole's size said back: the centre needs no radius.
  { id: 'probe', key: 'probe.group.probe', fields: ['ballDiameter'] },
];

// A figure being set loops the first touch, or the zero for the tool.
const EDIT = {
  holeSize: ['x1p', 'dim'], fast: ['x1p', 'feed'], slow: ['x1p', 'feed'], retract: ['x1p', 'feed'], ballDiameter: ['zero', 'dim'],
};

export const holeTimeline = (passes = 2) => layOut(holeOrder(passes), {
  spanOf: () => SPAN_MS,
  runOf: () => RUN_MS,
  partsOf: (name) => [[0, MOVES[name].end]],
});

const ITEMS = { 1: holeTimeline(1), 2: holeTimeline(2) };

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
  const span = RUN_MS * MOVES[alone].end + LOOP_HOLD_MS;
  const into = ms % span;
  return {
    name: alone, focus, p: still ? 1 : Math.min(1, into / RUN_MS), span, run: RUN_MS, into,
  };
};

/** The tool's centre at `p` through a move, from its keyframes. */
export const toolAt = (move, p) => {
  const { frames } = move;
  for (let i = 0; i < frames.length - 1; i++) {
    const [a, from] = frames[i];
    const [b, to, eased] = frames[i + 1];
    if (p >= a && p <= b) {
      const u = (p - a) / Math.max(1e-6, b - a);
      const k = eased ? ease(u) : u;
      return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
    }
  }
  return frames[frames.length - 1][1];
};

const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5;

// Where the tool's edge meets the wall, from where its centre stands then.
const onWall = (centre) => [centre[0] * (HOLE_R / FREE), centre[1] * (HOLE_R / FREE)];

/**
 * The drawing of move `name` at `p`: the tool's centre, the arrow while it
 * moves, the search's limit along a touch, the walls touched so far this
 * pass, the touch under way and the zero's lines. `texts` the figures,
 * `say(field, text)` one as a label says it, `upTo(v)` as a limit.
 */
export const holeScene = (name, p, {
  texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null,
} = {}) => {
  const move = MOVES[name];
  const tool = toolAt(move, p);
  const said = (field) => say(field, texts[field] ?? '');
  // The walls this pass has touched before this move, and this move's once it is there.
  const touched = ORDER.slice(0, ORDER.indexOf(name))
    .filter((one) => MOVES[one].kind === 'touch' && MOVES[one].pass === move.pass)
    .map((one) => onWall(MOVES[one].wall));
  let motion = null;
  let limit = null;
  if (move.kind === 'touch') {
    if (p > FAST[0] && p < FAST[1]) {
      motion = {
        axis: move.axis, from: move.from, to: move.wall, kind: 'probe', feed: said('fast'), lit: focus === 'feed',
      };
    } else if (p > SLOW[0] && p < SLOW[1]) {
      // The slow touch, from off the wall, with its own feed (review note, 2026-10-01: *"wolny pomiar nie jest pokazywany"*).
      motion = {
        axis: move.axis, from: along(move.axis, move.wall, -move.sign * BACK), to: move.wall, kind: 'probe', feed: said('slow'), lit: focus === 'feed',
      };
    }
    limit = {
      // Its words near the wall, off the middle where the touches across X sit.
      axis: move.axis, from: move.from, to: along(move.axis, move.wall, move.sign * PAST), text: upTo(said('holeSize')), lit: focus === 'dim', tagAt: 0.85,
    };
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
  return {
    tool,
    motion,
    limit,
    touched,
    contact: move.kind === 'touch' && near(tool, move.wall) ? onWall(move.wall) : null,
    centre: move.kind === 'centre' && p >= 0.6 ? move.to : null,
    zero,
    // The ball's diameter, the one figure the zero uses: it is added back to say the hole's size.
    dia: move.kind === 'zero' ? { text: `Ø${said('ballDiameter')}`, lit: focus === 'dim', fade: zero } : null,
    focus,
  };
};

const numberOf = (text) => Number(String(text ?? '').replace(',', '.'));

/** The move's line at `p`, with the figures typed; a way to the middle is said in words, `[key]`. */
export const holeCode = (name, texts, wcs = 1, p = 0) => {
  const move = MOVES[name];
  const way = `${move.axis?.toUpperCase()}${move.sign > 0 ? '+' : '-'}`;
  if (move.kind === 'touch' && p > SLOW[0] - 0.08) {
    // The slow touch goes twice the way back, as the server's `touch` does.
    return `G38.2 ${way}${2 * numberOf(texts.retract)} F${texts.slow}`;
  }
  if (move.kind === 'touch') {
    return `G38.2 ${way}${texts.holeSize} F${texts.fast}`;
  }
  if (move.kind === 'zero') {
    return `G10 L20 P${wcs} X0 Y0`;
  }
  return ['probe.hole.centreCode'];
};

// An example of where the tool stood against the old zero.
export const BEFORE = { x: 123.456, y: 78.9 };

/** The readout: X and Y against the old zero before, 0 after — held through the moves. */
export const holeReadout = (name) => {
  const after = Boolean(MOVES[name].after);
  return { axes: after ? [['x', 0], ['y', 0]] : [['x', BEFORE.x], ['y', BEFORE.y]], after };
};

/*
 * Into place: from off to the side, across over the hole, down into it —
 * drawn from above as the tool coming over its middle-ish, drawn smaller as
 * it goes down (`level` 1 high, 0 in the hole), as the corner draws height.
 */
export const POSITION_MS = 6000;
export const positionAt = (ms) => {
  const p = (ms % POSITION_MS) / POSITION_MS;
  const k = ease(clamp((p - 0.1) / 0.45));
  const from = [-150, 58];
  return {
    tool: [from[0] + (START[0] - from[0]) * k, from[1] + (START[1] - from[1]) * k],
    level: 1 - ease(clamp((p - 0.6) / 0.2)),
  };
};

/*
 * What the machine is doing, as the move it belongs to — the server's step
 * names: `x1a-fast` the first pass's +X touch, `y2b` the second's −Y, and
 * `x1-centre` the way to the middle.
 */
export const moveOfPhase = (phase) => {
  const touch = /^([xy])([12])([ab])/.exec(phase || '');
  if (touch) {
    return `${touch[1]}${touch[2]}${touch[3] === 'a' ? 'p' : 'm'}`;
  }
  const centre = /^([xy])([12])-centre/.exec(phase || '');
  return centre ? `${centre[1]}${centre[2]}c` : 'x1p';
};

// The words of a step's part where the hole's differ from a plate's: the fast touch finds a wall, not a plate.
const PHASE_KEYS = {
  fast: 'probe.hole.phase.fast', back: 'probe.phase.back', settle: 'probe.phase.settle', centre: 'probe.hole.phase.centre',
};

/** What the tool is doing at the server's step, as `t(key, vars)`: `x1a-fast` is "X+: looking for the wall". */
export const holeWords = (phase) => {
  const move = MOVES[moveOfPhase(phase)];
  const part = String(phase || '').split('-')[1];
  return [PHASE_KEYS[part] || 'probe.phase.touch', { axis: move.way }];
};

/** The hole as the centre screens take it — `CentreParams`, `CentreCycle`, `CentrePosition`. */
export const HOLE_CYCLE = {
  part: {
    // How much larger the ball is drawn up high than down in the hole (review note, 2026-10-01: *"większa różnica rozmiaru"*).
    kind: 'hole', r: HOLE_R, toolR: TOOL_R, grow: 1.2, view: [-101, -94, 202, 188], fast: FAST, slow: SLOW, back: BACK,
  },
  // From the front too (review note, 2026-10-01): the move under way, or the ball on its way into place.
  side: (name, p, how) => holeSide({ ...MOVES[name], at: toolAt(MOVES[name], p) }, p, how, HOLE_CYCLE.part),
  sidePlace: ({ tool, level }) => holeSide({ kind: 'place', at: tool, level }, 0, {}, HOLE_CYCLE.part),
  place: 'probe.place.hole',
  params: HOLE_PARAMS,
  hold: LOOP_HOLD_MS,
  order: holeOrder,
  groups: holeGroups,
  timeline: holeTimeline,
  playAt,
  moveOf,
  titleOf,
  scene: holeScene,
  code: holeCode,
  usesAt: (name) => MOVES[name].uses,
  readout: holeReadout,
  positionAt,
  moveOfPhase,
  words: holeWords,
};
