/**
 * The centre of a hole as its drawing moves through it (Mateusz, 2026-10-01;
 * the server's `services/probe/strategies/hole`): seen from above, the ball
 * in a round hole touches the wall +X, then −X, goes to the middle of the
 * two, and does the same across Y — twice, the second pass from the centre
 * the first found, or once (`passes`). Then X0 Y0 is written there; Z is not
 * touched. The first pass already ends at the centre, so one pass is the
 * first half of the same moves and the zero.
 *
 * Each touch is the corner's steps (review note, 2026-10-01: *"kroki w
 * pomiarze otworu to zlepek kilku kroków, w pomiarze XYZ wygląda inaczej"*):
 * the fast one to the wall, back off it, the slow one that counts, off it
 * again — each a move of its own on the bar, with its own line and arrow.
 *
 * Positions are the drawing's units, the hole's centre at the origin and Y
 * up; the figures said come from the form. Nothing here is the machine's.
 */

import {
  AXES, BACK, FREE, HOLD_MS, HOLE_R, LOOP_HOLD_MS, PAST, RUNS, START, TOOL_R, along, build, clamp, ease, isGoing, toolAt,
} from './holeMoves';
import { holeSide } from './holeSide';
import { slowReach, slowReachWhy } from './probeFields';
import { frameAt, layOut, totalOf } from './timeline';

export { HOLE_R, LOOP_HOLD_MS, toolAt };

// What the hole's group and its rough size are called; a pocket's or a groove's are their own (`names`).
const HOLE_NAMES = { group: 'probe.group.hole', size: 'probe.field.holeSize' };

/**
 * The hole cycle for `axes` — one for a width — and, with `size`, ending in
 * the size measured rather than a zero (Mateusz, 2026-10-03); `square`, a
 * rectangle's, drawn so.
 */
