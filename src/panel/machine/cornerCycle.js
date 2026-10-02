/**
 * The L plate's cycle as its drawings move through it (Claude Design,
 * `templates/probe-corner-proposal`, 2026-09-30, the "podział" layout): the
 * corner from above and from the side at once, one move after another — Z
 * touched on the plate's top, then each wall: set up beside it, touch fast,
 * back off, touch slow, off it again — and the zero written, then the lift.
 *
 * Positions are the front-left corner's in the drawing's units; the others
 * are mirrors of it (`cornerSides`). A position is `[x, y, level]`: x and y
 * from above, `level` the tool's height between beside the wall, the depth
 * under the plate's top and still over the work (0), and a back-off over the
 * plate's top (1). What a move says —
 * its figures and G-code — is made from the figures typed and matches the
 * steps the server runs (`services/probe/strategies/corner`).
 */

import { C0, MOVES } from './cornerMoves';
import { frameAt, layOut, totalOf } from './timeline';

export {
  C0, LIFTED, XO, explainOf, sumOf,
} from './cornerMoves';

/*
 * From the side: the plate's top, and the tip at each level. Beside the wall
 * the tip is the depth under the plate's top — over the work, the depth
 * counted from the plate as the server counts it (Mateusz, 2026-10-02) — and
 * drawn as far under it as a back-off is over it; higher, 48 a level.
 */
export const TOP = 146;
const STEP = 12;
export const tipOf = (level) => (level >= 1 ? TOP - STEP - (level - 1) * 48 : TOP + STEP * (1 - 2 * level));

// A move is played for its run, then held; a set-up's or the lift's a second.
export const SPAN_MS = 2600;
export const HOLD_MS = 600;
const STEP_MS = 1000;
// A move looped on its own holds its end the same long while for every move (as the Z plate's).
export const LOOP_HOLD_MS = 2500;
// A figure's loop plays its part of the move over this long.
const FIELD_RUN_MS = 2400;

const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2);
const lerp = (a, b, u) => a + (b - a) * u;

/** Where the tool is at `p` through `[at, [x, y], level]` keyframes, eased between them. */
export const positionOf = (frames, p) => {
  for (let i = 0; i < frames.length - 1; i++) {
    const [t0, [x0, y0], z0] = frames[i];
    const [t1, [x1, y1], z1] = frames[i + 1];
    if (p >= t0 && p <= t1) {
      const u = ease((p - t0) / Math.max(1e-6, t1 - t0));
      return [lerp(x0, x1, u), lerp(y0, y1, u), lerp(z0, z1, u)];
    }
  }
  const [, [x, y], z] = frames[frames.length - 1];
  return [x, y, z];
};

export const CORNER_ORDER = ['zFast', 'zBack', 'zSlow', 'zOff', 'xOut', 'xDown', 'xFast', 'xBack', 'xSlow', 'xOff', 'yUp', 'yOver', 'yOut', 'yDown', 'yFast', 'yBack', 'ySlow', 'yOff', 'zero', 'lift', 'corner'];

export const CORNER_GROUPS = [
  { id: 'z', name: 'Z', subs: [{ key: 'probe.stage.search', moves: ['zFast'] }, { key: 'probe.bar.measure', moves: ['zBack', 'zSlow', 'zOff'] }] },
  { id: 'x', name: 'X', subs: [{ key: 'probe.stage.search', moves: ['xOut', 'xDown', 'xFast'] }, { key: 'probe.bar.measure', moves: ['xBack', 'xSlow', 'xOff'] }] },
  { id: 'y', name: 'Y', subs: [{ key: 'probe.stage.search', moves: ['yUp', 'yOver', 'yOut', 'yDown', 'yFast'] }, { key: 'probe.bar.measure', moves: ['yBack', 'ySlow', 'yOff'] }] },
  // Named only folded: open, its one step names it (review notes, 2026-09-30).
  { id: 'zero', key: 'probe.bar.zero', folded: true, subs: [{ key: 'probe.stage.zero', moves: ['zero', 'lift', 'corner'] }] },
];

/*
 * The figures by what they are about (proposal; its "Przejazdy X/Y" renamed
 * "Przejazdy" — the lift is a move in Z, review of 2026-09-30).
 */
export const CORNER_PARAMS = [
  { id: 'plate', key: 'probe.group.plate', fields: ['cornerThickness', 'wallX', 'wallY'] },
  { id: 'tool', key: 'probe.group.tool', fields: ['toolDiameter'] },
  { id: 'measure', key: 'probe.group.measureAll', fields: ['fast', 'slow', 'retract'] },
  { id: 'reach', key: 'probe.group.reach', fields: ['maxZ', 'maxXY'] },
  { id: 'moves', key: 'probe.group.moves', fields: ['clear', 'depth', 'lift'] },
];

/*
 * A figure being set loops the move it changes, over the part of it that
 * shows the figure (`window`), with its part of the drawing lit: `dim` its
 * dimension, `feed` the arrow's figure, `tool` the tool's diameter, `thick`
 * the plate's top, `wallX`/`wallY` a wall, `clear` the gap before the
 * descent, `rise` the lift.
 */
