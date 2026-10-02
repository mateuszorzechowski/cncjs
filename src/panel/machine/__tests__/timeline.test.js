import {
  fillsAt, frameAt, layOut, rangeOf, segmentAt, segmentsOf, timeAt, totalOf,
} from '../timeline';
import { TURN, cornerTimeline } from '../cornerCycle';
import { plateTimeline } from '../probeCycle';
import {
  START, advance, seek, setMode,
} from '../player';

// Two moves: a plain one, and one of two legs.
const items = layOut(['a', 'b'], {
  spanOf: () => 1000,
  runOf: () => 800,
  partsOf: (name) => (name === 'b' ? [[0, 0.5], [0.5, 1]] : [[0, 0.75]]),
});

describe('a cycle on its clock', () => {
  test('lays the moves end to end', () => {
    expect(items.map((item) => item.start)).toEqual([0, 1000]);
    expect(totalOf(items)).toBe(2000);
  });

  test('says the move under way and how far through its run', () => {
    expect(frameAt(items, 400)).toMatchObject({ name: 'a', p: 0.5 });
    expect(frameAt(items, 900)).toMatchObject({ name: 'a', p: 1 });
    expect(frameAt(items, 1200)).toMatchObject({ name: 'b', p: 0.25 });
  });

  test('draws a segment a part, each with its time', () => {
    const segments = segmentsOf(items);
    expect(segments.map(({ name, part }) => `${name}${part}`)).toEqual(['a0', 'b0', 'b1']);
    expect(segments[0]).toMatchObject({ a: 0, b: 600 });
    expect(segments[2]).toMatchObject({ a: 1400, b: 1800 });
    expect(segmentAt(segments, 1500)).toBe(2);
    expect(segmentAt(segments, 700)).toBe(0);
  });

  test('fills each segment by its own time, full at the point a pause or a loop stops', () => {
    expect(fillsAt(items, 300)).toEqual({ 'a:0': 0.5, 'b:0': 0, 'b:1': 0 });
    expect(fillsAt(items, 600)['a:0']).toBe(1);
    expect(fillsAt(items, 1600)).toEqual({ 'a:0': 1, 'b:0': 1, 'b:1': 0.5 });
    expect(fillsAt(items, 1600, false)['a:0']).toBe(0);
    expect(timeAt(items, 'b', 0.5)).toBe(1400);
  });

  test('a pick covers a move, a part of one, or a run of them', () => {
    expect(rangeOf(items, ['a'])).toEqual({ a: 0, b: 600 });
    expect(rangeOf(items, ['b'], 1)).toEqual({ a: 1400, b: 1800 });
    expect(rangeOf(items, ['a', 'b'])).toEqual({ a: 0, b: 1800 });
  });
});

describe('the probing cycles, played a segment at a time', () => {
  test.each([
    ['Z plate', plateTimeline()],
    ['corner', cornerTimeline()],
    ['corner on a phone', cornerTimeline({ apart: true })],
  ])('%s: every segment played once stops with its bar full, nowhere short', (label, cycle) => {
    const clock = { total: totalOf(cycle), hold: 2500 };
    segmentsOf(cycle).forEach((one) => {
      let s = seek(setMode(START, 'once', segmentsOf(cycle)), { a: one.a, b: one.b });
      for (let i = 0; i < 2000 && !s.paused; i++) {
        s = advance(s, 16, clock);
      }
      expect(s.t).toBe(one.b);
      expect(fillsAt(cycle, s.t)[`${one.name}:${one.part}`]).toBe(1);
    });
  });

  test('the frame a segment stops on is its own: its move, its view, never the next one start', () => {
    [plateTimeline(), cornerTimeline(), cornerTimeline({ apart: true })].forEach((cycle) => {
      segmentsOf(cycle).forEach((one) => {
        const frame = frameAt(cycle, one.b);
        expect(frame.name).toBe(one.name);
        if (cycle[0].name === 'zFast' && one.name === 'zero' && one.part === 0) {
          expect(frame.p).toBeLessThanOrEqual(TURN);
        }
      });
    });
  });
});
