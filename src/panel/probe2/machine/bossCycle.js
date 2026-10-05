/**
 * A part measured from outside, as its drawing moves through it (Mateusz,
 * 2026-10-01; the server's `services/probe/strategies/size`): seen from
 * above, the ball touches the top first, then for each side goes out past it
 * over the top, down beside it, touches it moving in and rises again — +X,
 * −X, to the middle, then the same across Y; twice, or once (`passes`). Then
 * its size is said.
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
import {
  EDGE_TILT, OVAL, SLOT, anglePoints, buildSides, foundOf, layoutOf, sideGroups,
} from './edgeMoves';
import { holeSide } from './holeSide';
import { phasesOf } from './bossPhases';
import { bossSide } from './bossSide';
import { slowReach } from './probeFields';
import { frameAt, layOut, totalOf } from './timeline';

// What the part's group and its rough size are called; a stud's or a bar's are their own (`names`).
const PART_NAMES = { group: 'probe.group.part', size: 'probe.field.bossSize' };

// What the last step's line says it is worked out from, where a layout finds an angle or a surface's Z.
const ZERO_CODES = { angle: 'probe.size.codeEdge', surface: 'probe.size.codeSurface', corner: 'probe2.size.codeCorner' };

/**
 * The part cycle for `axes` — one for a bar's width — ending in the size
 * measured (Mateusz, 2026-10-03); `square`, a rectangular part's, drawn so.
 * `layout`, one of `edgeMoves`' — an edge, a rectangle at an angle from
 * outside or inside: sides touched at two points each instead, the part
 * drawn square and turned `tilt` degrees — the angle measured, made large
 * enough to see.
 */
