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
 * down), fast touch, back off, slow touch, off it again, and the way up — each a move of
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
  AXES, BOSS_R, HOLD_MS, LOOP_HOLD_MS, ON_TOP, RUNS, START, TOOL_R, above, build, clamp, downOf, ease, explainOf, fmt, isGoing, numberOf, reachOf, setOn, toolAt,
} from './bossMoves';
import { bossSide } from './bossSide';
import { slowReach } from './probeFields';
import { frameAt, layOut, totalOf } from './timeline';

// What the part's group and its rough size are called; a stud's or a bar's are their own (`names`).
const PART_NAMES = { group: 'probe.group.part', size: 'probe.field.bossSize' };

/**
 * The part cycle for `axes` — one for a width — and, with `size`, ending in
 * the size measured rather than a zero (Mateusz, 2026-10-03); `square`, a
 * rectangle's, drawn so.
 */
export const bossCycleOf = ({
  axes = AXES, size = false, square = false, names = PART_NAMES,
} = {}) => {
  const { moves: MOVES, order: ORDER } = build({ axes, size });
  // A round part's size is its diameter, said once.
  const round = !square && axes.length === 2;

  /** The moves in order, for one pass or two. */
  const bossOrder = (passes = 2) => ORDER.filter((name) => passes !== 1 || MOVES[name].pass !== 2);
  const moveOf = (name) => MOVES[name];

  /** A move's spoken name: `t(key, vars)`. */
  const titleOf = (name) => {
    const move = MOVES[name];
    return [move.titleKey, { pass: move.pass, axis: move.way }];
  };

  const STEPS = ['Out', 'Down', 'Fast', 'Back', 'Slow', 'Off', 'Up'];

  /*
   * The bar's stages, as the corner's: the top's search and measuring, each
   * pass across X and across Y, the zero. Two walls on an axis, so a
   * sub-stage there is a wall, as the hole's (rule, Mateusz 2026-10-01).
   */
  const bossGroups = (passes = 2) => [{
    id: 'z', name: 'Z', subs: [{ key: 'probe.stage.search', moves: ['zFast'] }, { key: 'probe.bar.measure', moves: ['zBack', 'zSlow', 'zOff'] }],
  }].concat([1, 2].slice(0, passes).flatMap((pass) => axes.map((axis) => {
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
    id: 'zero', key: size ? 'probe.bar.size' : 'probe.bar.zero', folded: true, subs: [{ key: size ? 'probe.stage.size' : 'probe.stage.zero', moves: ['zero'] }],
  }]);

  const BOSS_PARAMS = [
    { id: 'part', key: names.group, fields: ['bossSize'], names: { bossSize: names.size } },
    { id: 'reach', key: 'probe.group.reach', fields: ['clear', 'depth', 'maxZ'] },
    // How many passes, a switch at the group's head.
    { id: 'measure', key: 'probe.group.measure', fields: ['fast', 'slow', 'retract'], passes: true, repeats: size },
    // Only for the part's size said back: the centre needs no radius.
    { id: 'probe', key: 'probe.group.probe', fields: ['ballDiameter'] },
  ];

  // A figure being set loops the step it changes, its part lit.
  const first = `${axes[0]}1p`;
  const EDIT = {
    bossSize: [`${first}Out`, 'size'],
    clear: [`${first}Out`, 'clear'],
    depth: [`${first}Down`, 'depth'],
    fast: [`${first}Fast`, 'feed'],
    slow: [`${first}Slow`, 'feed'],
    retract: [`${first}Back`, 'retract'],
    maxZ: ['zFast', 'dim'],
    ballDiameter: ['zero', 'dim'],
  };

  const runOf = (name) => RUNS[MOVES[name].kind];

  // A move is one segment on the bar.
  const partsOf = (name) => [[0, MOVES[name].end]];

  const bossTimeline = (passes = 2) => layOut(bossOrder(passes), {
    spanOf: (name) => runOf(name) + HOLD_MS,
    runOf,
    partsOf,
  });

  const ITEMS = { 1: bossTimeline(1), 2: bossTimeline(2) };

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
  // How far outside the part a set-up's dimensions stand, in the drawing's units.
  const ASIDE_PART = 10;

  // Where the ball meets the side, from where its centre stands then.
  const onSide = (centre) => [centre[0] * (BOSS_R / (BOSS_R + TOOL_R)), centre[1] * (BOSS_R / (BOSS_R + TOOL_R))];

  // The steps after a side's fast touch: the side is touched.
  const TOUCHED = ['back', 'slow', 'up'];

  /**
   * The drawing of move `name` at `p`: the ball's centre and height, the arrow
   * of the step under way, a figure's dimension, the sides this pass has
   * touched, the touch under way and the zero's lines. `texts` the figures,
   * `say(field, text)` one as a label says it, `upTo(v)` as a limit;
   * `sizes`, what a size's lines say per axis — `d` a round one's diameter — the axis's letter (Ø) if not given.
   */
  const bossScene = (name, p, {
    texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null, sizes = {},
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
      motion = null, limit = null, reach = null, dims: stepDims = [],
    } = above(move, p, isGoing(move, p), said, upTo, lit, say('clear', reachOf(texts)), upTo(say('retract', slowReach(texts))));
    // The step's arrow over its whole run, drawn or not: labels keep off it all along (L16).
    const { motion: way = null } = above(move, p, true, said, upTo, lit, '');
    // On a set-up, how far out from the middle thought: half the part and the way past it, one figure, the sum,
    // a short tick at the part's edge (rule 1, Mateusz 2026-10-02); lit, and named, with either figure.
    let dims = stepDims;
    if (move.kind === 'out') {
      const edge = setOn(move.axis, move.out, move.guess + move.sign * BOSS_R);
      // Just outside the part, by its edge (review note #8, 2026-10-02: "bliżej krawędzi materiału").
      const at = BOSS_R + ASIDE_PART;
      dims = [{
        id: lit('size') ? 'size' : 'clear', axis: move.axis, at, from: setOn(move.axis, move.out, move.guess), mid: edge, to: move.out, text: say('clear', reachOf(texts)), lit: lit('clear') || lit('size'),
      }];
    } else if (move.size) {
      // The part's size, side to side, each axis measured — under it and beside it; a round one's one diameter.
      dims = (round ? ['x'] : axes).map((axis) => ({
        id: `size${axis}`, axis, at: BOSS_R + ASIDE_PART, from: setOn(axis, [0, 0], -BOSS_R), to: setOn(axis, [0, 0], BOSS_R), text: (round ? sizes.d : sizes[axis]) ?? (round ? 'Ø' : axis.toUpperCase()), lit: false,
      }));
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
      way,
      limit,
      dims,
      reach,
      touched: sides.map((side) => onSide(MOVES[`${side}Fast`].wall)),
      contact,
      centre: move.kind === 'centre' && p >= move.end ? move.to : null,
      zero,
      // The ball's diameter, the one figure the zero uses: it is taken off to say the part's size.
      dia: move.kind === 'zero' ? { text: `Ø${said('ballDiameter')}`, lit: lit('dim'), fade: move.size ? 1 : zero } : null,
      focus,
    };
  };

  /** The step's line at `p`, with the figures typed; a way with no figures is said in words, `[key]`. */
  const bossCode = (name, texts, wcs = 1, p = 0) => {
    const move = MOVES[name];
    const twice = fmt(2 * numberOf(texts.retract));
    const down = downOf(texts);
    const AXIS = move.axis?.toUpperCase();
    // Moving in towards the part is against the side's sign.
    const inward = `${AXIS}${move.sign > 0 ? '-' : '+'}`;
    const outward = `${AXIS}${move.sign > 0 ? '+' : '-'}`;
    const CODES = {
      topFast: () => `G38.2 Z-${texts.maxZ} F${texts.fast}`,
      topBack: () => `G0 Z+${texts.retract}`,
      // The slow touch goes twice the way back, as the server's `touch` does.
      topSlow: () => `G38.2 Z-${twice} F${texts.slow}`,
      out: () => ['probe.boss.outCode'],
      down: () => `G38.3 Z-${down} F${texts.fast}`,
      fast: () => `G38.2 ${inward}${reachOf(texts)} F${texts.fast}`,
      back: () => `G0 ${outward}${texts.retract}`,
      slow: () => `G38.2 ${inward}${twice} F${texts.slow}`,
      up: () => `G0 Z+${down}`,
      zero: () => (size ? ['probe.size.codeBoss'] : `G10 L20 P${wcs} X0 Y0`),
      centre: () => ['probe.hole.centreCode'],
    };
    return CODES[move.kind]();
  };

  /** What lights at `p` of a move: a set-up's leg's figures, or the whole move's. */
  const usesAt = (name) => MOVES[name].uses;

  // An example of where the ball stood against the old zero.
  const BEFORE = { x: 123.456, y: 78.9 };

  /** The readout: X and Y against the old zero before, 0 after — held through the moves. */
  const bossReadout = (name) => {
    const after = Boolean(MOVES[name].after);
    return { axes: after ? [['x', 0], ['y', 0]] : [['x', BEFORE.x], ['y', BEFORE.y]], after };
  };

  /*
   * Into place: from off to the side, across over the part, down to a few
   * millimetres above its top — drawn as the ball coming over its middle-ish
   * and shrinking as it goes down.
   */
  const POSITION_MS = 6000;
  const positionAt = (ms) => {
    const p = (ms % POSITION_MS) / POSITION_MS;
    const k = ease(clamp((p - 0.1) / 0.45));
    const from = [-150, 58];
    return {
      tool: [from[0] + (START[0] - from[0]) * k, from[1] + (START[1] - from[1]) * k],
      level: 2 - ease(clamp((p - 0.6) / 0.2)),
    };
  };

  // The server's parts of a touch, as the steps drawn: `x1a-out`, `-down`, `-fast`, `-back`, `-settle`, the slow one bare, `-off`, `-up`.
  const STEP_OF = {
    out: 'Out', down: 'Down', fast: 'Fast', back: 'Back', settle: 'Back', off: 'Off', up: 'Up',
  };
  const TOP_OF = {
    fast: 'zFast', back: 'zBack', settle: 'zBack', off: 'zOff',
  };

  /*
   * What the machine is doing, as the step it belongs to — the server's step
   * names: `z-fast` the top, `x1a-out` the first pass's +X side going out,
   * `y2b` the second's −Y slow touch, and `x1-centre` the way to the middle.
   */
  const moveOfPhase = (phase) => {
    const [step, part] = String(phase || '').split('-');
    if (step === 'z') {
      return TOP_OF[part] || 'zSlow';
    }
    // A size's passes past the second are drawn as the second: every one of them starts at the centre.
    const side = /^([xy])(\d+)([ab])$/.exec(step);
    if (side) {
      return `${side[1]}${Math.min(2, side[2])}${side[3] === 'a' ? 'p' : 'm'}${STEP_OF[part] || 'Slow'}`;
    }
    const centre = /^([xy])(\d+)$/.exec(step);
    return centre && part === 'centre' ? `${centre[1]}${Math.min(2, centre[2])}c` : 'zFast';
  };

  // The words of a step's part where the part's differ from a plate's.
  const PHASE_KEYS = {
    fast: 'probe.boss.phase.fast',
    back: 'probe.phase.back',
    settle: 'probe.phase.settle',
    off: 'probe.phase.off',
    out: 'probe.phase.out',
    down: 'probe.phase.down',
    up: 'probe.boss.phase.up',
    centre: 'probe.hole.phase.centre',
  };

  /** What the ball is doing at the server's step, as `t(key, vars)`. */
  const bossWords = (phase) => {
    const [step, part] = String(phase || '').split('-');
    if (step === 'z') {
      return [part === 'fast' ? 'probe.boss.phase.top' : (PHASE_KEYS[part] || 'probe.phase.touch'), { axis: 'Z' }];
    }
    return [PHASE_KEYS[part] || 'probe.phase.touch', { axis: MOVES[moveOfPhase(phase)].way }];
  };

  /** The part as the centre screens take it — `CentreParams`, `CentreCycle`, `CentrePosition`. */
  return {
    size,
    part: {
      kind: 'boss', r: BOSS_R, toolR: TOOL_R, grow: 0.6, view: [-101, -94, 202, 188],
      // One axis: a bar, drawn as a strip that wide (`CentreScene`).
      strip: axes.length === 1 ? axes[0] : null,
      // A rectangle measured (Pomiar): drawn square, not round.
      square,
    },
    // From the front too (review note, 2026-10-01): the move under way, or the ball on its way into place.
    side: (name, p, how) => bossSide(MOVES[name], p, how),
    sidePlace: ({ tool, level }) => bossSide({ kind: 'place', frames: [[0, tool, level], [1, tool, level]] }, 0),
    // Which view a phone shows by itself: the side for what goes up and down.
    viewOf: (name, p, focus) => {
      const move = MOVES[name];
      const vertical = ['topFast', 'topBack', 'topSlow', 'down', 'up'].includes(move.kind);
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
    explain: (name, texts, say) => explainOf(MOVES[name], texts, say),
    usesAt,
    readout: bossReadout,
    positionAt,
    moveOfPhase,
    words: bossWords,
  };
};

export const BOSS_CYCLE = bossCycleOf();

export const {
  order: bossOrder, groups: bossGroups, timeline: bossTimeline, playAt, moveOf, titleOf, scene: bossScene, code: bossCode, readout: bossReadout, moveOfPhase, words: bossWords, params: BOSS_PARAMS, usesAt, positionAt,
} = BOSS_CYCLE;
