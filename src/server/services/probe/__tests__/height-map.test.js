import { createProbeRun } from '../../../controllers/Grbl/probe-run';
import { probeParams } from '..';
import { STRATEGIES } from '../strategies';
import { gridOf } from '../../height-map/grid';
import { compensate, heightAt } from '../../height-map/compensate';

const strategy = STRATEGIES['height-map'];
const WCO = { x: -120, y: -80, z: -40 };

// A warped board, machine coordinates: its top about Z -45.
const surface = (x, y) => -45 + 0.002 * (x + 120) + 0.001 * (y + 80) + 0.00005 * (x + 120) * (y + 80);

const wordsOf = (line) => Object.fromEntries(
  [...line.matchAll(/([XYZF])(-?[\d.]+)/g)].map(([, letter, value]) => [letter.toLowerCase(), Number(value)]),
);

/** The method run over `surface` to the end, the tool starting at `start` (machine). */
const measure = (options, params = probeParams(), start = { x: -120, y: -80, z: -40 }) => {
  const queue = [];
  const sent = [];
  let pos = { ...start };
  let outcome = null;
  const wco = WCO;
  const run = createProbeRun({
    steps: strategy.steps(params, options, { start, wco }),
    start,
    wco,
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
    if (line.includes('G38.2')) {
      const target = words.z + wco.z;
      const top = surface(pos.x, pos.y);
      if (pos.z >= top && target <= top) {
        pos = { ...pos, z: top };
        run.prb({ ...pos, result: 1 });
      } else {
        pos = { ...pos, z: target };
        run.alarm('ALARM:5');
        run.prb({ x: 0, y: 0, z: 0, result: 0 });
      }
    } else if (line.includes('G53')) {
      pos = { ...pos, ...words };
    }
    run.ok();
  }
  const map = outcome.seen ? strategy.map(params, options, outcome.seen, { start, wco }) : null;
  return { outcome, sent, map };
};

describe('the grid', () => {
  test('a count per side, the points reaching both edges', () => {
    expect(gridOf({ x: [0, 40], y: [0, 20], nx: 5, ny: 3 })).toEqual({ xs: [0, 10, 20, 30, 40], ys: [0, 10, 20], stepX: 10, stepY: 10 });
  });

  test('a step becomes the nearest count, and the step the one that divides the side', () => {
    const { xs, stepX } = gridOf({ x: [0, 25], y: [0, 10], stepX: 10, ny: 2 });
    expect(xs).toHaveLength(4);
    expect(stepX).toBeCloseTo(25 / 3);
  });

  test('in inches when given in them', () => {
    expect(gridOf({ x: [0, 1], y: [0, 1], nx: 2, ny: 2 }, 'inch').xs).toEqual([0, 25.4]);
  });

  test('an area with no width, or too few or too many points, is not a grid', () => {
    expect(gridOf({ x: [5, 5], y: [0, 10], nx: 2, ny: 2 })).toEqual({ error: 'bad-area' });
    expect(gridOf({ x: [0, 10], y: [0, 10], nx: 1, ny: 2 })).toEqual({ error: 'bad-grid' });
    expect(gridOf({ x: [0, 10], y: [0, 10], nx: 31, ny: 2 })).toEqual({ error: 'bad-grid' });
    expect(gridOf({ x: [0, 10], y: [0, 10], ny: 2 })).toEqual({ error: 'bad-grid' });
  });
});

describe('the height map', () => {
  const options = strategy.read({ x: [0, 40], y: [0, 30], nx: 3, ny: 4 }).options;

  test('touches every point twice, row by row with every other row backwards, rising between them', () => {
    const { outcome, sent } = measure(options);
    expect(outcome.failure).toBeUndefined();
    const overs = sent.filter((line) => /G53 G0 X/.test(line)).map((line) => wordsOf(line));
    expect(overs.map(({ x, y }) => [x + 120, y + 80])).toEqual([
      [0, 0], [20, 0], [40, 0],
      [40, 10], [20, 10], [0, 10],
      [0, 20], [20, 20], [40, 20],
      [40, 30], [20, 30], [0, 30],
    ]);
    expect(sent.filter((line) => line.includes('G38.2'))).toHaveLength(24);
    // Every move sideways is made at the start's height, never near the surface.
    const ups = sent.filter((line) => /G53 G0 Z/.test(line)).map((line) => wordsOf(line).z);
    expect(ups.filter((z) => z === -40)).toHaveLength(12);
  });

  test('keeps the surface in machine X and Y, each height from the first point', () => {
    const { map } = measure(options);
    expect(map.xs).toEqual([-120, -100, -80]);
    expect(map.ys).toEqual([-80, -70, -60, -50]);
    expect(map.dz[0][0]).toBe(0);
    for (let j = 0; j < map.ys.length; j++) {
      for (let i = 0; i < map.xs.length; i++) {
        expect(map.dz[j][i]).toBeCloseTo(surface(map.xs[i], map.ys[j]) - surface(-120, -80), 6);
      }
    }
    expect(map.travel).toBeCloseTo(-40 - surface(-120, -80), 6);
  });

  test('a program bent by it keeps its depth under the surface', () => {
    const { map } = measure(options);
    const { lines } = compensate('G0 X0 Y0 Z2\nG1 Z-0.5 F100\nG1 X40 Y30', map, { wco: WCO });
    for (const line of lines.filter((l) => /^G1/.test(l)).slice(1)) {
      const { x, y, z } = wordsOf(line);
      // Z0 on the first point: the cut is half a millimetre under the board wherever it is.
      expect(z).toBeCloseTo(-0.5 + heightAt(map, x + WCO.x, y + WCO.y), 3);
      expect(z + surface(-120, -80) - WCO.z - (surface(x + WCO.x, y + WCO.y) - WCO.z)).toBeCloseTo(-0.5, 2);
    }
  });

  test('a point with nothing under it within the limit ends the measurement', () => {
    const { outcome, map } = measure(options, { ...probeParams(), maxZ: 3 });
    expect(outcome).toEqual({ failure: 'ALARM:5', phase: 'p0-fast' });
    expect(map).toBeNull();
  });

  test('an area given wrong is refused before anything moves', () => {
    expect(strategy.read({ x: [10, 0], y: [0, 10], nx: 2, ny: 2 })).toEqual({ error: 'bad-area' });
  });
});
