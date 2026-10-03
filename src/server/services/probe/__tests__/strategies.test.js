import { createProbeRun } from '../../../controllers/Grbl/probe-run';
import { probeParams } from '..';
import { STRATEGIES, describeStrategies } from '../strategies';
import { CORNERS } from '../strategies/corner';
import { EDGES } from '../strategies/paper';

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

/** Run one method on the bench to the end; the outcome and every line sent. */
// `radius`: what touches — the tool, or a 3D probe's ball.
const measure = ({
  method, options = {}, params, boxes, start, radius = params.toolDiameter / 2,
}) => {
  const strategy = STRATEGIES[method];
  const queue = [];
  const sent = [];
  let pos = { ...start };
  let outcome = null;
  const run = createProbeRun({
    steps: strategy.steps(params, options),
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
      const hit = contact(boxes, radius, pos, target);
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

describe('the centre of a hole', () => {
  const params = { ...probeParams(), ballDiameter: 4, holeSize: 30 };
  const radius = params.ballDiameter / 2;

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

  test('puts X0 Y0 at the centre, from a start off it, the tool there at the end', () => {
    const [hx, hy] = [-120, -70];
    const { outcome, zero, pos } = measure({
      method: 'hole', params, radius, boxes: holeAt(hx, hy, 24), start: { x: hx + 5, y: hy - 3, z: -60 },
    });

    expect(outcome.failure).toBeUndefined();
    close(zero, { x: hx, y: hy });
    expect(Object.keys(zero)).toEqual(['x', 'y']);
    close(pos, { x: hx, y: hy, z: -60 });
  });

  test('says how big the hole is each way, the ball added back', () => {
    const [hx, hy] = [-120, -70];
    const { outcome } = measure({
      method: 'hole', params, radius, boxes: holeAt(hx, hy, 24), start: { x: hx + 5, y: hy - 3, z: -60 },
    });
    const found = STRATEGIES.hole.found(params, {}, outcome.seen);

    close(found, { x: 24, y: 24 });
  });

  test('one pass, if asked: half the touches, the same centre and size', () => {
    const [hx, hy] = [-120, -70];
    const once = { ...params, holePasses: 1 };
    const { outcome, zero, sent } = measure({
      method: 'hole', params: once, radius, boxes: holeAt(hx, hy, 24), start: { x: hx + 5, y: hy - 3, z: -60 },
    });
    const twice = measure({
      method: 'hole', params, radius, boxes: holeAt(hx, hy, 24), start: { x: hx + 5, y: hy - 3, z: -60 },
    });

    close(zero, { x: hx, y: hy });
    close(STRATEGIES.hole.found(once, {}, outcome.seen), { x: 24, y: 24 });
    expect(sent.filter((line) => line.includes('G38')).length * 2).toBe(twice.sent.filter((line) => line.includes('G38')).length);
  });

  test('a hole wider than its rough size is a failure, nothing written', () => {
    const { outcome, zero } = measure({
      method: 'hole', params: { ...params, holeSize: 5 }, radius, boxes: holeAt(-120, -70, 40), start: { x: -120, y: -70, z: -60 },
    });

    expect(outcome).toEqual({ failure: 'ALARM:5', phase: 'x1a-fast' });
    expect(zero).toBeNull();
  });
});

describe('the centre of a part, from outside', () => {
  const params = { ...probeParams(), ballDiameter: 4, bossSize: 30, clear: 10, depth: 5 };
  const radius = params.ballDiameter / 2;
  const [hx, hy] = [-120, -70];

  /** A square part `size` across centred on (hx, hy), its top at Z -50. */
  const partAt = (size) => [{ x: [hx - size / 2, hx + size / 2], y: [hy - size / 2, hy + size / 2], z: [-80, -50] }];
  const start = { x: hx + 3, y: hy - 2, z: -45 };

  test('touches the top, then each side from outside: X0 Y0 at the centre, the ball over it', () => {
    const { outcome, zero, pos } = measure({
      method: 'boss', params, radius, boxes: partAt(24), start,
    });

    expect(outcome.failure).toBeUndefined();
    close(zero, { x: hx, y: hy });
    expect(Object.keys(zero)).toEqual(['x', 'y']);
    close(pos, { x: hx, y: hy, z: -50 + params.retract });
    close(STRATEGIES.boss.found(params, {}, outcome.seen), { x: 24, y: 24 });
  });

  test('goes down beside a side by the depth under the top it found, not under where it started', () => {
    const { sent } = measure({
      method: 'boss', params, radius, boxes: partAt(24), start: { ...start, z: -38 },
    });
    // The first way down beside a side, in work coordinates: from the top plus the retract to the depth under it.
    const down = sent.find((line) => line.includes('G38.3'));
    expect(wordsOf(down).z + WCO.z).toBeCloseTo(-50 - params.depth, 6);
  });

  test('one pass, if asked: the same centre', () => {
    const { zero } = measure({
      method: 'boss', params: { ...params, holePasses: 1 }, radius, boxes: partAt(24), start,
    });

    close(zero, { x: hx, y: hy });
  });

  test('a part wider than its rough size lands the ball on its top: a failure, nothing written', () => {
    const { outcome, zero } = measure({
      method: 'boss', params: { ...params, bossSize: 10, clear: 2 }, radius, boxes: partAt(40), start,
    });

    expect(outcome).toMatchObject({ failure: 'touched', phase: 'x1a-down' });
    expect(zero).toBeNull();
  });
});

describe('a size, not a zero', () => {
  const params = { ...probeParams(), ballDiameter: 4, holeSize: 30, bossSize: 40, clear: 10, depth: 5 };
  const radius = params.ballDiameter / 2;
  const [hx, hy] = [-120, -70];
  const z = [-80, -50];

  /** A rectangular hole `w` × `d` around (hx, hy). */
  const holeOf = (w, d) => [
    { x: [hx - 200, hx - w / 2], y: [hy - 200, hy + 200], z },
    { x: [hx + w / 2, hx + 200], y: [hy - 200, hy + 200], z },
    { x: [hx - 200, hx + 200], y: [hy - 200, hy - d / 2], z },
    { x: [hx - 200, hx + 200], y: [hy + d / 2, hy + 200], z },
  ];
  /** A rectangular part `w` × `d` around (hx, hy), its top at Z -50. */
  const partOf = (w, d) => [{ x: [hx - w / 2, hx + w / 2], y: [hy - d / 2, hy + d / 2], z }];
  const touches = (sent) => sent.filter((line) => line.includes('G38.2')).length;

  test('a hole each way, the ball added back, the tool at its centre; no zero', () => {
    const { outcome, pos } = measure({
      method: 'hole-size', params, radius, boxes: holeOf(24, 18), start: { x: hx + 5, y: hy - 3, z: -60 },
    });
    const found = STRATEGIES['hole-size'].size(params, {}, outcome.seen);

    expect(STRATEGIES['hole-size'].zero).toBeUndefined();
    close(found.size, { x: 24, y: 18 });
    expect(found.spread).toBeNull();
    expect(found.each).toHaveLength(1);
    close(pos, { x: hx, y: hy, z: -60 });
  });

  test('a part from outside each way, the ball taken off, after touching its top', () => {
    const { outcome, sent } = measure({
      method: 'boss-size', params, radius, boxes: partOf(30, 20), start: { x: hx + 3, y: hy - 2, z: -45 },
    });

    expect(outcome.failure).toBeUndefined();
    close(STRATEGIES['boss-size'].size(params, {}, outcome.seen).size, { x: 30, y: 20 });
    expect(wordsOf(sent.find((line) => line.includes('G38.2'))).z).toBeDefined();
  });

  test('repeated: the centre found first, then every pass counted — the mean and the spread', () => {
    const three = { ...params, repeats: 3 };
    const { outcome, sent } = measure({
      method: 'hole-size', params: three, radius, boxes: holeOf(24, 18), start: { x: hx + 5, y: hy - 3, z: -60 },
    });
    const found = STRATEGIES['hole-size'].size(three, {}, outcome.seen);

    // One pass to find the centre (holePasses 2), three counted: four touches per axis each, two touches a pass.
    expect(touches(sent)).toBe(4 * 2 * 2 * 2);
    expect(found.each).toHaveLength(3);
    close(found.size, { x: 24, y: 18 });
    close(found.spread, { x: 0, y: 0 });
  });

  test('repeated with one pass to the centre: every pass counts, the first from where the tool stood', () => {
    const { outcome, sent } = measure({
      method: 'hole-size', params: { ...params, holePasses: 1, repeats: 2 }, radius, boxes: holeOf(24, 18), start: { x: hx + 5, y: hy - 3, z: -60 },
    });

    expect(touches(sent)).toBe(2 * 2 * 2 * 2);
    expect(STRATEGIES['hole-size'].size({ ...params, holePasses: 1, repeats: 2 }, {}, outcome.seen).each).toHaveLength(2);
  });

  test('one width: a groove from inside along one axis touches only that axis', () => {
    const options = { shape: 'groove-y' };
    const { outcome, sent, pos } = measure({
      method: 'width', options, params, radius, boxes: holeOf(24, 12), start: { x: hx + 5, y: hy - 3, z: -60 },
    });
    const found = STRATEGIES.width.size(params, options, outcome.seen);

    expect(sent.filter((line) => line.includes('G38') && wordsOf(line).x !== undefined)).toHaveLength(0);
    expect(found.size).toEqual({ y: expect.any(Number) });
    close(found.size, { y: 12 });
    close(pos, { x: hx + 5, y: hy, z: -60 });
  });

  test('one width: a bar from outside along X', () => {
    const options = { shape: 'bar-x' };
    const { outcome } = measure({
      method: 'width', options, params, radius, boxes: partOf(16, 100), start: { x: hx + 3, y: hy - 2, z: -45 },
    });

    expect(outcome.failure).toBeUndefined();
    close(STRATEGIES.width.size(params, options, outcome.seen).size, { x: 16 });
  });

  test.each([
    [{ shape: 'groove-z' }, 'bad-shape'],
    [{}, 'bad-shape'],
  ])('a width that is not one is refused: %j', (options, code) => {
    expect(STRATEGIES.width.check(options)).toBe(code);
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
