import {
  START, advance, pause, play, seek, setMode, shownAt, stepBy,
} from '../player';

const segments = [{ a: 0, b: 600 }, { a: 1000, b: 1400 }, { a: 1400, b: 1800 }];
const clock = { total: 2000, hold: 500 };
const run = (state, ms) => {
  let s = state;
  for (let i = 0; i < ms / 10; i++) {
    s = advance(s, 10, clock);
  }
  return s;
};

describe('the Setup drawing\'s player', () => {
  test('the whole cycle plays round and round', () => {
    expect(run(START, 2100).t).toBeCloseTo(100);
  });

  test('a tap moves to what was tapped and keeps playing from there, through the rest of the cycle', () => {
    const s = run(seek(START, segments[1]), 900);
    expect(s.t).toBeCloseTo(1901);
    expect(s.paused).toBe(false);
  });

  test('paused, a tap shows the start of what was tapped and waits', () => {
    const s = run(seek({ ...START, paused: true }, segments[1]), 500);
    expect(s.t).toBe(1001);
  });

  test('a loop plays its range, holds its end, and starts it again', () => {
    const s = seek(setMode(START, 'loop', segments), segments[1]);
    const held = run(s, 600);
    expect(shownAt(held, clock.total)).toBe(1400);
    expect(run(s, 1000).t).toBeLessThan(1400);
  });

  test('a loop of the last segment holds past the cycle end and starts the segment again, not the cycle', () => {
    const last = { a: 1400, b: 1900 };
    const s = seek(setMode(START, 'loop', segments), last);
    const held = run(s, 800);
    expect(held.t).toBeGreaterThan(clock.total);
    expect(run(s, 1100).t).toBeGreaterThanOrEqual(1400);
  });

  test('once plays its range to its end and stops there; play starts it over', () => {
    const s = run(seek(setMode(START, 'once', segments), segments[1]), 800);
    expect(s).toMatchObject({ t: 1400, ended: true, paused: false });
    expect(play(s).t).toBe(1001);
  });

  test('once ended, a tap on another part plays it', () => {
    const s = run(seek(setMode(START, 'once', segments), segments[1]), 800);
    expect(run(seek(s, segments[2]), 200).t).toBeCloseTo(1601);
  });

  test('a repeat with nothing picked takes the segment under way', () => {
    expect(setMode({ ...START, t: 1200 }, 'loop', segments).range).toMatchObject({ a: 1000, b: 1400 });
  });

  test('a pause lets the segment under way finish, and holds', () => {
    const s = run(pause({ ...START, t: 200 }, segments), 1000);
    expect(s).toMatchObject({ t: 600, paused: true, stopAt: null });
    expect(run(s, 500).t).toBe(600);
  });

  test('the step buttons go a segment on, and back to a segment\'s start first', () => {
    expect(stepBy({ ...START, t: 100 }, 1, segments).t).toBe(1001);
    expect(stepBy({ ...START, t: 1350 }, -1, segments).t).toBe(1001);
    expect(stepBy({ ...START, t: 1100 }, -1, segments).t).toBe(1);
  });
});
