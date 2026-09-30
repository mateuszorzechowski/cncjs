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
const measure = ({ method, options = {}, params, boxes, start }) => {
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
      const hit = contact(boxes, params.toolDiameter / 2, pos, target);
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
  const zero = outcome.seen ? strategy.zero(params, options, outcome.seen, start) : null;
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

    const { outcome, zero } = measure({ method: 'corner', options: { corner: name }, params, boxes: plateOn(name, cx, cy, top), start });

    expect(outcome.failure).toBeUndefined();
    close(zero, { x: cx, y: cy, z: top });
  });

  test('coming down onto the plate instead of beside it stops, and says so', () => {
    const [cx, cy, top] = [-150, -90, -55];
    const start = { x: cx + 8, y: cy + 8, z: top + params.cornerThickness + 5 };

    const { outcome } = measure({
      method: 'corner', options: { corner: 'front-left' }, params: { ...params, clear: 5 }, boxes: plateOn('front-left', cx, cy, top), start,
    });

    expect(outcome).toEqual({ failure: 'touched', phase: 'x-down' });
  });

  test('a corner that is not one is refused before anything moves', () => {
    expect(STRATEGIES.corner.check({ corner: 'middle' })).toBe('bad-corner');
    expect(STRATEGIES.corner.check({ corner: 'back-right' })).toBeNull();
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

  test('moves nothing: the only line is the modes put back', () => {
    const { sent } = measure({ method: 'paper', options: { edge: 'z' }, params, boxes: [], start });

    expect(sent).toEqual(['G90 G21']);
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