const EDIT = {
  cornerThickness: ['zero', 'thick', [0, 0.45]],
  maxZ: ['zFast', 'dim'],
  fast: ['zFast', 'feed'],
  retract: ['zBack', 'dim'],
  slow: ['zSlow', 'feed'],
  wallX: ['zero', 'wallX', [0.6, 1]],
  wallY: ['zero', 'wallY', [0.6, 1]],
  toolDiameter: ['xSlow', 'tool'],
  clear: ['xOut', 'clear'],
  depth: ['depth', 'dim'],
  maxXY: ['xFast', 'dim'],
  lift: ['lift', 'rise'],
};

export const moveOf = (name) => MOVES[name];

/*
 * The zero is seen from the side, then from above — on a phone one after the
 * other, turning at TURN — so it plays three times as long, the side held
 * about as long as a loop's end (review note, 2026-09-30: the turn came too soon).
 */
export const TURN = 0.5;

const spanOf = (name) => {
  if (MOVES[name].plane) {
    return STEP_MS + HOLD_MS;
  }
  return MOVES[name].walls ? SPAN_MS * 3 : SPAN_MS;
};

/*
 * Where through its run a move stops changing: a Z touch's way ends at 0.75,
 * a move by its last keyframe that moves, the zero once its lines are in.
 */
export const motionEnd = (name) => {
  const move = MOVES[name];
  if (move.gap) {
    return 0.75;
  }
  let end = 0;
  move.frames.forEach(([at, [x, y], level], i) => {
    const [, [px, py], pl] = i ? move.frames[i - 1] : move.frames[0];
    if (i && (x !== px || y !== py || level !== pl)) {
      end = at;
    }
  });
  if (move.walls) {
    // Looped alone it turns to the top before the loop's hold.
    return TURN;
  }
  return move.zero && !move.zeroAt ? Math.max(end, 0.15) : end;
};

// The view a move starts and ends in, on a phone that shows one: the zero turns from the side to the top, the lift is seen rising.
const viewAt = (name, end) => {
  const move = MOVES[name];
  if (move.view !== 'both') {
    return move.view;
  }
  return end && !move.rise ? 'top' : 'side';
};

/*
 * The cycle on its clock, for the Setup's player: each move its span, and
 * its segments on the bar — the zero's two views on a phone, or one up to
 * where the move stops changing. `apart`, one view at a
 * time (a phone): a move whose next is seen from the other side holds as
 * long as a loop does, so the turn is not lost (review note, 2026-09-30).
 */
export const cornerTimeline = ({ apart = false } = {}) => layOut(CORNER_ORDER, {
  spanOf: (name, i) => {
    const next = CORNER_ORDER[(i + 1) % CORNER_ORDER.length];
    return apart && viewAt(name, true) !== viewAt(next, false) ? spanOf(name) - HOLD_MS + LOOP_HOLD_MS : spanOf(name);
  },
  runOf: (name) => spanOf(name) - HOLD_MS,
  partsOf: (name) => {
    const move = MOVES[name];
    return apart && move.walls ? [[0, TURN], [TURN, 1]] : [[0, motionEnd(name)]];
  },
});

/**
 * Which move plays at `ms` and how far into it (`p`, 0–1 over its run): the
 * whole cycle, or `pinned` alone — the machine's step on the measurement
 * screen — or, a figure being set, its loop, held longer; `still` shows each
 * move's end. `span` is how long the move lasts, `run` how long it moves.
 */
export const playAt = (ms, { pinned = null, field = null, still = false } = {}) => {
  if (field && EDIT[field]) {
    const [name, focus, [from, to] = [0, 1]] = EDIT[field];
    const run = FIELD_RUN_MS;
    // Its part moves until the move stops changing, then holds.
    const moves = Math.max(0, Math.min(1, (motionEnd(name) - from) / (to - from)));
    const span = run * moves + LOOP_HOLD_MS;
    const into = ms % span;
    const u = still ? 1 : Math.min(1, into / run);
    return {
      name, focus, p: from + (to - from) * u, span, run: run * moves, into,
    };
  }
  if (pinned) {
    const run = spanOf(pinned) - HOLD_MS;
    const span = run * motionEnd(pinned) + LOOP_HOLD_MS;
    const into = ms % span;
    return {
      name: pinned, focus: null, p: still ? 1 : Math.min(1, into / run), span, run: run * motionEnd(pinned), into,
    };
  }
  const items = cornerTimeline();
  const frame = frameAt(items, ms % totalOf(items));
  return { ...frame, focus: null, p: still ? 1 : frame.p };
};

/** The move's G-code, turned for the corner, and the figures it uses. */
export const cornerCode = (name, texts, wcs = 1, corner = 'front-left') => {
  const move = MOVES[name];
  return { parts: move.code(texts, wcs).map(signedFor(corner)), now: -1, uses: move.uses };
};

