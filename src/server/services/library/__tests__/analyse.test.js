import analyse from '../analyse';
import { machineTiming, Planner } from '../estimate';

const MACHINE = machineTiming({
  $11: '0.010', $12: '0.002',
  $110: '6000', $111: '6000', $112: '3000',
  $120: '500', $121: '500', $122: '500',
});

const program = (...lines) => lines.join('\n');

/** The same moves, fed to the planner by hand. */
const planned = (moves) => {
  const planner = new Planner(MACHINE);
  moves(planner);
  return planner.finish();
};

const O = { x: 0, y: 0, z: 0 };

describe('what a program is', () => {
  test('lines count as the sender counts them — blank ones are not sent', async () => {
    const { lines } = await analyse(program('G21', '', 'G0 X1', '   ', 'M30', ''), null);

    expect(lines).toBe(3);
  });

  test('bounds are of the moves, not of where the machine started', async () => {
    const { bounds } = await analyse(program('G21 G90', 'G0 X10 Y5 Z3', 'G1 Z-2 F100', 'G1 X20 Y15'), null);

    expect(bounds).toEqual({ min: { x: 10, y: 5, z: -2 }, max: { x: 20, y: 15, z: 3 } });
  });

  test('an arc reaches past its ends', async () => {
    const { bounds } = await analyse(program('G21 G90 G0 X0 Y0', 'G2 X20 Y0 I10 J0 F300'), null);

    expect(bounds.max.y).toBeCloseTo(10, 3);
  });

  test('an arc in another plane reaches past its ends in that plane', async () => {
    const zx = (await analyse(program('G21 G90 G18 G0 X0 Y0 Z0', 'G2 X10 Z0 I5 K0 F300'), null)).bounds;
    const yz = (await analyse(program('G21 G90 G19 G0 X0 Y0 Z0', 'G2 Y10 Z0 J5 K0 F300'), null)).bounds;

    expect([zx.min.x, zx.max.x, zx.min.y, zx.max.y]).toEqual([0, 10, 0, 0]);
    expect(zx.max.z - zx.min.z).toBeCloseTo(5, 2); // chords, within $12
    expect([yz.min.x, yz.max.x, yz.min.y, yz.max.y]).toEqual([0, 0, 0, 10]);
    expect(yz.max.z - yz.min.z).toBeCloseTo(5, 2);
  });

  test('inches are millimetres by the time they are counted', async () => {
    const { bounds } = await analyse(program('G20 G90 G0 X1 Y2'), null);

    expect(bounds.max).toEqual({ x: 25.4, y: 50.8, z: 0 });
  });

  test('tools are every T the program asks for, once each', async () => {
    const { tools } = await analyse(program('T7 M6', 'G0 X1', 'T3 M6', 'G0 X2', 'T7 M6'), null);

    expect(tools).toEqual([3, 7]);
  });

  test('a program that never moves has no bounds', async () => {
    expect((await analyse(program('G21', 'M30'), null)).bounds).toBeNull();
  });
});

describe('how long it takes', () => {
  test('is null until a machine has said its limits', async () => {
    expect((await analyse(program('G1 X10 F600'), null)).seconds).toBeNull();
  });

  test('is the planner over the moves, with the F of each line', async () => {
    const { seconds } = await analyse(program('G21 G90', 'G1 X50 F600', 'G1 X50 Y50 F1200'), MACHINE);

    expect(seconds).toBeCloseTo(planned(p => {
      p.line(O, { x: 50, y: 0, z: 0 }, { feed: 10 });
      p.line({ x: 50, y: 0, z: 0 }, { x: 50, y: 50, z: 0 }, { feed: 20 });
    }), 9);
  });

  test('an F in inches is a speed in millimetres', async () => {
    const { seconds } = await analyse(program('G20 G90', 'G1 X1 F10'), MACHINE);

    expect(seconds).toBeCloseTo(planned(p => p.line(O, { x: 25.4, y: 0, z: 0 }, { feed: 254 / 60 })), 9);
  });

  test('rapids ignore F', async () => {
    const { seconds } = await analyse(program('G21 G90 F10', 'G0 X100'), MACHINE);

    expect(seconds).toBeCloseTo(planned(p => p.line(O, { x: 100, y: 0, z: 0 }, { feed: null })), 9);
  });

  test('a dwell adds its P seconds and stops the machine', async () => {
    const through = await analyse(program('G21 G90', 'G1 X50 F600', 'G1 X100'), MACHINE);
    const dwelling = await analyse(program('G21 G90', 'G1 X50 F600', 'G4 P1.5', 'G1 X100'), MACHINE);

    expect(dwelling.seconds).toBeCloseTo(through.seconds + 1.5 + 0.02, 6);
  });

  test('a spindle change stops the machine; a comment does not', async () => {
    const through = await analyse(program('G21 G90', 'G1 X50 F600', '(note)', 'G1 X100'), MACHINE);
    const spindle = await analyse(program('G21 G90', 'G1 X50 F600', 'M3 S1000', 'G1 X100'), MACHINE);

    expect(spindle.seconds).toBeCloseTo(through.seconds + 0.02, 6);
  });
});

describe('a large program', () => {
  test('lets the event loop turn while it is read, so a running job keeps streaming', async () => {
    const text = Array.from({ length: 5000 }, (_, i) => `G1 X${i % 100} Y${i % 7} F1000`).join('\n');
    let turned = 0;
    const tick = () => {
      turned++;
      if (turned < 1000) {
        setImmediate(tick);
      }
    };
    setImmediate(tick);

    await analyse(text, MACHINE);

    // One turn per 200 lines at the least.
    expect(turned).toBeGreaterThanOrEqual(5000 / 200);
  });
});
