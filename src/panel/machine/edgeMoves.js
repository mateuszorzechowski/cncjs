import {
  ABOVE, AXES, BACK, BOSS_R, OUT, TOOL_R, setOn, topOf,
} from './bossMoves';

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
export const EDGE_SIDES = {
  front: { axis: 'y', along: 'x', sign: -1 },
  back: { axis: 'y', along: 'x', sign: 1 },
  left: { axis: 'x', along: 'y', sign: -1 },
  right: { axis: 'x', along: 'y', sign: 1 },
};
const FOUR = ['front', 'right', 'back', 'left'];
// Half the way between the points along the side, and how far in from an edge the ball starts.
const SPAN = 18;
const INSIDE = 12;
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
export const SLOT = [BOSS_R - 14, 14];

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

/*
 * The layouts by name: an edge's (`edge-front` …), the part's and the
 * pocket's at an angle. `sides` in the order touched; `from`; where the ball
 * starts; what a side's search is said by (`reach`: the clearance, the part's
 * half and the clearance, the pocket's rough size); the figures to set.
 */
const REACH = { group: 'probe.group.reach' };
const MEASURE = { id: 'measure', key: 'probe.group.measure', fields: ['fast', 'slow', 'retract'] };
const PROBE = { id: 'probe', key: 'probe.group.probe', fields: ['ballDiameter'] };
const edgeLayout = (edge) => ({
  sides: [edge],
  from: 'outside',
  start: setOn(EDGE_SIDES[edge].axis, [0, 0], EDGE_SIDES[edge].sign * (BOSS_R - INSIDE)),
  reach: 'clear',
  params: [{ id: 'reach', key: REACH.group, fields: ['spacing', 'clear', 'overTop', 'depth', 'maxZ'] }, MEASURE, PROBE],
});
const LAYOUTS = {
  ...Object.fromEntries(Object.keys(EDGE_SIDES).map((edge) => [`edge-${edge}`, edgeLayout(edge)])),
  'turned-outside': {
    sides: FOUR,
    from: 'outside',
    start: [4, -3],
    reach: 'part',
    params: [
      { id: 'part', key: 'probe.group.part', fields: ['bossSize'], names: { bossSize: 'probe.field.partSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing', 'clear', 'overTop', 'depth', 'maxZ'] }, MEASURE, PROBE,
    ],
  },
  'turned-inside': {
    sides: FOUR,
    from: 'inside',
    start: [3, 2],
    reach: 'holeSize',
    params: [
      { id: 'hole', key: 'probe.group.pocket', fields: ['holeSize'], names: { holeSize: 'probe.field.pocketSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing'] }, MEASURE, PROBE,
    ],
  },
  // An oval: touched as the rectangle at an angle, the ellipse fitted (the server's `strategies/oval`).
  'oval-outside': {
    sides: FOUR,
    from: 'outside',
    start: [4, -3],
    reach: 'part',
    outline: 'oval',
    // Closer than a square's: on an oval the four ways' points would meet in pairs at its shoulders.
    span: 9,
    params: [
      { id: 'part', key: 'probe.group.stud', fields: ['bossSize'], names: { bossSize: 'probe.field.ovalStudSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing', 'clear', 'overTop', 'depth', 'maxZ'] }, MEASURE, PROBE,
    ],
  },
  'oval-inside': {
    sides: FOUR,
    from: 'inside',
    start: [3, 2],
    reach: 'holeSize',
    outline: 'oval',
    span: 9,
    params: [
      { id: 'hole', key: 'probe.group.hole', fields: ['holeSize'], names: { holeSize: 'probe.field.ovalHoleSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing'] }, MEASURE, PROBE,
    ],
  },
  // A slot — a fasolka: as the oval, its outline two half circles and two straight sides (`strategies/slot`).
  'slot-outside': {
    sides: FOUR,
    from: 'outside',
    start: [4, -3],
    reach: 'part',
    outline: 'slot',
    span: 7,
    params: [
      { id: 'part', key: 'probe.group.slot', fields: ['bossSize'], names: { bossSize: 'probe.field.slotStudSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing', 'clear', 'overTop', 'depth', 'maxZ'] }, MEASURE, PROBE,
    ],
  },
  'slot-inside': {
    sides: FOUR,
    from: 'inside',
    start: [3, 2],
    reach: 'holeSize',
    outline: 'slot',
    span: 7,
    params: [
      { id: 'hole', key: 'probe.group.slot', fields: ['holeSize'], names: { holeSize: 'probe.field.slotHoleSize' } },
      { id: 'reach', key: REACH.group, fields: ['spacing'] }, MEASURE, PROBE,
    ],
  },
};
export const layoutOf = (name) => LAYOUTS[name];