// How far into a Z touch's way the tool is at `p`: still, moving, arrived.
const eased = (p) => {
  if (p < 0.15) {
    return 0;
  }
  return p > 0.75 ? 1 : ease((p - 0.15) / 0.6);
};

/** A Z touch's height over the plate's top at `p`, in the drawing's units. */
export const gapAt = (move, p) => move.gap[0] + (move.gap[1] - move.gap[0]) * eased(p);

/*
 * How far the zero has come in at `p`: Z0, X0 and Y0 and the thicknesses
 * under them together, in both views, over the move's first sixth (review
 * note, 2026-09-30: the walls' labels came in at once, the plate's was there).
 */
export const zeroShown = (move, p) => move.zeroAt ?? Math.min(1, Math.max(0, p / 0.15));

/** The level of a tip `gap` over the plate's top — past 1 above a back-off. */
export const levelOfGap = (gap) => (gap >= STEP ? 1 + (gap - STEP) / 48 : (1 + gap / STEP) / 2);

/*
 * Which way each axis points for a corner: `flipX` the right-hand corners,
 * `flipY` the back ones — the drawing mirrored to match the corner chosen —
 * and `dirs`, the way the tool touches each wall (`strategies/corner`).
 */
const SIDES = {
  'front-left': { flipX: false, flipY: false, dirs: ['X+', 'Y+'] },
  'front-right': { flipX: true, flipY: false, dirs: ['X−', 'Y+'] },
  'back-left': { flipX: false, flipY: true, dirs: ['X+', 'Y−'] },
  'back-right': { flipX: true, flipY: true, dirs: ['X−', 'Y−'] },
};

export const cornerSides = (corner) => SIDES[corner] || SIDES['front-left'];

const OPPOSITE = { '+': '-', '-': '+' };

/**
 * A line written for the front-left corner, turned for `corner`: the moves'
 * X and Y signs mirrored as the drawing is — `G0 X-20` out past a right
 * corner's wall is `G0 X+20` (review note, 2026-10-01).
 */
export const signedFor = (corner) => {
  const { flipX, flipY } = cornerSides(corner);
  return (line) => line.replace(/([XY])([+-])/g, (all, axis, sign) => {
    if ((axis === 'X' && flipX) || (axis === 'Y' && flipY)) {
      return `${axis}${OPPOSITE[sign]}`;
    }
    return all;
  });
};

// An example tool position against the old zero.
export const BEFORE_MM = { x: 123.456, y: 78.9, z: 37.482 };

/*
 * The tool's X, Y and Z as the readout says them: the example against the old
 * zero, then against the new one — where the tool touched the Y wall, a
 * radius and a wall off X0 and Y0, and the plate's top over Z0 — held through
 * the moves, as the Z plate's.
 */
export const cornerReadout = (name, corner, mm) => {
  if (!MOVES[name].after) {
    return { ...BEFORE_MM, after: false };
  }
  const { flipX, flipY } = cornerSides(corner);
  const radius = mm.toolDiameter / 2;
  return {
    x: (flipX ? 1 : -1) * (radius + mm.wallX),
    y: (flipY ? 1 : -1) * (radius + mm.wallY),
    z: mm.cornerThickness,
    after: true,
  };
};

/*
 * Getting the tool into place before measuring: from off to the side and
 * high, across over the plate near the corner, then down to a few
 * millimetres over it, and a while there — as the Z plate's position step.
 */
export const POSITION_MS = 7000;

export const positionAt = (ms) => {
  const p = (ms % POSITION_MS) / POSITION_MS;
  const across = ease(Math.min(1, Math.max(0, (p - 0.1) / 0.3)));
  const down = ease(Math.min(1, Math.max(0, (p - 0.45) / 0.2)));
  return {
    at: [lerp(60, C0[0], across), lerp(200, C0[1], across)],
    level: lerp(2, 1, down),
    over: down >= 1,
    moving: (p > 0.1 && p < 0.4) || (p > 0.45 && p < 0.65),
  };
};

/*
 * What the machine is doing, as the move whose part it is — the server's
 * step names (`services/probe/strategies/corner`), so the measurement screen
 * plays the move the machine is in.
 */
const PHASE_MOVE = {
  'z-fast': 'zFast',
  'z-back': 'zBack',
  'z-settle': 'zBack',
  z: 'zSlow',
  'z-off': 'zOff',
  'x-out': 'xOut',
  'x-down': 'xDown',
  'x-fast': 'xFast',
  'x-back': 'xBack',
  'x-settle': 'xBack',
  x: 'xSlow',
  'x-off': 'xOff',
  'x-up': 'yUp',
  'x-return': 'yOver',
  'y-out': 'yOut',
  'y-down': 'yDown',
  'y-fast': 'yFast',
  'y-back': 'yBack',
  'y-settle': 'yBack',
  y: 'ySlow',
  'y-off': 'yOff',
  lift: 'lift',
  corner: 'corner',
};

export const moveOfPhase = (phase) => PHASE_MOVE[phase] || 'zFast';