export const bossCycleOf = ({
  axes = AXES, square = false, names = PART_NAMES, layout = null, tilt = EDGE_TILT,
} = {}) => {
  const { moves: MOVES, order: ORDER } = layout ? buildSides(layout, tilt) : build({ axes });
  const L = layout && layoutOf(layout);
  const edge = Boolean(layout) && layout.startsWith('edge');
  const inside = L?.from === 'inside';
  // A round part's size is its diameter, said once.
  const round = !square && !layout && axes.length === 2;

  /** The moves in order, for one pass or two. */
  const bossOrder = (passes = 2) => ORDER.filter((name) => passes !== 1 || MOVES[name].pass !== 2);
  const moveOf = (name) => MOVES[name];

  /** A move's spoken name: `t(key, vars)`. */
  const titleOf = (name) => {
    const move = MOVES[name];
    // A side's point is numbered as such, not by its pass (every point is pass 1).
    return [move.titleKey, { pass: move.point ?? move.pass, axis: move.way }];
  };

  const STEPS = ['Out', 'Down', 'Fast', 'Back', 'Slow', 'Off', 'Up'];

  /*
   * The bar's stages, as the corner's: the top's search and measuring, each
   * pass across X and across Y, the zero. Two walls on an axis, so a
   * sub-stage there is a wall, as the hole's (rule, Mateusz 2026-10-01).
   */
  const TOP = {
    id: 'z', name: 'Z', subs: [{ key: 'probe.stage.search', moves: ['zFast'] }, { key: 'probe.bar.measure', moves: ['zBack', 'zSlow', 'zOff'] }],
  };
  const bossGroups = (passes = 2) => (layout ? [...(inside ? [] : [TOP]), ...sideGroups(layout)] : [TOP].concat([1, 2].slice(0, passes).flatMap((pass) => axes.map((axis) => {
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
    id: 'zero', key: 'probe.bar.size', folded: true, subs: [{ key: 'probe.stage.size', moves: ['zero'] }],
  }]));

  const BOSS_PARAMS = layout ? L.params : [
    { id: 'part', key: names.group, fields: ['bossSize'], names: { bossSize: names.size } },
    { id: 'reach', key: 'probe.group.reach', fields: ['clear', 'overTop', 'depth', 'maxZ'] },
    // How many passes, a switch at the group's head.
    { id: 'measure', key: 'probe.group.measure', fields: ['fast', 'slow', 'retract'], passes: true, repeats: true },
    // Only for the size said back: the centre needs no radius.
    { id: 'probe', key: 'probe.group.probe', fields: ['ballDiameter'] },
  ];

  // A figure being set loops the step it changes, its part lit.
  const first = layout ? anglePoints(layout)[0] : `${axes[0]}1p`;
  const EDIT = {
    spacing: [`${first}Along`, 'spacing'],
    overTop: ['zOff', 'overTop'],
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

  // Where the ball meets the side: a turned side's point, as the move knows it, or on the round part's rim.
  const onSide = (move) => move.touchAt ?? [move.wall[0] * (BOSS_R / (BOSS_R + TOOL_R)), move.wall[1] * (BOSS_R / (BOSS_R + TOOL_R))];

  // The two touches the angle is drawn through, and how far a side's search goes, as the layout says it.
  const ANGLE = layout ? anglePoints(layout) : [];
  const reachText = (texts) => ({ clear: texts.clear, holeSize: texts.holeSize })[L?.reach] ?? reachOf(texts);

  // The steps after a side's fast touch: the side is touched.
  const TOUCHED = ['back', 'slow', 'up'];

  /**
   * The drawing of move `name` at `p`: the ball's centre and height, the arrow
   * of the step under way, a figure's dimension, the sides this pass has
   * touched, the touch under way and the size measured. `texts` the figures,
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
    // How far a side's search goes: out past it from the middle thought, or, for an edge, from where the ball started.
    const out = say('clear', reachText(texts));
    const {
      motion = null, limit = null, reach = null, dims: stepDims = [],
    } = above(move, p, isGoing(move, p), said, upTo, lit, out, upTo(say('retract', slowReach(texts))));
    // The step's arrow over its whole run, drawn or not: labels keep off it all along (L16).
    const { motion: way = null } = above(move, p, true, said, upTo, lit, '');
    // On a set-up, how far out from the middle thought: half the part and the way past it, one figure, the sum,
    // a short tick at the part's edge (rule 1, Mateusz 2026-10-02); lit, and named, with either figure.
    let dims = stepDims;
    if (move.kind === 'out') {
      // Just outside the part, by its edge (review note #8, 2026-10-02: "bliżej krawędzi materiału").
      const at = BOSS_R + ASIDE_PART;
      dims = [{
        id: lit('size') ? 'size' : 'clear', axis: move.axis, at, from: setOn(move.axis, move.out, move.guess), mid: setOn(move.axis, move.out, move.rim), to: move.out, text: out, lit: lit('clear') || lit('size'),
      }];
    } else if (move.span) {
      // The way between a side's two points, along it, on the part's far side from it.
      dims = [{
        id: 'spacing', axis: move.axis, at: move.spanAt, from: setOn(move.axis, [0, 0], move.span[0]), to: setOn(move.axis, [0, 0], move.span[1]), text: said('spacing'), lit: lit('spacing'),
      }];
    } else if (layout && move.kind === 'zero') {
      // A turned part's result is its angle, drawn, and its figures beside the drawing, not sizes across it.
      dims = [];
    } else if (move.kind === 'zero') {
      // The part's size, side to side, each axis measured — under it and beside it; a round one's one diameter.
      dims = (round ? ['x'] : axes).map((axis) => ({
        id: `size${axis}`, axis, at: BOSS_R + ASIDE_PART, from: setOn(axis, [0, 0], -BOSS_R), to: setOn(axis, [0, 0], BOSS_R), text: (round ? sizes.d : sizes[axis]) ?? (round ? 'Ø' : axis.toUpperCase()), lit: false,
      }));
    }
    let contact = null;
    if ((move.kind === 'fast' || move.kind === 'slow') && near(tool, move.wall)) {
      contact = onSide(move);
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
      // An edge's result shows both its touches: the angle is the line through them.
      touched: (layout && move.kind === 'zero' ? ORDER.filter((one) => MOVES[one].kind === 'fast' && MOVES[one].point).map((one) => MOVES[one].side) : sides)
        .map((side) => onSide(MOVES[`${side}Fast`])),
      // And the angle itself: from the axis the side runs along, at the first touch, to the line through both.
      // An oval's from its middle along its long axis; a side's through its first two touches.
      angle: layout && move.kind === 'zero' ? {
        ...(L.outline ? { at: [0, 0], to: [Math.cos((tilt * Math.PI) / 180), Math.sin((tilt * Math.PI) / 180)] } : Object.fromEntries(['at', 'to'].map((end, k) => [end, onSide(MOVES[`${ANGLE[k]}Fast`])]))),
        base: setOn(MOVES[`${ANGLE[0]}Along`].axis, [0, 0], 1),
        text: sizes.a ?? '∠',
        lit: lit('dim'),
      } : null,
      contact,
      centre: move.kind === 'centre' && p >= move.end ? move.to : null,
      // The ball's diameter: it is taken off to say the part's size — not where an angle is drawn, said under it instead.
      dia: move.kind === 'zero' && !layout ? { text: `Ø${said('ballDiameter')}`, lit: lit('dim') } : null,
      focus,
    };
  };

  /** The step's line at `p`, with the figures typed; a way with no figures is said in words, `[key]`. */
  const bossCode = (name, texts) => {
    const move = MOVES[name];
    const twice = fmt(2 * numberOf(texts.retract));
    const down = downOf(texts);
    const AXIS = move.axis?.toUpperCase();
    // The way to the side: in, against its sign, from outside; out to a pocket's wall (`dir`).
    const dir = move.dir ?? -move.sign;
    const inward = `${AXIS}${dir > 0 ? '+' : '-'}`;
    const outward = `${AXIS}${dir > 0 ? '-' : '+'}`;
    const CODES = {
      topFast: () => `G38.2 Z-${texts.maxZ} F${texts.fast}`,
      topBack: () => `G0 Z+${move.lift ? texts.overTop : texts.retract}`,
      // The slow touch goes twice the way back, as the server's `touch` does.
      topSlow: () => `G38.2 Z-${twice} F${texts.slow}`,
      out: () => ['probe.boss.outCode'],
      down: () => `G38.3 Z-${down} F${texts.fast}`,
      fast: () => `G38.2 ${inward}${reachText(texts)} F${texts.fast}`,
      back: () => `G0 ${outward}${texts.retract}`,
      slow: () => `G38.2 ${inward}${twice} F${texts.slow}`,
      up: () => `G0 Z+${down}`,
      zero: () => [ZERO_CODES[layout ? foundOf(layout) : 'size'] ?? ({ oval: 'probe.size.codeOval', slot: 'probe.size.codeSlot' }[L?.outline] ?? (layout ? 'probe.size.codeTurned' : 'probe.size.codeBoss'))],
      centre: () => [move.code ?? 'probe.hole.centreCode'],
    };
    return CODES[move.kind]();
  };

  /** What lights at `p` of a move: a set-up's leg's figures, or the whole move's. */
  const usesAt = (name) => MOVES[name].uses;

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
    const to = layout ? L.start : START;
    return {
      tool: [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k],
      // Down into a pocket as into a hole; over a part, to just above its top.
      level: (inside ? 1 : 2) - ease(clamp((p - 0.6) / 0.2)),
    };
  };

  const { moveOfPhase, words: bossWords } = phasesOf(MOVES);

  const part = {
    // A pocket is drawn as a hole is: the work round it, the ball in it.
    kind: inside ? 'hole' : 'boss', r: BOSS_R, toolR: TOOL_R, grow: inside ? 1.2 : 0.6, view: [-101, -94, 202, 188],
    // One axis: a bar, drawn as a strip that wide (`CentreScene`).
    strip: axes.length === 1 ? axes[0] : null,
    // A rectangle measured (Pomiar), or a turned part's: drawn square, not round — an oval as one — turned by its angle.
    square: square || (Boolean(layout) && !L.outline),
    oval: L?.outline === 'oval' ? OVAL : null,
    slot: L?.outline === 'slot' ? SLOT : null,
    turn: layout ? tilt : 0,
  };

  /** The part as the centre screens take it — `CentreParams`, `CentreCycle`, `CentrePosition`. */
  return {
    part,
    // From the front too (review note, 2026-10-01): the move under way, or the ball on its way into place; a pocket's as a hole's.
    side: inside ? (name, p, how) => holeSide({ ...MOVES[name], ...toolAt(MOVES[name], p) }, p, how, part) : (name, p, how) => bossSide(MOVES[name], p, how),
    sidePlace: ({ tool, level }) => (inside ? holeSide({ kind: 'place', at: tool, level }, 0, {}, part) : bossSide({ kind: 'place', frames: [[0, tool, level], [1, tool, level]] }, 0)),
    // Which view a phone shows by itself: the side for what goes up and down.
    viewOf: (name, p, focus) => {
      const move = MOVES[name];
      const vertical = ['topFast', 'topBack', 'topSlow', 'down', 'up'].includes(move.kind);
      return vertical || focus === 'depth' ? 'side' : 'top';
    },
    place: { true: 'probe.place.edge', false: inside ? 'probe.place.pocket' : 'probe.place.boss' }[edge],
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
    // An edge's search is the clearance alone, a pocket's its rough size: no sum to explain.
    explain: (name, texts, say) => (layout && L.reach !== 'part' && ['out', 'fast'].includes(MOVES[name].kind) ? null : explainOf(MOVES[name], texts, say)),
    usesAt,
    positionAt,
    moveOfPhase,
    words: bossWords,
  };
};
