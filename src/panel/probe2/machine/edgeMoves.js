import {
  ABOVE, AXES, BACK, BOSS_R, OUT, TOOL_R, setOn, topOf,
} from './bossMoves';
import { EDGE_SIDES, LAYOUTS } from './edgeLayouts';

export { EDGE_SIDES, layoutOf } from './edgeLayouts';

/*
 * Sides touched at two points each (the server's `strategies/edge` and
 * `strategies/corner3d`): an edge alone, for its angle, a pocket's wall from
 * inside, or a corner's two sides — a part's from outside, a pocket's from
 * inside. Every move along one axis. Each point is a pass of its own on the bar, and
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

// A point's steps, in order, from outside and from inside; from inside the way back to the middle at the end.
const STEPS = {
  outside: ['Along', 'Out', 'Down', 'Fast', 'Back', 'Slow', 'Off', 'Up'],
  inside: ['In', 'Along', 'Fast', 'Back', 'Slow', 'Off'],
};
// Away from the last side's wall first (X, the left's), then along it — as the server goes; one wall's, across it first.
const homeOf = (name) => (EDGE_SIDES[LAYOUTS[name].sides.at(-1)].axis === 'y' ? ['retY', 'retX'] : ['retX', 'retY']);
// One line along an angle's two touches: an edge's from outside, a wall's from inside — or two, a corner's.
const angled = (name) => /^(edge|wall|corner)-/.test(name);
/** What a layout's last stage finds: a corner, an angle, or a surface's Z. */
export const foundOf = (name) => {
  if (LAYOUTS[name]?.corner) {
    return 'corner';
  }
  return angled(name) ? 'angle' : 'surface';
};
const ZERO_TITLES = { angle: 'probe.size.move.edge', surface: 'probe.size.move.surface', corner: 'probe2.size.move.corner' };
// The last stage on the bar, named for what it finds.
const BAR_KEYS = { angle: 'probe.bar.angle', surface: 'probe.bar.surface', corner: 'probe2.bar.corner' };
const STAGE_KEYS = { angle: 'probe.stage.angle', surface: 'probe.stage.surface', corner: 'probe2.stage.corner' };

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
    sides, from, start: S, corner, step, second,
  } = LAYOUTS[name];
  /*
   * Where along a side its two points are from the start: half the spacing
   * each way — or, at a corner, the first square across from the start and
   * the second the whole spacing on, away from the corner, in rising order
   * as the server goes (`corner3d`).
   */
  const shiftsOf = (along) => {
    if (!corner) {
      return [-SPAN, SPAN];
    }
    const to = corner[along] * 2 * SPAN;
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
      const spanAt = (axis === 'y' ? sign : -sign) * (BOSS_R + (inside ? -8 : 10));
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
      const rim = rimAt(spot[j]);
      const wall = setOn(axis, out, rim - dir * reach);
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
  if (step) {
    // Over to the lower surface — the operator's way, by the jog — and its top touched as the upper's was (`low`).
    moves.jog = {
      ...leg(at, second, 'centre', 'probe2.height.move.jog', []), axis: 'x', way: 'X', code: 'probe2.height.jogCode',
    };
    const lower = topOf(second);
    const low = (key) => key.replace(/^z/, 'z2');
    Object.entries(lower.moves).forEach(([key, move]) => {
      moves[low(key)] = { ...move, low: true };
    });
    order.push('jog', ...lower.order.map(low));
    at = second;
  }
  moves.zero = {
    kind: 'zero', from: at, frames: [[0, at, level], [1, at, level]], titleKey: step ? 'probe2.height.move.dz' : ZERO_TITLES[foundOf(name)], uses: step ? [] : ['ballDiameter'], end: 0.35, low: Boolean(step), dz: Boolean(step),
  };
  order.push('zero');
  return { moves, order };
};

/** The bar after the top: each point — one side, so a search and a measuring (map §8) — then the result. */
export const sideGroups = (name) => {
  const { sides, from, step } = LAYOUTS[name];
  // Two surfaces: the way over by the jog, and the lower's top as the upper's.
  const lower = [
    { id: 'jog', key: 'probe2.height.bar.jog', subs: [{ key: 'probe2.height.bar.jog', moves: ['jog'] }] },
    { id: 'z2', name: 'Z · 2', subs: [{ key: 'probe.stage.search', moves: ['z2Fast'] }, { key: 'probe.bar.measure', moves: ['z2Back', 'z2Slow', 'z2Off'] }] },
  ].filter(() => step);
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
  }))).concat(lower, [{
    id: 'zero',
    key: step ? 'probe2.height.bar.dz' : BAR_KEYS[found],
    folded: true,
    subs: [{ key: step ? 'probe2.height.bar.dz' : STAGE_KEYS[found], moves: [...(from === 'inside' ? homeOf(name) : []), 'zero'] }],
  }]);
};
