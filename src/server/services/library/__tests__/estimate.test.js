import { Planner, machineTiming, blockSeconds, arcPoints, BUFFER_BLOCKS } from '../estimate';

// Numbers chosen to be worked out by hand: 500 mm/s² on every axis, fast rapids.
const MACHINE = machineTiming({
  $11: '0.010', $12: '0.002',
  $110: '6000', $111: '6000', $112: '3000',
  $120: '500', $121: '500', $122: '500',
});

const O = { x: 0, y: 0, z: 0 };
const at = (x, y = 0, z = 0) => ({ x, y, z });
const F = (mmPerMin) => ({ feed: mmPerMin / 60 });

describe('the machine it is timed on', () => {
  test('is read from the firmware, per axis, in mm and seconds', () => {
    expect(MACHINE).toEqual({
      rate: { x: 100, y: 100, z: 50 },
      accel: { x: 500, y: 500, z: 500 },
      junctionDeviation: 0.01,
      arcTolerance: 0.002,
    });
  });

  test('is not guessed at when a setting is missing', () => {
    expect(machineTiming({ $110: '6000' })).toBeNull();
    expect(machineTiming(undefined)).toBeNull();
  });
});

describe('one block', () => {
  test('ramps up, cruises and ramps down', () => {
    // 10 mm/s at 500 mm/s²: 0.02 s and 0.1 mm each way, 99.8 mm at speed.
    expect(blockSeconds(100, 0, 0, 10, 500)).toBeCloseTo(0.02 + 9.98 + 0.02, 6);
  });

  test('too short to reach its speed is a triangle', () => {
    // Peaks at sqrt(a·L) = 10 mm/s, never the 100 asked for.
    expect(blockSeconds(1, 0, 0, 100, 100)).toBeCloseTo(0.2, 6);
  });
});

describe('a program', () => {
  const time = (moves) => {
    const planner = new Planner(MACHINE);
    moves(planner);
    return planner.finish();
  };

  test('a single cut starts and ends at rest', () => {
    expect(time(p => p.line(O, at(100), F(600)))).toBeCloseTo(10.02, 6);
  });

  test('two cuts in a line take as long as one', () => {
    expect(time(p => {
      p.line(O, at(50), F(600));
      p.line(at(50), at(100), F(600));
    })).toBeCloseTo(10.02, 6);
  });

  test('a short move cannot hand the next one more speed than it could build', () => {
    // 1 mm from rest reaches √(2·500·1) ≈ 32 mm/s, not the 100 asked for; so
    // 1 mm then 100 mm in a line is exactly one 101 mm move.
    expect(time(p => {
      p.line(O, at(1), F(6000));
      p.line(at(1), at(101), F(6000));
    })).toBeCloseTo(blockSeconds(101, 0, 0, 100, 500), 6);
  });

  test('a block enters at the speed the one before it left at', () => {
    const handedOver = [];
    const planner = new Planner(MACHINE);
    const run = planner.run.bind(planner);
    planner.run = (block) => {
      handedOver.push({ entry: block.entry, exit: planner.blocks[0]?.entry ?? 0 });
      run(block);
    };
    for (let i = 0; i < 200; i++) {
      planner.line(at(i / 10), at((i + 1) / 10), F(6000));
    }
    planner.finish();

    for (let i = 1; i < handedOver.length; i++) {
      expect(handedOver[i].entry).toBeCloseTo(handedOver[i - 1].exit, 9);
    }
  });

  test('a reversal stops at the turn', () => {
    expect(time(p => {
      p.line(O, at(50), F(600));
      p.line(at(50), O, F(600));
    })).toBeCloseTo(2 * 5.02, 6);
  });

  test('a corner is taken at the junction-deviation speed, between stopping and not', () => {
    const corner = time(p => {
      p.line(O, at(50), F(6000));
      p.line(at(50), at(50, 50), F(6000));
    });
    const stopping = 2 * blockSeconds(50, 0, 0, 100, 500);
    // √(a·δ·sin(θ/2)/(1−sin(θ/2))) with a = 500/cos 45° along the corner.
    const vj = Math.sqrt((500 / Math.SQRT1_2) * 0.01 * Math.SQRT1_2 / (1 - Math.SQRT1_2));
    const expected = blockSeconds(50, 0, vj, 100, 500) + blockSeconds(50, vj, 0, 100, 500);

    expect(corner).toBeCloseTo(expected, 6);
    expect(corner).toBeLessThan(stopping);
  });

  test('a rapid runs at what each axis allows along its direction', () => {
    // Z is the slow axis: 50 mm/s straight down, whatever F says.
    expect(time(p => p.line(O, at(0, 0, -100), { feed: null }))).toBeCloseTo(blockSeconds(100, 0, 0, 50, 500), 6);
    // Diagonal in XY: each axis at its 100 mm/s and 500 mm/s², so √2 times both along the move.
    expect(time(p => p.line(O, at(100, 100), { feed: null })))
      .toBeCloseTo(blockSeconds(Math.hypot(100, 100), 0, 0, 100 * Math.SQRT2, 500 * Math.SQRT2), 6);
  });

  test('a feed faster than the machine is capped by it', () => {
    expect(time(p => p.line(O, at(0, 0, -100), F(60000)))).toBeCloseTo(blockSeconds(100, 0, 0, 50, 500), 6);
  });

  test('G93 gives each block a time, not a speed', () => {
    // F2 in inverse time: the block takes half a minute, whatever its length.
    const seconds = time(p => p.line(O, at(10), { feed: 2, inverseTime: true }));
    expect(seconds).toBeCloseTo(blockSeconds(10, 0, 0, 10 * 2 / 60, 500), 6);
  });

  test('many short segments are held back by the 16-block look-ahead', () => {
    // 0.1 mm segments at 100 mm/s: the buffer only ever holds 1.6 mm, and it
    // must be able to stop inside it — so Grbl never gets near 100 mm/s.
    const seconds = time(p => {
      for (let i = 0; i < 1000; i++) {
        p.line(at(i / 10), at((i + 1) / 10), F(6000));
      }
    });
    const ceiling = Math.sqrt(2 * 500 * 0.1 * (BUFFER_BLOCKS - 1));

    // Cruising at the ceiling, give or take the ramps at either end —
    // more than twice as long as one 100 mm move at 100 mm/s.
    expect(seconds).toBeGreaterThan(100 / ceiling);
    expect(seconds).toBeLessThan(1.05 * (100 / ceiling));
    expect(seconds).toBeGreaterThan(2 * blockSeconds(100, 0, 0, 100, 500));
  });

  test('a stop brings the machine to rest and adds the dwell', () => {
    const through = time(p => {
      p.line(O, at(50), F(600));
      p.line(at(50), at(100), F(600));
    });
    const dwelling = time(p => {
      p.line(O, at(50), F(600));
      p.stop(2);
      p.line(at(50), at(100), F(600));
    });

    expect(dwelling).toBeCloseTo(through + 2 + 0.02, 6);
  });
});

