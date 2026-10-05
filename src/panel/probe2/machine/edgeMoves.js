import {
  ABOVE, AXES, BACK, BOSS_R, OUT, TOOL_R, setOn, topOf,
} from './bossMoves';
import { EDGE_SIDES, LAYOUTS } from './edgeLayouts';

export { EDGE_SIDES, layoutOf } from './edgeLayouts';

/*
 * Sides touched at two points each (Pomiar, the server's `strategies/edge`
 * and `strategies/turned`): an edge alone, for its angle, or the four sides
 * of a rectangle at an angle — a part from outside, a pocket from inside.
 * Every move along one axis. Each point is a pass of its own on the bar, and
 * the server's step names (`y1b`, `y2b`) say which.
 *
 * From outside the ball starts over the part; the top as for the part; then
 * for each point, along the side to it over the top, out past the side, down
 * beside it, the touch moving in, up again. From inside it starts in the
 * pocket: for each point back to the middle across the side, along it to the
 * point, the touch moving out; at the end back to the middle.
 */
// Half the way between the points along the side.
const SPAN = 18;
// How far past a pocket's wall its search is drawn going.
const PAST = 12;
// How far the part is drawn turned for the Setup: an angle is the thing measured, so it is never drawn square.
export const EDGE_TILT = 8;

/**
 * Where the side of the part, turned `tilt` degrees anticlockwise about its
 * middle, is along `edge`'s axis at `u` along it — the square's side, turned.
 */
export const rimOf = (edge, tilt) => {
  const { axis, sign } = EDGE_SIDES[edge];
  const a = (tilt * Math.PI) / 180;
  // Turning anticlockwise tips a side along X up to the right, one along Y to the left.
  const slope = (axis === 'y' ? 1 : -1) * Math.tan(a);
  return (u) => (sign * BOSS_R) / Math.cos(a) + slope * u;
};

// An oval as drawn: its halves, the long along its own X; a slot: its straight sides' half length and its ends' radius.
export const OVAL = [BOSS_R, Math.round(BOSS_R * 0.68)];
// Half as wide as long, and wide enough that the ball drawn, backed off a wall, keeps clear of the other (review
// note, 2026-10-05: drawn narrower it looked as if a way went into the far wall).
export const SLOT = [20, 20];

/** How far `p` is from the wall of the slot drawn, turned `tilt` degrees — negative inside. */
const slotGap = ([px, py], tilt) => {
  const g = (tilt * Math.PI) / 180;
  const u = px * Math.cos(g) + py * Math.sin(g);
  const v = -px * Math.sin(g) + py * Math.cos(g);
  const over = Math.abs(u) - SLOT[0];
  return over <= 0 ? Math.abs(v) - SLOT[1] : Math.hypot(over, v) - SLOT[1];
};

/**
 * Where the line along `axis` through `spot` meets the line `level` off the
 * slot's wall (0 the wall, the ball's radius out or in for its centre), on
 * its `sign` side: out from the line's middle, halving.
 */
const slotCross = (axis, spot, sign, level, tilt) => {
  const at = (t) => (axis === 'x' ? [t, spot[1]] : [spot[0], t]);
  let [lo, hi] = [0, sign * 3 * BOSS_R];
  if (slotGap(at(lo), tilt) >= level) {
    return sign * BOSS_R;
  }
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (slotGap(at(mid), tilt) < level) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
};

/**
 * Where the line along `axis` through `spot` crosses the oval — halves
 * `[ea, eb]`, turned `tilt` degrees — on its `sign` side, along that axis.
 */
