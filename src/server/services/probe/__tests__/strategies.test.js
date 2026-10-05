import { createProbeRun } from '../../../controllers/Grbl/probe-run';
import { probeParams } from '..';
import { STRATEGIES, describeStrategies } from '../strategies';
import { CORNERS } from '../strategies/corner';
import { EDGES } from '../strategies/paper';
import { fitEllipse } from '../strategies/oval';
import { fitCircle } from '../strategies/size';

/*
 * Every method, run against a bench: plates as boxes in machine coordinates,
 * a tool with a radius, and a Grbl that answers the lines the runner writes
 * the way COM3 did on 2026-09-29. What is checked is where the zero lands —
 * the corner of the work — not the lines, so a method that probes some other
 * way and gets it right still passes.
 */

const AXES = ['x', 'y', 'z'];
const WCO = { x: -120, y: -80, z: -40 };

const wordsOf = (line) => Object.fromEntries(
  [...line.matchAll(/([XYZF])(-?[\d.]+)/g)].map(([, letter, value]) => [letter.toLowerCase(), Number(value)]),
);

/** Where a move from `from` to `to` along one axis first meets a box, or null. */
const contact = (boxes, radius, from, to) => {
  const axis = AXES.find((a) => to[a] !== from[a]);
  const dir = Math.sign(to[axis] - from[axis]);
  let best = null;
  for (const box of boxes) {
    const grown = { ...box, x: [box.x[0] - radius, box.x[1] + radius], y: [box.y[0] - radius, box.y[1] + radius] };
    const inside = AXES.filter((a) => a !== axis).every((a) => from[a] > grown[a][0] && from[a] < grown[a][1]);
    const face = dir > 0 ? grown[axis][0] : grown[axis][1];
    const crosses = dir > 0 ? (from[axis] <= face && to[axis] >= face) : (from[axis] >= face && to[axis] <= face);
    if (inside && crosses && (best === null || Math.abs(face - from[axis]) < Math.abs(best - from[axis]))) {
      best = face;
    }
  }
  return best === null ? null : { ...from, [axis]: best };
};

/*
 * Where a move along one axis first meets a round wall, or null: `{ x, y, r,
 * z: [bottom, top], inside }` — a hole's wall from inside, a stud from
 * outside (its top too, from above). The ball's centre stops `radius` off it.
 */
const roundContact = (rounds, radius, from, to) => {
  const axis = AXES.find((a) => to[a] !== from[a]);
  let best = null;
  const nearer = (at) => {
    if (best === null || Math.abs(at - from[axis]) < Math.abs(best - from[axis])) {
      best = at;
    }
  };
  for (const round of rounds) {
    if (axis === 'z') {
      const over = Math.hypot(from.x - round.x, from.y - round.y) < round.r;
      if (!round.inside && over && from.z >= round.z[1] + radius && to.z <= round.z[1] + radius) {
        nearer(round.z[1] + radius);
      }
      continue;
    }
    if (from.z <= round.z[0] || from.z >= round.z[1]) {
      continue;
    }
    const other = axis === 'x' ? 'y' : 'x';
    const reach = round.inside ? round.r - radius : round.r + radius;
    const off = from[other] - round[other];
    if (Math.abs(off) >= reach) {
      continue;
    }
    const half = Math.sqrt(reach * reach - off * off);
    const dir = Math.sign(to[axis] - from[axis]);
    // Inside, the wall ahead; outside, the near side of the stud.
    const at = round.inside ? round[axis] + dir * half : round[axis] - dir * half;
    const ahead = dir > 0 ? at >= from[axis] - 1e-9 && at <= to[axis] : at <= from[axis] + 1e-9 && at >= to[axis];
    if (ahead) {
      nearer(at);
    }
  }
  return best === null ? null : { ...from, [axis]: best };
};

/*
 * Where a move first meets a part whose front edge runs at an angle — `{ x,
 * y, angle (degrees), z: [bottom, top] }`, the part on the +Y side of the
 * line through (x, y) — or null: its edge moving +Y, its top from above.
 * The ball's centre stops `radius` off the edge, square to it; on the top,
 * where a box's does.
 */
const slantContact = (slants, radius, from, to) => {
  const axis = AXES.find((a) => to[a] !== from[a]);
  for (const slant of slants) {
    const t = Math.tan(slant.angle * Math.PI / 180);
    const edgeAt = (x) => slant.y + t * (x - slant.x);
    if (axis === 'z') {
      // As a box's top: met where the tool's end is, at the top itself.
      if (from.y > edgeAt(from.x) && from.z >= slant.z[1] && to.z <= slant.z[1]) {
        return { ...from, z: slant.z[1] };
      }
    } else if (axis === 'y' && to.y > from.y && from.z > slant.z[0] && from.z < slant.z[1]) {
      const stop = edgeAt(from.x) - radius / Math.cos(Math.atan(t));
      if (stop >= from.y - 1e-9 && stop <= to.y) {
        return { ...from, y: stop };
      }
    }
  }
  return null;
};

/*
 * Where a move first meets a turned rectangle — `{ x, y, w, h, angle
 * (degrees), z: [bottom, top], inside }`: a part standing (its top too, from
 * above), or a pocket cut (`inside`, the ball in it) — or null. The ball's
 * centre stops `radius` off a side, square to it; the corners are not met.
 */