// A point's steps, in order, from outside and from inside; from inside the way back to the middle at the end.
const STEPS = {
  outside: ['Along', 'Out', 'Down', 'Fast', 'Back', 'Slow', 'Off', 'Up'],
  inside: ['In', 'Along', 'Fast', 'Back', 'Slow', 'Off'],
};
// Away from the last side's wall first (X, the left's), then along it — as the server goes.
const HOME = ['retX', 'retY'];

/** A side's two points, by the names its touches go by: `y1m`, `y2m` for the front. */
const pointsOf = (side) => {
  const { axis, sign } = EDGE_SIDES[side];
  return [1, 2].map((point) => `${axis}${point}${sign > 0 ? 'p' : 'm'}`);
};

/** The points of the first side touched: from outside an edge's, the front's — the angle's two touches. */
export const anglePoints = (name) => pointsOf(LAYOUTS[name].sides[0]);

/**
 * The moves of layout `name`, the part drawn turned `tilt` degrees. Each
 * touch knows the point on the side it meets (`touchAt`) and which way the
 * ball goes to it (`dir`); `rim`, where the side is along its axis there;
 * an Along move, where its spacing's dimension stands (`spanAt`).
 */
export const buildSides = (name, tilt = EDGE_TILT) => {
  const {
    sides, from, start: S, outline, span = SPAN,
  } = LAYOUTS[name];
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
      const spot = setOn(along, at, S[j] + (point === 1 ? -1 : 1) * span);
      // The spacing's dimension outside the part — or inside the pocket — on the side away from this one.
      const spanAt = (axis === 'y' ? sign : -sign) * (BOSS_R + (inside ? -10 : 10));
      moves[`${side}Along`] = {
        ...common, ...leg(at, spot, 'centre', 'probe.edge.move.along', ['spacing']), axis: along, spanAt, span: [S[j] - span, S[j] + span], code: 'probe.edge.alongCode',
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
      const off = setOn(axis, wall, wall[i] - dir * BACK);
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
    const x = setOn('x', at, S[0]);
    moves.retX = { ...leg(at, x, 'centre', 'probe.edge.move.home', []), axis: 'x', way: 'X', code: 'probe.edge.homeCode' };
    moves.retY = { ...leg(x, S, 'centre', 'probe.edge.move.home', []), axis: 'y', way: 'Y', code: 'probe.edge.homeCode' };
    order.push(...HOME);
    at = S;
  }
  moves.zero = {
    kind: 'zero', from: at, frames: [[0, at, level], [1, at, level]], titleKey: name.startsWith('edge') ? 'probe.size.move.edge' : ({ oval: 'probe.size.move.oval', slot: 'probe.size.move.slot' }[outline] ?? 'probe.size.move.size'), uses: ['ballDiameter'], end: 0.35,
  };
  order.push('zero');
  return { moves, order };
};

/** The bar after the top: each point — one side, so a search and a measuring (map §8) — then the result. */
export const sideGroups = (name) => {
  const { sides, from } = LAYOUTS[name];
  const steps = STEPS[from];
  const searching = from === 'inside' ? 3 : 4;
  const edge = name.startsWith('edge');
  return sides.flatMap((side) => pointsOf(side).map((point, k) => ({
    id: point,
    name: `${EDGE_SIDES[side].axis.toUpperCase()}${EDGE_SIDES[side].sign > 0 ? '+' : '−'} · ${k + 1}`,
    subs: [
      { key: 'probe.stage.search', moves: steps.slice(0, searching).map((step) => `${point}${step}`) },
      { key: 'probe.bar.measure', moves: steps.slice(searching).map((step) => `${point}${step}`) },
    ],
  }))).concat([{
    id: 'zero',
    key: edge ? 'probe.bar.angle' : 'probe.bar.size',
    folded: true,
    subs: [{ key: edge ? 'probe.stage.angle' : 'probe.stage.size', moves: [...(from === 'inside' ? HOME : []), 'zero'] }],
  }]);
};
