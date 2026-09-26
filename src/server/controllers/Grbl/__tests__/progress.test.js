import { Progress, PLANNER_BLOCKS } from '../progress';

/*
 * The program measured on COM3 on 2026-09-26: `G21 G91`, forty moves of 1 mm
 * at 300 mm/min, `G90`, `G53 G0 X0`, `M2`. Each move is a block and about a
 * fifth of a second.
 */
const MEASURED = {
  seconds: [0, ...Array(40).fill(0.2), 0, 1.5, 0],
  blocks: [0, ...Array(40).fill(1), 0, 1, 0],
};

describe('Progress', () => {
  test('at the start, with sixteen lines acknowledged, the machine is on the first move — not on line 16', () => {
    const progress = new Progress(MEASURED);

    progress.tick(0.03, { moving: true, received: 16 });

    // Measured: received 16 while MPos said line 2.
    expect(progress.line).toBe(2);
  });

  test('the clock says where it is inside the window Grbl allows', () => {
    const progress = new Progress(MEASURED);

    progress.tick(1.1, { moving: true, received: 21 });

    // 1.1 s in: five moves done, the sixth under way — line 7.
    expect(progress.line).toBe(7);
  });

  test('never past the last line Grbl has acknowledged', () => {
    const progress = new Progress(MEASURED);

    progress.tick(6, { moving: true, received: 10 });

    expect(progress.line).toBe(10);
    expect(progress.clock).toBeCloseTo(1.8);
  });

  test('never further back than the planner holds: a slow clock is pulled forward', () => {
    const progress = new Progress(MEASURED);

    // Measured at t+5.3 s: received 43 while MPos said line 27.
    progress.tick(0, { moving: true, received: 43 });

    expect(progress.line).toBe(27);
    // And the clock with it, so what is left is counted from there: 25 moves done.
    expect(progress.clock).toBeCloseTo(5);
    // Lines 27 to 43 hold exactly the planner's sixteen blocks.
    const held = MEASURED.blocks.slice(26, 43).reduce((a, b) => a + b, 0);
    expect(held).toBe(PLANNER_BLOCKS);
  });

  test('a line of more blocks than the planner holds bounds itself', () => {
    const progress = new Progress({ seconds: [1, 10, 1], blocks: [1, 40, 1] });

    progress.tick(0, { moving: true, received: 3 });

    expect(progress.line).toBe(2);
  });

  test('time stands still while the program does not move', () => {
    const progress = new Progress(MEASURED);

    progress.tick(1, { moving: true, received: 16 });
    progress.tick(5, { moving: false, received: 16 });

    expect(progress.clock).toBeCloseTo(1);
  });

  test('the feed override runs the clock faster and shortens what is left', () => {
    const progress = new Progress(MEASURED);

    progress.tick(1, { moving: true, override: 200, received: 16 });

    expect(progress.clock).toBeCloseTo(2);
    expect(progress.remaining(200)).toBeCloseTo((progress.total - 2) / 2);
    expect(progress.remaining(100)).toBeCloseTo(progress.total - 2);
  });

  test('what is left is the whole program before it starts, and none at the end', () => {
    const progress = new Progress(MEASURED);
    expect(progress.remaining()).toBeCloseTo(9.5);
    expect(progress.percent()).toBe(0);

    progress.tick(100, { moving: true, received: 44 });
    expect(progress.remaining()).toBe(0);
    expect(progress.percent()).toBe(100);
    expect(progress.line).toBe(44);
  });

  test('nothing acknowledged is nowhere', () => {
    const progress = new Progress(MEASURED);

    progress.tick(1, { moving: true, received: 0 });

    expect(progress.line).toBe(0);
    expect(progress.clock).toBe(0);
  });
});