export const holeCycleOf = ({
  axes = AXES, size = false, square = false, names = HOLE_NAMES,
} = {}) => {
  const { moves: MOVES, order: ORDER } = build({ axes, size });
  // A round hole's size is its diameter, said once.
  const round = !square && axes.length === 2;

  /** The moves in order, for one pass or two. */
  const holeOrder = (passes = 2) => ORDER.filter((name) => passes !== 1 || MOVES[name].pass !== 2);
  const moveOf = (name) => MOVES[name];

  /** A move's spoken name: `t(key, vars)`. */
  const titleOf = (name) => {
    const move = MOVES[name];
    return [move.titleKey, { pass: move.pass, axis: move.way }];
  };

  /*
   * The bar's stages, as the corner's are by axis: each pass across X, then
   * across Y — a wall's three steps, the other wall's, the way to the middle —
   * then the zero. Named by the axis, and the pass when there are two.
   * Two walls on an axis, so a sub-stage is a wall, not a search and a
   * measuring (rule, Mateusz 2026-10-01: `cncjs-notes/probe/oznaczenia.html` §8).
   */
  const holeGroups = (passes = 2) => [1, 2].slice(0, passes).flatMap((pass) => axes.map((axis) => {
    const AXIS = axis.toUpperCase();
    const sideOf = (sign) => `${axis}${pass}${sign}`;
    return {
      id: `${axis}${pass}`,
      name: passes > 1 ? `${AXIS} · ${pass}` : AXIS,
      subs: [
        { name: `${AXIS}+`, moves: ['Fast', 'Back', 'Slow', 'Off'].map((step) => `${sideOf('p')}${step}`) },
        // Off the second wall it goes straight on to the middle: no back-off of its own.
        { name: `${AXIS}−`, moves: ['Fast', 'Back', 'Slow'].map((step) => `${sideOf('m')}${step}`) },
        { key: 'probe.hole.middle', moves: [`${axis}${pass}c`] },
      ],
    };
  })).concat([size
? {
    id: 'zero', key: 'probe.bar.size', folded: true, subs: [{ key: 'probe.stage.size', moves: ['zero'] }],
  }
: {
    id: 'zero', key: 'probe.bar.zero', folded: true, subs: [{ key: 'probe.stage.zero', moves: ['zero'] }],
  }]);

  const HOLE_PARAMS = [
    { id: 'hole', key: names.group, fields: ['holeSize'], names: { holeSize: names.size } },
    // How many passes, a switch at the group's head.
    { id: 'measure', key: 'probe.group.measure', fields: ['fast', 'slow', 'retract'], passes: true, repeats: size },
    // Only for the hole's size said back: the centre needs no radius.
    { id: 'probe', key: 'probe.group.probe', fields: ['ballDiameter'] },
  ];

  // A figure being set loops the step it changes, its part lit.
  const first = `${axes[0]}1p`;
  const EDIT = {
    holeSize: [`${first}Fast`, 'dim'], fast: [`${first}Fast`, 'feed'], slow: [`${first}Slow`, 'feed'], retract: [`${first}Back`, 'retract'], ballDiameter: ['zero', 'dim'],
  };

  const runOf = (name) => RUNS[MOVES[name].kind];

  const holeTimeline = (passes = 2) => layOut(holeOrder(passes), {
    spanOf: (name) => runOf(name) + HOLD_MS,
    runOf,
    partsOf: (name) => [[0, MOVES[name].end]],
  });

  const ITEMS = { 1: holeTimeline(1), 2: holeTimeline(2) };

  /** Which move plays at `ms`: the cycle of `passes`, a figure's loop, or `pinned` alone. */
  const playAt = (ms, {
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

  // Where the ball's edge meets the wall, from where its centre stands then.
  const onWall = (centre) => [centre[0] * (HOLE_R / FREE), centre[1] * (HOLE_R / FREE)];

  const TOUCHING = ['fast', 'slow'];

  /**
   * The drawing of move `name` at `p`: the ball's centre, the arrow while it
   * moves, the search's limit on a fast touch, the walls touched so far this
   * pass, the touch under way and the zero's lines. `texts` the figures,
   * `say(field, text)` one as a label says it, `upTo(v)` as a limit;
   * `sizes`, what a size's lines say per axis — `d` a round one's diameter — the axis's letter (Ø) if not given.
   */
  const holeScene = (name, p, {
    texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null, sizes = {},
  } = {}) => {
    const move = MOVES[name];
    const tool = toolAt(move, p);
    const said = (field) => say(field, texts[field] ?? '');
    // The walls this pass has touched before this step: each side's, once its fast touch is done.
    const touched = [...new Set(ORDER.slice(0, ORDER.indexOf(name))
      .filter((one) => MOVES[one].kind === 'fast' && MOVES[one].pass === move.pass && MOVES[one].side !== move.side)
      .map((one) => MOVES[one].side))]
      .map((side) => onWall(MOVES[`${side}Fast`].wall));
    let motion = null;
    let limit = null;
    let dims = [];
    let reach = null;
    const going = isGoing(move, p);
    if (move.kind === 'fast') {
      if (going) {
        motion = {
          axis: move.axis, from: move.from, to: move.wall, kind: 'probe', feed: said('fast'), lit: focus === 'feed',
        };
      }
      limit = {
        axis: move.axis, from: move.from, to: along(move.axis, move.wall, move.sign * PAST), text: upTo(said('holeSize')), lit: focus === 'dim',
      };
    } else if (move.kind === 'back') {
      // As the Z plate's: the arrow bare, the way back a dimension with its figure.
      motion = going
  ? {
        axis: move.axis, from: move.wall, to: move.off, kind: 'rapid', feed: null,
      }
  : null;
      dims = [{
        id: 'retract', axis: move.axis, from: move.wall, to: move.off, text: said('retract'), lit: focus === 'retract',
      }];
    } else if (move.kind === 'slow') {
      // The slow touch, from off the wall, with its own feed (review note, 2026-10-01: *"wolny pomiar nie jest pokazywany"*);
      // it searches twice the back-off — back to the wall and as far again past it — said as one figure, the sum,
      // as the Z plate's (*"brakuje odległości przy dokładnym pomiarze"*; rule 1, 2026-10-02).
      motion = going
  ? {
        axis: move.axis, from: move.off, to: move.wall, kind: 'probe', feed: said('slow'), lit: focus === 'feed',
      }
  : null;
      reach = {
        axis: move.axis, from: move.off, mid: move.wall, to: along(move.axis, move.wall, move.sign * BACK), text: upTo(say('retract', slowReach(texts))), lit: focus === 'retract',
      };
    } else if (move.kind === 'centre' && going) {
      motion = {
        axis: move.axis, from: move.from, to: move.to, kind: 'rapid', feed: null,
      };
    } else if (move.size) {
      // The size across the hole, wall to wall, each axis measured — under it and beside it; a round one's one diameter.
      dims = (round ? ['x'] : axes).map((axis) => ({
        id: `size${axis}`, axis, at: HOLE_R + 16, from: along(axis, [0, 0], -HOLE_R), to: along(axis, [0, 0], HOLE_R), text: (round ? sizes.d : sizes[axis]) ?? (round ? 'Ø' : axis.toUpperCase()), lit: false,
      }));
    }
    let zero = 0;
    if (move.zeroAt) {
      zero = clamp((p - move.zeroAt[0]) / (move.zeroAt[1] - move.zeroAt[0]));
    }
    return {
      tool,
      motion,
      limit,
      dims,
      reach,
      touched: move.kind === 'back' || move.kind === 'slow' ? [...touched, onWall(move.wall)] : touched,
      contact: TOUCHING.includes(move.kind) && near(tool, move.wall) ? onWall(move.wall) : null,
      centre: move.kind === 'centre' && p >= move.end ? move.to : null,
      zero,
      // The ball's diameter, the one figure the zero uses: it is added back to say the hole's size.
      dia: move.kind === 'zero' ? { text: `Ø${said('ballDiameter')}`, lit: focus === 'dim', fade: move.size ? 1 : zero } : null,
      focus,
    };
  };

  /** The step's line, with the figures typed; a way to the middle is said in words, `[key]`. */
  const holeCode = (name, texts, wcs = 1) => {
    const move = MOVES[name];
    const forward = `${move.axis?.toUpperCase()}${move.sign > 0 ? '+' : '-'}`;
    const backward = `${move.axis?.toUpperCase()}${move.sign > 0 ? '-' : '+'}`;
    if (move.kind === 'fast') {
      return `G38.2 ${forward}${texts.holeSize} F${texts.fast}`;
    }
    if (move.kind === 'back') {
      return `G0 ${backward}${texts.retract}`;
    }
    if (move.kind === 'slow') {
      // The slow touch goes twice the way back, as the server's `touch` does.
      return `G38.2 ${forward}${slowReach(texts)} F${texts.slow}`;
    }
    if (move.size) {
      return ['probe.size.codeHole'];
    }
    if (move.kind === 'zero') {
      return `G10 L20 P${wcs} X0 Y0`;
    }
    return ['probe.hole.centreCode'];
  };

  // An example of where the ball stood against the old zero.
  const BEFORE = { x: 123.456, y: 78.9 };

  /** The readout: X and Y against the old zero before, 0 after — held through the moves. */
  const holeReadout = (name) => {
    const after = Boolean(MOVES[name].after);
    return { axes: after ? [['x', 0], ['y', 0]] : [['x', BEFORE.x], ['y', BEFORE.y]], after };
  };

  /*
   * Into place: from off to the side, across over the hole, down into it —
   * drawn from above as the ball coming over its middle-ish, drawn smaller as
   * it goes down (`level` 1 high, 0 in the hole), as the corner draws height.
   */
  const POSITION_MS = 6000;
  const positionAt = (ms) => {
    const p = (ms % POSITION_MS) / POSITION_MS;
    const k = ease(clamp((p - 0.1) / 0.45));
    const from = [-150, 58];
    return {
      tool: [from[0] + (START[0] - from[0]) * k, from[1] + (START[1] - from[1]) * k],
      level: 1 - ease(clamp((p - 0.6) / 0.2)),
    };
  };

  // The server's parts of a touch, as the steps drawn: `x1a-fast`, `x1a-back`, `x1a-settle`, `x1a` the slow one, `x1a-off`.
  const STEP_OF = {
    fast: 'Fast', back: 'Back', settle: 'Back', off: 'Off',
  };

  /*
   * What the machine is doing, as the step it belongs to — the server's step
   * names: `x1a-fast` the first pass's +X fast touch, `y2b` the second's −Y
   * slow one, and `x1-centre` the way to the middle. A size's passes past
   * the second are drawn as the second: every one of them starts at the centre.
   */
  const passOf = (n) => Math.min(2, Number(n));
  const moveOfPhase = (phase) => {
    const touch = /^([xy])(\d+)([ab])(?:-(\w+))?$/.exec(phase || '');
    if (touch) {
      return `${touch[1]}${passOf(touch[2])}${touch[3] === 'a' ? 'p' : 'm'}${STEP_OF[touch[4]] || 'Slow'}`;
    }
    const centre = /^([xy])(\d+)-centre/.exec(phase || '');
    return centre ? `${centre[1]}${passOf(centre[2])}c` : `${first}Fast`;
  };

  // The words of a step's part where the hole's differ from a plate's: the fast touch finds a wall, not a plate.
  const PHASE_KEYS = {
    fast: 'probe.hole.phase.fast', back: 'probe.phase.back', settle: 'probe.phase.settle', off: 'probe.phase.off', centre: 'probe.hole.phase.centre',
  };

  /** What the ball is doing at the server's step, as `t(key, vars)`: `x1a-fast` is "X+: looking for the wall". */
  const holeWords = (phase) => {
    const move = MOVES[moveOfPhase(phase)];
    const part = String(phase || '').split('-')[1];
    return [PHASE_KEYS[part] || 'probe.phase.touch', { axis: move.way }];
  };

  const part = {
    // How much larger the ball is drawn up high than down in the hole (review note, 2026-10-01: *"większa różnica rozmiaru"*).
    kind: 'hole', r: HOLE_R, toolR: TOOL_R, grow: 1.2, view: [-101, -94, 202, 188],
    // One axis: a groove, drawn as a strip that wide (`CentreScene`).
    strip: axes.length === 1 ? axes[0] : null,
    // A rectangle measured (Pomiar): drawn square, not round.
    square,
  };

  /** The hole as the centre screens take it — `CentreParams`, `CentreCycle`, `CentrePosition`. */
  return {
    size,
    part,
    // From the front too (review note, 2026-10-01): the move under way, or the ball on its way into place.
    side: (name, p, how) => holeSide({ ...MOVES[name], at: toolAt(MOVES[name], p) }, p, how, part),
    sidePlace: ({ tool, level }) => holeSide({ kind: 'place', at: tool, level }, 0, {}, part),
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
    explain: (name, texts, say) => (MOVES[name].kind === 'slow' ? slowReachWhy(texts, say) : null),
    usesAt: (name) => MOVES[name].uses,
    readout: holeReadout,
    positionAt,
    moveOfPhase,
    words: holeWords,
  };
};

export const HOLE_CYCLE = holeCycleOf();

export const {
  order: holeOrder, groups: holeGroups, timeline: holeTimeline, playAt, moveOf, titleOf, scene: holeScene, code: holeCode, readout: holeReadout, moveOfPhase, words: holeWords, params: HOLE_PARAMS, positionAt,
} = HOLE_CYCLE;