const ovalCross = (axis, spot, sign, [ea, eb], tilt) => {
  const g = (tilt * Math.PI) / 180;
  const [c, s] = [Math.cos(g), Math.sin(g)];
  // The point is spot + t·w, w the axis's way; into the oval's own frame, a quadratic in t.
  const w = axis === 'x' ? [1, 0] : [0, 1];
  const base = axis === 'x' ? [0, spot[1]] : [spot[0], 0];
  const local = (p) => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c];
  const [p0, d] = [local(base), local(w)];
  const qa = (d[0] / ea) ** 2 + (d[1] / eb) ** 2;
  const qb = 2 * ((p0[0] * d[0]) / ea ** 2 + (p0[1] * d[1]) / eb ** 2);
  const qc = (p0[0] / ea) ** 2 + (p0[1] / eb) ** 2 - 1;
  const root = Math.sqrt(Math.max(0, qb * qb - 4 * qa * qc));
  return sign > 0 ? (-qb + root) / (2 * qa) : (-qb - root) / (2 * qa);
};

// A point's steps, in order, from outside and from inside; from inside the way back to the middle at the end.
const STEPS = {
  outside: ['Along', 'Out', 'Down', 'Fast', 'Back', 'Slow', 'Off', 'Up'],
  inside: ['In', 'Along', 'Fast', 'Back', 'Slow', 'Off'],
};
// Away from the last side's wall first (X, the left's), then along it — as the server goes; one wall's, across it first.
const homeOf = (name) => (EDGE_SIDES[LAYOUTS[name].sides.at(-1)].axis === 'y' ? ['retY', 'retX'] : ['retX', 'retY']);
// One line along an angle's two touches: an edge's from outside, a wall's from inside — or two, a corner's.
const angled = (name) => /^(edge|wall|corner)-/.test(name);
/** What a layout's last stage finds: an angle, a surface's Z, or a size. */
export const foundOf = (name) => {
  if (LAYOUTS[name]?.corner) {
    return 'corner';
  }
  if (angled(name)) {
    return 'angle';
  }
  return name === 'surface' ? 'surface' : 'size';
};
const ZERO_TITLES = { angle: 'probe.size.move.edge', surface: 'probe.size.move.surface', corner: 'probe2.size.move.corner' };
// The last stage on the bar, named for what it finds.
const BAR_KEYS = {
  angle: 'probe.bar.angle', surface: 'probe.bar.surface', size: 'probe.bar.size', corner: 'probe2.bar.corner',
};
const STAGE_KEYS = {
  angle: 'probe.stage.angle', surface: 'probe.stage.surface', size: 'probe.stage.size', corner: 'probe2.stage.corner',
};

/** A side's two points, by the names its touches go by: `y1m`, `y2m` for the front. */
const pointsOf = (side) => {
  const { axis, sign } = EDGE_SIDES[side];
  return [1, 2].map((point) => `${axis}${point}${sign > 0 ? 'p' : 'm'}`);
};

/** The points of the first side touched: from outside an edge's, the front's — the angle's two touches. */
// None for a surface alone: no side touched.
export const anglePoints = (name) => (LAYOUTS[name].sides.length ? pointsOf(LAYOUTS[name].sides[0]) : []);

/**
 * The moves of layout `name`, the part drawn turned `tilt` degrees. Each
 * touch knows the point on the side it meets (`touchAt`) and which way the
 * ball goes to it (`dir`); `rim`, where the side is along its axis there;
 * an Along move, where its spacing's dimension stands (`spanAt`).
 */