describe('arcs', () => {
  test('are cut into chords within the tolerance, as Grbl cuts them', () => {
    // Full circle, r = 10, $12 = 0.002: chords of √(0.002 · 19.998) mm.
    const points = arcPoints(at(10), at(10), O, { plane: 'G17', clockwise: false }, 0.002);
    const chord = Math.sqrt(0.002 * (2 * 10 - 0.002));

    expect(points).toHaveLength(Math.floor((0.5 * 2 * Math.PI * 10) / chord));
    points.forEach(point => expect(Math.hypot(point.x, point.y)).toBeCloseTo(10, 9));
    expect(points[points.length - 1]).toEqual(at(10));
  });

  test('go the way the code says', () => {
    // From (0,0) about (10,0): clockwise passes over the top, counter-clockwise under.
    const top = arcPoints(O, at(20), at(10), { plane: 'G17', clockwise: true }, 0.002);
    const bottom = arcPoints(O, at(20), at(10), { plane: 'G17', clockwise: false }, 0.002);

    expect(Math.max(...top.map(p => p.y))).toBeCloseTo(10, 3);
    expect(Math.min(...bottom.map(p => p.y))).toBeCloseTo(-10, 3);
  });

  test('in G18 turn in the ZX plane, and a helix moves the third axis evenly', () => {
    const points = arcPoints(at(10, 0, 0), at(-10, 5, 0), O, { plane: 'G18', clockwise: false }, 0.002);
    const half = points[Math.floor(points.length / 2) - 1];

    points.forEach(point => expect(Math.hypot(point.z, point.x)).toBeCloseTo(10, 9));
    expect(half.y).toBeCloseTo(2.5, 1);
  });

  test('in G93 take the time F gives the whole arc, not each chord', () => {
    // F6 in inverse time: the circle takes a tenth of a minute.
    const planner = new Planner(MACHINE);
    planner.arc(at(10), at(10), O, { plane: 'G17', clockwise: false, feed: 6, inverseTime: true });

    expect(planner.finish()).toBeCloseTo(10, 1);
  });

  test('take about their length over the feed', () => {
    const planner = new Planner(MACHINE);
    planner.arc(at(10), at(10), O, { plane: 'G17', clockwise: false, ...F(600) });
    const seconds = planner.finish();

    expect(seconds).toBeGreaterThan((2 * Math.PI * 10) / 10);
    expect(seconds).toBeLessThan((2 * Math.PI * 10) / 10 + 0.1);
  });
});