const turnedContact = (turned, radius, from, to) => {
  const axis = AXES.find((a) => to[a] !== from[a]);
  let best = null;
  for (const rect of turned) {
    const a = (rect.angle * Math.PI) / 180;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    // Into the rectangle's own frame and back.
    const local = (p) => [(p.x - rect.x) * c + (p.y - rect.y) * s, -(p.x - rect.x) * s + (p.y - rect.y) * c];
    const within = (p) => Math.abs(local(p)[0]) < rect.w / 2 && Math.abs(local(p)[1]) < rect.h / 2;
    if (axis === 'z') {
      if (!rect.inside && within(from) && from.z >= rect.z[1] && to.z <= rect.z[1]) {
        return { ...from, z: rect.z[1] };
      }
      continue;
    }
    if (from.z <= rect.z[0] || from.z >= rect.z[1]) {
      continue;
    }
    // Each side as the line the ball's centre may reach: out by the radius from a part, in from a pocket's wall.
    const grow = rect.inside ? -radius : radius;
    const sides = [[0, rect.w / 2 + grow, rect.h / 2], [0, -(rect.w / 2 + grow), rect.h / 2], [1, rect.h / 2 + grow, rect.w / 2], [1, -(rect.h / 2 + grow), rect.w / 2]];
    for (const [k, at, half] of sides) {
      // Along the move, local coordinate k reaches `at` where?
      const [p0, p1] = [local(from), local(to)];
      if (p1[k] === p0[k]) {
        continue;
      }
      const t = (at - p0[k]) / (p1[k] - p0[k]);
      const along = p0[1 - k] + t * (p1[1 - k] - p0[1 - k]);
      if (t >= -1e-9 && t <= 1 && Math.abs(along) <= half && (best === null || t < best.t)) {
        best = { t, hit: { ...from, [axis]: from[axis] + t * (to[axis] - from[axis]) } };
      }
    }
  }
  return best && best.hit;
};

/*
 * Where a move first meets an ellipse — `{ x, y, a, b (halves), angle
 * (degrees), z: [bottom, top], inside }`: a stud standing (its top too), or
 * an oval hole (`inside`, the ball in it) — or null. Found as the machine
 * would: the first place along the move where the ball's centre is its
 * radius from the wall, narrowed by halving.
 */