export const buildSides = (name, tilt = EDGE_TILT) => {
  const {
    sides, from, start: S, outline, span = SPAN, corner,
  } = LAYOUTS[name];
  /*
   * Where along a side its two points are from the start: half the spacing
   * each way — or, at a corner, the first square across from the start and
   * the second the whole spacing on, away from the corner, in rising order
   * as the server goes (`corner3d`).
   */
  const shiftsOf = (along) => {
    if (!corner) {
      return [-span, span];
    }
    const to = corner[along] * 2 * span;
    return [Math.min(0, to), Math.max(0, to)];
  };
  const inside = from === 'inside';
  const level = inside ? 0 : ABOVE;
  // The ball's centre touching a turned side is its radius off it, square to it.
  const reach = TOOL_R / Math.cos((tilt * Math.PI) / 180);
  const { moves, order } = inside ? { moves: {}, order: [] } : topOf(S);
  let at = S;
  const leg = (from0, to, kind, titleKey, uses, low = level, extra = {}) => ({
    kind, from: from0, to, frames: [[0, from0, low], [0.1, from0, low], [0.85, to, low, true], [1, to, low]], end: 0.85, titleKey, uses, ...extra,
  });
  sides.forEach((edge) => {
    const { axis, along, sign } = EDGE_SIDES[edge];
    const [i, j] = [AXES.indexOf(axis), AXES.indexOf(along)];
    const rimAt = rimOf(edge, tilt);
    // Inside, the wall is the pocket's, and the ball goes out to it.
    const dir = inside ? sign : -sign;
    pointsOf(edge).forEach((side, k) => {
      const point = k + 1;
      // Named for the side, as the hole's and the part's are: Y− is the front, from outside or in.
      const way = `${axis.toUpperCase()}${sign > 0 ? '+' : '−'}`;
      // Pass 1 for all: points of sides, not passes — so none is left out of the bar (`order(1)`).
      const common = {
        axis, sign, dir, pass: 1, point, side, way,
      };
      if (inside) {
        const home = setOn(axis, at, S[i]);
        moves[`${side}In`] = { ...common, ...leg(at, home, 'centre', 'probe.edge.move.in', []), code: 'probe.edge.inCode' };
        order.push(`${side}In`);
        at = home;
      }
      const shifts = shiftsOf(along);
      const spot = setOn(along, at, S[j] + shifts[point - 1]);
      // The spacing's dimension outside the part — or inside the pocket — on the side away from this one.
      // Outside the part on its far side; inside, within the hole near its far wall.
      const extent = { oval: OVAL[axis === 'y' ? 1 : 0], slot: axis === 'y' ? SLOT[1] : SLOT[0] + SLOT[1] }[outline] ?? BOSS_R;
      const spanAt = (axis === 'y' ? sign : -sign) * (extent + (inside ? -8 : 10));
      moves[`${side}Along`] = {
        ...common,
        ...leg(at, spot, 'centre', inside ? 'probe2.edge.move.alongGuarded' : 'probe.edge.move.along', ['spacing']),
        axis: along,
        spanAt,
        span: [S[j] + shifts[0], S[j] + shifts[1]],
        // Inside, the way along is guarded — `G38.3`, stopped by a wall in it (audit K4).
        code: inside ? 'probe2.edge.alongGuardedCode' : 'probe.edge.alongCode',
      };
      const out = inside ? spot : setOn(axis, spot, sign * OUT);
      // A square's side is straight; an oval's or a slot's is crossed where the line through the point meets it,
      // the ball's centre where it meets the outline grown — or, inside, shrunk — by the ball's radius.
      const grown = inside ? -TOOL_R : TOOL_R;
      const CROSS = {
        oval: (level) => ovalCross(axis, spot, sign, OVAL.map((half) => half + level), tilt),
        slot: (level) => slotCross(axis, spot, sign, level, tilt),
      }[outline];
      const rim = CROSS ? CROSS(0) : rimAt(spot[j]);
      const wall = setOn(axis, out, CROSS ? CROSS(grown) : rim - dir * reach);
      // Inside, off the wall straight back to the middle line, as the server goes since the audit's K4: the back-off
      // and that way out are two rapids the same way, one line. From outside, the back-off alone.
      const off = setOn(axis, wall, inside ? S[i] : wall[i] - dir * BACK);
      const touchAt = setOn(axis, wall, rim);
      // How far the search may go, as drawn: in to the start from outside, past the wall from inside.
      const guess = inside ? rim + dir * PAST : S[i];
      Object.assign(common, {
        out, wall, off, rim, guess, touchAt,
      });
      if (!inside) {
        moves[`${side}Out`] = { ...common, ...leg(spot, out, 'out', 'probe.edge.move.setOut', ['clear']) };
        moves[`${side}Down`] = { ...common, ...leg(out, out, 'down', 'probe.edge.move.setDown', ['depth', 'overTop']), frames: [[0, out, ABOVE], [0.1, out, ABOVE], [0.85, out, 0, true], [1, out, 0]] };
      }
      moves[`${side}Fast`] = { ...common, ...leg(out, wall, 'fast', 'probe.edge.move.fast', ['fast', inside ? 'holeSize' : 'clear'], 0) };
      moves[`${side}Back`] = { ...common, kind: 'back', from: wall, frames: [[0, wall, 0], [0.15, wall, 0], [0.7, off, 0, true], [1, off, 0]], end: 0.7, titleKey: 'probe.edge.move.back', uses: ['retract'] };
      moves[`${side}Slow`] = { ...common, kind: 'slow', from: off, frames: [[0, off, 0], [0.1, off, 0], [0.7, wall, 0], [1, wall, 0]], end: 0.7, titleKey: 'probe.edge.move.slow', uses: ['slow', 'retract'] };
      moves[`${side}Off`] = { ...common, kind: 'back', from: wall, frames: [[0, wall, 0], [0.15, wall, 0], [0.7, off, 0, true], [1, off, 0]], end: 0.7, titleKey: 'probe.edge.move.off', uses: ['retract'] };
      if (!inside) {
        moves[`${side}Up`] = { ...common, kind: 'up', from: off, frames: [[0, off, 0], [0.1, off, 0], [0.8, off, ABOVE, true], [1, off, ABOVE]], end: 0.8, titleKey: 'probe.edge.move.up', uses: ['depth', 'overTop'] };
      }
      order.push(...STEPS[from].filter((step) => step !== 'In').map((step) => `${side}${step}`));
      at = off;
    });
  });
  if (inside) {
    // Back to the middle, one axis at a time, as the server goes: away from the last wall first.
    const home = homeOf(name);
    const first = home[0] === 'retX' ? 'x' : 'y';
    const second = first === 'x' ? 'y' : 'x';
    const half = setOn(first, at, S[AXES.indexOf(first)]);
    moves[home[0]] = { ...leg(at, half, 'centre', 'probe.edge.move.home', []), axis: first, way: first.toUpperCase(), code: 'probe.edge.homeCode' };
    moves[home[1]] = { ...leg(half, S, 'centre', 'probe.edge.move.home', []), axis: second, way: second.toUpperCase(), code: 'probe.edge.homeCode' };
    order.push(...home);
    at = S;
  }
  moves.zero = {
    kind: 'zero', from: at, frames: [[0, at, level], [1, at, level]], titleKey: ZERO_TITLES[foundOf(name)] ?? ({ oval: 'probe.size.move.oval', slot: 'probe.size.move.slot' }[outline] ?? 'probe.size.move.size'), uses: ['ballDiameter'], end: 0.35,
  };
  order.push('zero');
  return { moves, order };
};

/** The bar after the top: each point — one side, so a search and a measuring (map §8) — then the result. */
export const sideGroups = (name) => {
  const { sides, from } = LAYOUTS[name];
  const steps = STEPS[from];
  const searching = from === 'inside' ? 3 : 4;
  const found = foundOf(name);
  return sides.flatMap((side) => pointsOf(side).map((point, k) => ({
    id: point,
    name: `${EDGE_SIDES[side].axis.toUpperCase()}${EDGE_SIDES[side].sign > 0 ? '+' : '−'} · ${k + 1}`,
    subs: [
      { key: 'probe.stage.search', moves: steps.slice(0, searching).map((step) => `${point}${step}`) },
      { key: 'probe.bar.measure', moves: steps.slice(searching).map((step) => `${point}${step}`) },
    ],
  }))).concat([{
    id: 'zero',
    key: BAR_KEYS[found],
    folded: true,
    subs: [{ key: STAGE_KEYS[found], moves: [...(from === 'inside' ? homeOf(name) : []), 'zero'] }],
  }]);
};