const ovalContact = (ovals, radius, from, to) => {
  const axis = AXES.find((a) => to[a] !== from[a]);
  for (const oval of ovals) {
    const g = (oval.angle * Math.PI) / 180;
    const local = (p) => [(p.x - oval.x) * Math.cos(g) + (p.y - oval.y) * Math.sin(g), -(p.x - oval.x) * Math.sin(g) + (p.y - oval.y) * Math.cos(g)];
    const within = (p) => (local(p)[0] / oval.a) ** 2 + (local(p)[1] / oval.b) ** 2 < 1;
    if (axis === 'z') {
      if (!oval.inside && within(from) && from.z >= oval.z[1] && to.z <= oval.z[1]) {
        return { ...from, z: oval.z[1] };
      }
      continue;
    }
    if (from.z <= oval.z[0] || from.z >= oval.z[1]) {
      continue;
    }
    // How far the ball's centre is from the wall: sampled round it, then narrowed.
    const gap = (p) => {
      const [u, v] = local(p);
      const d = (t) => Math.hypot(oval.a * Math.cos(t) - u, oval.b * Math.sin(t) - v);
      let best = 0;
      for (let k = 1; k < 720; k++) {
        if (d((k * Math.PI) / 360) < d(best)) {
          best = (k * Math.PI) / 360;
        }
      }
      let [lo, hi] = [best - Math.PI / 360, best + Math.PI / 360];
      for (let k = 0; k < 80; k++) {
        const [m1, m2] = [lo + (hi - lo) / 3, hi - (hi - lo) / 3];
        if (d(m1) < d(m2)) {
          hi = m2;
        } else {
          lo = m1;
        }
      }
      return d((lo + hi) / 2);
    };
    // Clear of the wall while the ball is on its own side of it, by more than its radius.
    const clear = (t) => {
      const p = { ...from, [axis]: from[axis] + t * (to[axis] - from[axis]) };
      return within(p) === Boolean(oval.inside) && gap(p) > radius;
    };
    const steps = 400;
    let k = 1;
    while (k <= steps && clear(k / steps)) {
      k += 1;
    }
    if (k > steps) {
      continue;
    }
    let [lo, hi] = [(k - 1) / steps, k / steps];
    for (let n = 0; n < 50; n++) {
      const mid = (lo + hi) / 2;
      if (clear(mid)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return { ...from, [axis]: from[axis] + lo * (to[axis] - from[axis]) };
  }
  return null;
};

/*
 * Where a move first meets a slot — `{ x, y, half (the straight sides' half
 * length), r, angle (degrees), z: [bottom, top], inside }`: standing (its top
 * too), or cut (`inside`, the ball in it) — or null: the first place along
 * the move where the ball's centre is its radius from the wall, narrowed by
 * halving.
 */
const slotContact = (slots, radius, from, to) => {
  const axis = AXES.find((a) => to[a] !== from[a]);
  for (const slot of slots) {
    const g = (slot.angle * Math.PI) / 180;
    // How far from the wall, negative inside.
    const gap = (p) => {
      const u = (p.x - slot.x) * Math.cos(g) + (p.y - slot.y) * Math.sin(g);
      const v = -(p.x - slot.x) * Math.sin(g) + (p.y - slot.y) * Math.cos(g);
      const over = Math.abs(u) - slot.half;
      return over <= 0 ? Math.abs(v) - slot.r : Math.hypot(over, v) - slot.r;
    };
    if (axis === 'z') {
      if (!slot.inside && gap(from) < 0 && from.z >= slot.z[1] && to.z <= slot.z[1]) {
        return { ...from, z: slot.z[1] };
      }
      continue;
    }
    if (from.z <= slot.z[0] || from.z >= slot.z[1]) {
      continue;
    }
    const clear = (t) => {
      const p = { ...from, [axis]: from[axis] + t * (to[axis] - from[axis]) };
      return slot.inside ? gap(p) < -radius : gap(p) > radius;
    };
    const steps = 400;
    let k = 1;
    while (k <= steps && clear(k / steps)) {
      k += 1;
    }
    if (k > steps) {
      continue;
    }
    let [lo, hi] = [(k - 1) / steps, k / steps];
    for (let n = 0; n < 60; n++) {
      const mid = (lo + hi) / 2;
      if (clear(mid)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return { ...from, [axis]: from[axis] + lo * (to[axis] - from[axis]) };
  }
  return null;
};

/** Run one method on the bench to the end; the outcome and every line sent. */
// `radius`: what touches — the tool, or a 3D probe's ball.
const measure = ({
  method, options = {}, params, boxes = [], rounds = [], slants = [], turned = [], ovals = [], slots = [], start, radius = params.toolDiameter / 2,
}) => {
  const strategy = STRATEGIES[method];
  const queue = [];
  const sent = [];
  let pos = { ...start };
  let outcome = null;
  const run = createProbeRun({
    steps: strategy.steps(params, options, { start, wco: WCO }),
    start,
    wco: WCO,
    restore: 'G90 G21',
    write: (line) => queue.push(line),
    done: (result) => {
      outcome = result;
    },
  });

  run.start();
  while (queue.length) {
    const line = queue.shift();
    sent.push(line);
    const words = wordsOf(line);
    const probing = line.match(/G38\.(\d)/);
    if (probing) {
      const target = { ...pos };
      for (const axis of AXES.filter((a) => words[a] !== undefined)) {
        target[axis] = words[axis] + WCO[axis];
      }
      const hits = [contact(boxes, radius, pos, target), roundContact(rounds, radius, pos, target), slantContact(slants, radius, pos, target), turnedContact(turned, radius, pos, target), ovalContact(ovals, radius, pos, target), slotContact(slots, radius, pos, target)].filter(Boolean);
      const way = (one) => AXES.reduce((sum, a) => sum + Math.abs(one[a] - pos[a]), 0);
      const hit = hits.sort((a, b) => way(a) - way(b))[0] ?? null;
      if (hit) {
        pos = hit;
        run.prb({ ...pos, result: 1 });
      } else {
        pos = target;
        if (probing[1] === '2') {
          run.alarm('ALARM:5');
        }
        run.prb({ x: 0, y: 0, z: 0, result: 0 });
      }
    } else if (line.includes('G53')) {
      pos = { ...pos, ...words };
    }
    run.ok();
  }
  const zero = outcome.seen && strategy.zero ? strategy.zero(params, options, outcome.seen, start) : null;
  return { outcome, zero, sent, pos };
};

const close = (actual, expected) => {
  for (const axis of Object.keys(expected)) {
    expect(actual[axis]).toBeCloseTo(expected[axis], 6);
  }
};

describe('the Z plate', () => {
  const params = { ...probeParams(), plateThickness: 12.5 };
  // The top of the work at machine Z -60; the plate on it.
  const boxes = [{ x: [-200, 200], y: [-200, 200], z: [-60, -47.5] }];

  test('puts Z0 on the work, under the plate', () => {
    const { outcome, zero } = measure({ method: 'z', params, boxes, start: { x: 0, y: 0, z: -40 } });

    expect(outcome.failure).toBeUndefined();
    close(zero, { z: -60 });
  });

  test('lifts the tool clear of the plate and leaves the modes as they were', () => {
    const { sent, pos } = measure({ method: 'z', params, boxes, start: { x: 0, y: 0, z: -40 } });

    expect(pos.z).toBeCloseTo(-47.5 + params.lift, 6);
    expect(sent[sent.length - 1]).toBe('G90 G21');
  });

  test('Z0 where it was measured, or the stock thickness away: the plate on the work, Z0 on the table, and back', () => {
    const at = (options, plateOn) => {
      const under = [{ x: [-200, 200], y: [-200, 200], z: [plateOn - 12.5, plateOn] }];
      return measure({ method: 'z', options, params: { ...params, stockThickness: 18 }, boxes: under, start: { x: 0, y: 0, z: plateOn + 5 } }).zero;
    };
    // On the work, its top at -60.
    close(at({ on: 'work', z0: 'top' }, -47.5), { z: -60 });
    close(at({ on: 'work', z0: 'table' }, -47.5), { z: -78 });
    // On the table, at -78.
    close(at({ on: 'table', z0: 'table' }, -65.5), { z: -78 });
    close(at({ on: 'table', z0: 'top' }, -65.5), { z: -60 });
    expect(STRATEGIES.z.check({ on: 'floor' })).toBe('bad-surface');
    expect(STRATEGIES.z.check({})).toBeNull();
  });

  test('a plate further down than the limit is a failure, and the zero is not touched', () => {
    const { outcome, zero, pos } = measure({ method: 'z', params: { ...params, maxZ: 5 }, boxes, start: { x: 0, y: 0, z: -40 } });

    expect(outcome).toEqual({ failure: 'ALARM:5', phase: 'z-fast' });
    expect(zero).toBeNull();
    // It went the limit and no further.
    expect(pos.z).toBeCloseTo(-45, 6);
  });
});

describe('the corner plate', () => {
  const params = { ...probeParams(), cornerThickness: 8, wallX: 6, wallY: 4, toolDiameter: 3.175 };

  /** The L plate on corner `name` of a work whose corner is at (cx, cy), top at `top`. */
  const plateOn = (name, cx, cy, top) => {
    const { x: sx, y: sy } = CORNERS[name];
    const span = (c, s, wall, length) => [Math.min(c - s * wall, c + s * length), Math.max(c - s * wall, c + s * length)];
    const slabX = span(cx, sx, params.wallX, 40);
    const slabY = span(cy, sy, params.wallY, 40);
    return [
      { x: slabX, y: slabY, z: [top, top + params.cornerThickness] },
      { x: span(cx, sx, params.wallX, 0), y: slabY, z: [top - 20, top] },
      { x: slabX, y: span(cy, sy, params.wallY, 0), z: [top - 20, top] },
    ];
  };

  test.each(Object.keys(CORNERS))('finds the corner of the work, %s', (name) => {
    const { x: sx, y: sy } = CORNERS[name];
    const [cx, cy, top] = [-150, -90, -55];
    // Over the plate, 8 mm in from each edge of the work.
    const start = { x: cx + sx * 8, y: cy + sy * 8, z: top + params.cornerThickness + 5 };

    const { outcome, zero, pos } = measure({ method: 'corner', options: { corner: name }, params, boxes: plateOn(name, cx, cy, top), start });

    expect(outcome.failure).toBeUndefined();
    close(zero, { x: cx, y: cy, z: top });
    // Lifted over the plate, then over the corner found.
    close(pos, { x: cx, y: cy, z: top + params.cornerThickness + params.lift });
  });

  test('coming down onto the plate instead of beside it stops, and says so', () => {
    const [cx, cy, top] = [-150, -90, -55];
    const start = { x: cx + 8, y: cy + 8, z: top + params.cornerThickness + 5 };

    const { outcome } = measure({
      method: 'corner', options: { corner: 'front-left' }, params: { ...params, travel: 5 }, boxes: plateOn('front-left', cx, cy, top), start,
    });

    expect(outcome).toEqual({ failure: 'touched', phase: 'x-down' });
  });

  test('a corner that is not one is refused before anything moves', () => {
    expect(STRATEGIES.corner.check({ corner: 'middle' })).toBe('bad-corner');
    expect(STRATEGIES.corner.check({ corner: 'back-right' })).toBeNull();
  });
});

describe('Pomiar: the middle of a pocket', () => {
  const params = { ...probeParams(), ballDiameter: 4, holeSize: 30 };
  const radius = params.ballDiameter / 2;
  const options = { shape: 'rect-inside' };
  const middleOf = (own, outcome) => STRATEGIES.measure.size(own, options, outcome.seen).centre;

  /** A square hole `size` across centred on (hx, hy), its walls from Z -80 to -50. */
  const holeAt = (hx, hy, size) => {
    const h = size / 2;
    const z = [-80, -50];
    return [
      { x: [hx - 200, hx - h], y: [hy - 200, hy + 200], z },
      { x: [hx + h, hx + 200], y: [hy - 200, hy + 200], z },
      { x: [hx - 200, hx + 200], y: [hy - 200, hy - h], z },
      { x: [hx - 200, hx + 200], y: [hy + h, hy + 200], z },
    ];
  };

  test('found from a start off it, the tool there at the end', () => {
    const [hx, hy] = [-120, -70];
    const { outcome, pos } = measure({
      method: 'measure', options, params, radius, boxes: holeAt(hx, hy, 24), start: { x: hx + 5, y: hy - 3, z: -60 },
    });

    expect(outcome.failure).toBeUndefined();
    close(middleOf(params, outcome), { x: hx, y: hy });
    close(pos, { x: hx, y: hy, z: -60 });
  });

  test('one pass, if asked: half the touches, the same middle', () => {
    const [hx, hy] = [-120, -70];
    const once = { ...params, holePasses: 1 };
    const { outcome, sent } = measure({
      method: 'measure', options, params: once, radius, boxes: holeAt(hx, hy, 24), start: { x: hx + 5, y: hy - 3, z: -60 },
    });
    const twice = measure({
      method: 'measure', options, params, radius, boxes: holeAt(hx, hy, 24), start: { x: hx + 5, y: hy - 3, z: -60 },
    });

    close(middleOf(once, outcome), { x: hx, y: hy });
    expect(sent.filter((line) => line.includes('G38')).length * 2).toBe(twice.sent.filter((line) => line.includes('G38')).length);
  });

  test('a hole wider than its rough size is a failure', () => {
    const { outcome } = measure({
      method: 'measure', options, params: { ...params, holeSize: 5 }, radius, boxes: holeAt(-120, -70, 40), start: { x: -120, y: -70, z: -60 },
    });

    expect(outcome).toEqual({ failure: 'ALARM:5', phase: 'x1a-fast' });
  });
});

describe('Pomiar: the middle of a part, from outside', () => {
  const params = { ...probeParams(), ballDiameter: 4, bossSize: 30, clear: 10, depth: 5 };
  const radius = params.ballDiameter / 2;
  const [hx, hy] = [-120, -70];
  const options = { shape: 'rect-outside' };

  /** A square part `size` across centred on (hx, hy), its top at Z -50. */
  const partAt = (size) => [{ x: [hx - size / 2, hx + size / 2], y: [hy - size / 2, hy + size / 2], z: [-80, -50] }];
  const start = { x: hx + 3, y: hy - 2, z: -45 };

  test('touches the top, then each side from outside: the middle found, the ball over it', () => {
    const { outcome, pos } = measure({
      method: 'measure', options, params, radius, boxes: partAt(24), start,
    });

    expect(outcome.failure).toBeUndefined();
    close(STRATEGIES.measure.size(params, options, outcome.seen).centre, { x: hx, y: hy });
    close(pos, { x: hx, y: hy, z: -50 + params.overTop });
  });

  test('goes down beside a side by the depth under the top it found, not under where it started', () => {
    const { sent } = measure({
      method: 'measure', options, params, radius, boxes: partAt(24), start: { ...start, z: -38 },
    });
    // The first way down beside a side, in work coordinates: from the top plus the retract to the depth under it.
    const down = sent.find((line) => line.includes('G38.3'));
    expect(wordsOf(down).z + WCO.z).toBeCloseTo(-50 - params.depth, 6);
  });

  test('goes sideways only `overTop` over the top: over the vice jaws and the clamps, not a few millimetres', () => {
    const own = { ...params, overTop: 12 };
    const { sent } = measure({
      method: 'measure', options, params: own, radius, boxes: partAt(24), start,
    });
    // Every way up is to 12 over the top — but the top's own back-off before its slow touch, the retract; every
    // way down beside a side from there, to under it.
    const ups = sent.filter((line) => line.includes('G53 G0') && wordsOf(line).z !== undefined).map((line) => wordsOf(line).z);
    expect(ups[0]).toBe(-50 + own.retract);
    expect(ups.slice(1).length).toBeGreaterThan(0);
    expect(ups.slice(1).every((z) => z === -50 + 12)).toBe(true);
    const downs = sent.filter((line) => line.includes('G38.3'));
    expect(downs.every((line) => wordsOf(line).z + WCO.z === -50 - own.depth)).toBe(true);
  });

  test('a part wider than its rough size lands the ball on its top: a failure', () => {
    const { outcome } = measure({
      method: 'measure', options, params: { ...params, bossSize: 10, clear: 2 }, radius, boxes: partAt(40), start,
    });

    expect(outcome).toMatchObject({ failure: 'touched', phase: 'x1a-down' });
  });
});

describe('Pomiar: a size, not a zero', () => {
  const params = { ...probeParams(), ballDiameter: 4, holeSize: 30, bossSize: 40, clear: 10, depth: 5 };
  const radius = params.ballDiameter / 2;
  const [hx, hy] = [-120, -70];
  const z = [-80, -50];
  const { measure: pomiar } = STRATEGIES;
  const sizeOf = (shape, outcome, own = params) => pomiar.size(own, { shape }, outcome.seen);
  const once = { ...params, holePasses: 1 };

  /** A rectangular hole `w` × `d` around (hx, hy). */
  const holeOf = (w, d) => [
    { x: [hx - 200, hx - w / 2], y: [hy - 200, hy + 200], z },
    { x: [hx + w / 2, hx + 200], y: [hy - 200, hy + 200], z },
    { x: [hx - 200, hx + 200], y: [hy - 200, hy - d / 2], z },
    { x: [hx - 200, hx + 200], y: [hy + d / 2, hy + 200], z },
  ];
  /** A rectangular part `w` × `d` around (hx, hy), its top at Z -50. */
  const partOf = (w, d) => [{ x: [hx - w / 2, hx + w / 2], y: [hy - d / 2, hy + d / 2], z }];
  const roundHole = [{ x: hx, y: hy, r: 12, z, inside: true }];
  const touches = (sent) => sent.filter((line) => line.includes('G38.2')).length;

  test('is no zero', () => {
    expect(pomiar.zero).toBeUndefined();
  });

  test('a round hole: the diameter fitted through every touch, true from a start off the middle', () => {
    const { outcome, pos } = measure({
      method: 'measure', options: { shape: 'circle-inside' }, params: once, radius, rounds: roundHole, start: { x: hx + 5, y: hy - 3, z: -60 },
    });
    const found = sizeOf('circle-inside', outcome, once);

    expect(outcome.failure).toBeUndefined();
    expect(found.kind).toBe('circle');
    // One pass from off the middle: the chords miss the centre, the fit does not.
    close(found.size, { d: 24 });
    close(found.centre, { x: hx, y: hy });
    expect(found.off).toBeCloseTo(0, 6);
    close(pos, { x: hx, y: hy });
  });

  test('a stud from outside: the ball taken off', () => {
    const { outcome } = measure({
      method: 'measure', options: { shape: 'circle-outside' }, params, radius, rounds: [{ x: hx, y: hy, r: 15, z }], start: { x: hx + 3, y: hy - 2, z: -45 },
    });

    expect(outcome.failure).toBeUndefined();
    close(sizeOf('circle-outside', outcome).size, { d: 30 });
  });

  test('a square hole is no circle: the touches stand off round', () => {
    const { outcome } = measure({
      method: 'measure', options: { shape: 'circle-inside' }, params: once, radius, boxes: holeOf(24, 18), start: { x: hx + 5, y: hy - 3, z: -60 },
    });

    expect(sizeOf('circle-inside', outcome, once).off).toBeGreaterThan(1);
  });

  test('a pocket each way, the ball added back, the tool at its middle', () => {
    const { outcome, pos } = measure({
      method: 'measure', options: { shape: 'rect-inside' }, params, radius, boxes: holeOf(24, 18), start: { x: hx + 5, y: hy - 3, z: -60 },
    });
    const found = sizeOf('rect-inside', outcome);

    close(found.size, { x: 24, y: 18 });
    close(found.centre, { x: hx, y: hy });
    expect(found.spread).toBeNull();
    expect(found.each).toHaveLength(1);
    expect(found.off).toBeUndefined();
    close(pos, { x: hx, y: hy, z: -60 });
  });

  test('a part from outside each way, the ball taken off, after touching its top', () => {
    const { outcome, sent } = measure({
      method: 'measure', options: { shape: 'rect-outside' }, params, radius, boxes: partOf(30, 20), start: { x: hx + 3, y: hy - 2, z: -45 },
    });

    expect(outcome.failure).toBeUndefined();
    close(sizeOf('rect-outside', outcome).size, { x: 30, y: 20 });
    expect(wordsOf(sent.find((line) => line.includes('G38.2'))).z).toBeDefined();
  });

  test('repeated: the centre found first, then every pass counted — the mean and the spread', () => {
    const three = { ...params, repeats: 3 };
    const { outcome, sent } = measure({
      method: 'measure', options: { shape: 'rect-inside' }, params: three, radius, boxes: holeOf(24, 18), start: { x: hx + 5, y: hy - 3, z: -60 },
    });
    const found = sizeOf('rect-inside', outcome, three);

    // One pass to find the centre (holePasses 2), three counted: four touches per axis each, two touches a pass.
    expect(touches(sent)).toBe(4 * 2 * 2 * 2);
    expect(found.each).toHaveLength(3);
    close(found.size, { x: 24, y: 18 });
    close(found.spread, { x: 0, y: 0 });
  });

  test('a circle repeated: a diameter per counted pass', () => {
    const two = { ...params, holePasses: 1, repeats: 2 };
    const { outcome, sent } = measure({
      method: 'measure', options: { shape: 'circle-inside' }, params: two, radius, rounds: roundHole, start: { x: hx + 5, y: hy - 3, z: -60 },
    });
    const found = sizeOf('circle-inside', outcome, two);

    expect(touches(sent)).toBe(2 * 2 * 2 * 2);
    expect(found.each).toHaveLength(2);
    close(found.spread, { d: 0 });
  });

  test('one width: a groove from inside along one axis touches only that axis', () => {
    const { outcome, sent, pos } = measure({
      method: 'measure', options: { shape: 'groove-y' }, params, radius, boxes: holeOf(24, 12), start: { x: hx + 5, y: hy - 3, z: -60 },
    });
    const found = sizeOf('groove-y', outcome);

    expect(sent.filter((line) => line.includes('G38') && wordsOf(line).x !== undefined)).toHaveLength(0);
    expect(found.size).toEqual({ y: expect.any(Number) });
    close(found.size, { y: 12 });
    expect(Object.keys(found.centre)).toEqual(['y']);
    close(pos, { x: hx + 5, y: hy, z: -60 });
  });

  test('one width: a bar from outside along X', () => {
    const { outcome } = measure({
      method: 'measure', options: { shape: 'bar-x' }, params, radius, boxes: partOf(16, 100), start: { x: hx + 3, y: hy - 2, z: -45 },
    });

    expect(outcome.failure).toBeUndefined();
    close(sizeOf('bar-x', outcome).size, { x: 16 });
  });

  test.each([
    [{ shape: 'groove-z' }, 'bad-shape'],
    [{}, 'bad-shape'],
  ])('a shape that is not one is refused: %j', (options, code) => {
    expect(pomiar.check(options)).toBe(code);
  });

  test('points a side further apart than the rough size are refused before anything moves', () => {
    expect(pomiar.check({ shape: 'rect-inside-turned' }, { ...params, holeSize: 30, spacing: 30 })).toBe('spacing-too-wide');
    expect(pomiar.check({ shape: 'oval-outside' }, { ...params, bossSize: 20, spacing: 25 })).toBe('spacing-too-wide');
    expect(pomiar.check({ shape: 'rect-inside-turned' }, { ...params, holeSize: 30, spacing: 12 })).toBeNull();
    // Shapes touched once a side have no spacing to check.
    expect(pomiar.check({ shape: 'rect-inside' }, { ...params, holeSize: 5, spacing: 30 })).toBeNull();
  });
});

describe('Pomiar: an edge and its angle', () => {
  const params = {
    ...probeParams(), ballDiameter: 4, clear: 10, depth: 5, spacing: 30,
  };
  const radius = params.ballDiameter / 2;
  const options = { shape: 'edge-front' };
  const z = [-80, -50];

  test.each([0, 1.5, -3])('the front edge at %s°: its angle and where it crosses the start', (angle) => {
    const slants = [{ x: -100, y: -60, angle, z }];
    const start = { x: -100, y: -55, z: -45 };
    const { outcome, pos } = measure({
      method: 'measure', options, params, radius, slants, start,
    });
    const found = STRATEGIES.measure.size(params, options, outcome.seen);

    expect(outcome.failure).toBeUndefined();
    expect(found.kind).toBe('edge');
    expect(found.size.a).toBeCloseTo(angle, 6);
    close(found.centre, { y: -60 });
    expect(Object.keys(found.centre)).toEqual(['y']);
    // Over the second point at the end, just above the top.
    close(pos, { x: start.x + params.spacing / 2, z: -50 + params.overTop });
  });

  test('two touches, spacing apart along the edge, each from out past it', () => {
    const { sent } = measure({
      method: 'measure', options, params, radius, slants: [{ x: -100, y: -60, angle: 0, z }], start: { x: -100, y: -55, z: -45 },
    });
    const sideways = sent.filter((line) => line.includes('G38.2') && wordsOf(line).y !== undefined);

    // Fast and slow at each point.
    expect(sideways).toHaveLength(4);
    // Every way one axis: along the edge to the point, then out past it.
    const ways = sent.filter((line) => line.includes('G53 G0')).map(wordsOf);
    expect(ways.every((way) => Object.keys(way).length === 1)).toBe(true);
    expect(ways.filter((way) => way.x !== undefined).map((way) => way.x)).toEqual([-115, -85]);
    expect(ways.find((way) => way.y !== undefined).y).toBeCloseTo(-65, 6);
  });
});

describe('Pomiar: a rectangle at an angle', () => {
  const params = {
    ...probeParams(), ballDiameter: 4, clear: 10, depth: 5, spacing: 20, bossSize: 40, holeSize: 40,
  };
  const radius = params.ballDiameter / 2;
  const z = [-80, -50];
  const [hx, hy] = [-120, -70];

  test.each([0, 4, -7])('a part turned %s°: its sides square to them, the angle, the middle; the corners square', (angle) => {
    const options = { shape: 'rect-outside-turned' };
    const turned = [{ x: hx, y: hy, w: 36, h: 28, angle, z }];
    const { outcome, sent } = measure({
      method: 'measure', options, params, radius, turned, start: { x: hx + 2, y: hy - 1, z: -45 },
    });
    const found = STRATEGIES.measure.size(params, options, outcome.seen);

    expect(outcome.failure).toBeUndefined();
    close(found.size, { x: 36, y: 28 });
    close(found.turn, { a: angle, square: 0 });
    expect(found.centre.x).toBeCloseTo(hx, 6);
    expect(found.centre.y).toBeCloseTo(hy, 6);
    // Eight touches, fast and slow, after the top's two; every way along one axis.
    expect(sent.filter((line) => line.includes('G38.2')).length).toBe(2 + 8 * 2);
    expect(sent.filter((line) => line.includes('G53 G0')).map(wordsOf).every((way) => Object.keys(way).length === 1)).toBe(true);
  });

  test.each([0, 5])('a pocket turned %s°, from its middle — the points well inside its shorter side', (angle) => {
    const options = { shape: 'rect-inside-turned' };
    const own = { ...params, spacing: 12 };
    const turned = [{ x: hx, y: hy, w: 36, h: 28, angle, z, inside: true }];
    const start = { x: hx + 1, y: hy + 2, z: -60 };
    const { outcome, pos } = measure({
      method: 'measure', options, params: own, radius, turned, start,
    });
    const found = STRATEGIES.measure.size(own, options, outcome.seen);

    expect(outcome.failure).toBeUndefined();
    close(found.size, { x: 36, y: 28 });
    close(found.turn, { a: angle, square: 0 });
    expect(found.centre.x).toBeCloseTo(hx, 6);
    expect(found.centre.y).toBeCloseTo(hy, 6);
    close(pos, start);
  });

  test('points too far apart for the pocket meet the next wall: the corners come out far off square', () => {
    const options = { shape: 'rect-inside-turned' };
    const turned = [{ x: hx, y: hy, w: 36, h: 28, angle: 5, z, inside: true }];
    const { outcome } = measure({
      method: 'measure', options, params, radius, turned, start: { x: hx + 1, y: hy + 2, z: -60 },
    });

    expect(Math.abs(STRATEGIES.measure.size(params, options, outcome.seen).turn.square)).toBeGreaterThan(1);
  });
});

describe('Pomiar: an oval', () => {
  const params = {
    ...probeParams(), ballDiameter: 4, clear: 10, depth: 5, spacing: 14, bossSize: 50, holeSize: 50,
  };
  const radius = params.ballDiameter / 2;
  const z = [-80, -50];
  const [hx, hy] = [-120, -70];

  test.each([[0, 'inside'], [25, 'inside'], [-60, 'outside'], [0, 'outside']])('turned %s°, %s: both axes, the long one\'s angle, the middle, round its wall', (angle, side) => {
    const options = { shape: `oval-${side}` };
    const ovals = [{
      x: hx, y: hy, a: 20, b: 13, angle, z, inside: side === 'inside',
    }];
    const start = side === 'inside' ? { x: hx + 1, y: hy - 1, z: -60 } : { x: hx + 1, y: hy - 1, z: -45 };
    const { outcome } = measure({
      method: 'measure', options, params, radius, ovals, start,
    });
    const found = STRATEGIES.measure.size(params, options, outcome.seen);

    expect(outcome.failure).toBeUndefined();
    expect(found.kind).toBe('oval');
    expect(found.size.major).toBeCloseTo(40, 3);
    expect(found.size.minor).toBeCloseTo(26, 3);
    expect(found.turn.a).toBeCloseTo(angle, 2);
    expect(found.centre.x).toBeCloseTo(hx, 3);
    expect(found.centre.y).toBeCloseTo(hy, 3);
    expect(found.off).toBeLessThan(0.002);
  });
});

describe('Pomiar: a slot', () => {
  const params = {
    ...probeParams(), ballDiameter: 4, clear: 10, depth: 5, spacing: 12, bossSize: 60, holeSize: 60,
  };
  const radius = params.ballDiameter / 2;
  const z = [-80, -50];
  const [hx, hy] = [-120, -70];

  test.each([[0, 'inside'], [20, 'inside'], [-35, 'outside'], [90, 'outside']])('turned %s°, %s: length, width, the angle, the middle, on its wall', (angle, side) => {
    const options = { shape: `slot-${side}` };
    // 40 end to end, 16 across.
    const slots = [{
      x: hx, y: hy, half: 12, r: 8, angle, z, inside: side === 'inside',
    }];
    const start = side === 'inside' ? { x: hx + 1, y: hy - 1, z: -60 } : { x: hx + 1, y: hy - 1, z: -45 };
    // From inside the points must sit well within its width, the ball and the start's offset with them.
    const own = side === 'inside' ? { ...params, spacing: 6 } : params;
    const { outcome } = measure({
      method: 'measure', options, params: own, radius, slots, start,
    });
    const found = STRATEGIES.measure.size(own, options, outcome.seen);

    expect(outcome.failure).toBeUndefined();
    expect(found.kind).toBe('slot');
    expect(found.size.length).toBeCloseTo(40, 3);
    expect(found.size.width).toBeCloseTo(16, 3);
    // A slot lies the same either way along it: its angle folded to ±90°.
    expect(Math.abs(found.turn.a)).toBeCloseTo(Math.abs(angle), 2);
    expect(found.centre.x).toBeCloseTo(hx, 3);
    expect(found.centre.y).toBeCloseTo(hy, 3);
    expect(found.off).toBeLessThan(0.002);
  });
});

describe('an ellipse fitted', () => {
  test('through points on it: its middle, halves and the long one\'s way', () => {
    const [cx, cy, a, b, g] = [300, -200, 9, 4, 0.5];
    const points = [0, 0.7, 1.5, 2.2, 3.1, 4, 5.2].map((t) => [cx + a * Math.cos(t) * Math.cos(g) - b * Math.sin(t) * Math.sin(g), cy + a * Math.cos(t) * Math.sin(g) + b * Math.sin(t) * Math.cos(g)]);
    const fit = fitEllipse(points);

    close(fit, {
      x: cx, y: cy, a, b, angle: g,
    });
  });
});

describe('a circle fitted', () => {
  test('through points on it: its centre and radius, nothing off round', () => {
    const points = [0, 1.1, 2.5, 4].map((a) => [500 + 7 * Math.cos(a), -300 + 7 * Math.sin(a)]);

    close(fitCircle(points), {
      x: 500, y: -300, r: 7, off: 0,
    });
  });
});

describe('the paper', () => {
  const params = { ...probeParams(), paperThickness: 0.1, toolDiameter: 6 };
  const start = { x: -100, y: -50, z: -30 };

  test.each([
    ['z', { z: -30.1 }],
    ['x-left', { x: -96.9 }],
    ['x-right', { x: -103.1 }],
    ['y-front', { y: -46.9 }],
    ['y-back', { y: -53.1 }],
  ])('%s: where the tool stands, less the paper and on a side the radius', (edge, expected) => {
    const { outcome, zero } = measure({ method: 'paper', options: { edge }, params, boxes: [], start });

    expect(outcome.failure).toBeUndefined();
    close(zero, expected);
    expect(Object.keys(zero)).toEqual(Object.keys(expected));
  });

  test('on the top, Z0 on the table: down by the stock thickness; a side is never moved', () => {
    const p = { ...params, stockThickness: 18 };
    close(measure({ method: 'paper', options: { edge: 'z', on: 'work', z0: 'table' }, params: p, boxes: [], start }).zero, { z: -48.1 });
    close(measure({ method: 'paper', options: { edge: 'x-left', on: 'work', z0: 'table' }, params: p, boxes: [], start }).zero, { x: -96.9 });
  });

  test('once said, off the surface by the lift — up off the top, back off a side — then the modes put back', () => {
    const lifted = { ...params, paperLift: 2 };
    expect(measure({ method: 'paper', options: { edge: 'z' }, params: lifted, boxes: [], start }).sent).toEqual(['G90 G21 G53 G0 Z-28', 'G90 G21']);
    expect(measure({ method: 'paper', options: { edge: 'x-left' }, params: lifted, boxes: [], start }).sent).toEqual(['G90 G21 G53 G0 X-102', 'G90 G21']);
    expect(measure({ method: 'paper', options: { edge: 'z' }, params: { ...params, paperLift: 0 }, boxes: [], start }).sent).toEqual(['G90 G21']);
  });

  test('the lift moves the tool, not the zero: it is where the tool was said to be', () => {
    const { zero } = measure({ method: 'paper', options: { edge: 'z' }, params: { ...params, paperLift: 2 }, boxes: [], start });
    close(zero, { z: -30.1 });
  });

  test('an edge that is not one is refused', () => {
    expect(STRATEGIES.paper.check({ edge: 'top' })).toBe('bad-edge');
    expect(STRATEGIES.paper.check({ edge: 'y-back' })).toBeNull();
    expect(Object.keys(EDGES)).toHaveLength(5);
  });
});

test('every method says which figures it uses, and each is a probe setting', () => {
  const fields = Object.keys(probeParams());
  for (const { fields: used } of Object.values(describeStrategies())) {
    expect(used.every((name) => fields.includes(name))).toBe(true);
  }
  expect(describeStrategies().corner.options.corner).toEqual(Object.keys(CORNERS));
});
