import {
  PAPER_ORDER, RUN_MS, SPAN_MS, paperCode, paperReadout, paperScene, playAt, scriptAt,
} from '../paperCycle';
import {
  END_X, HAND_X, TOOL_X, drawnLength, sheetAt, sheetShape,
} from '../paperSheet';

const TICK = 33;
const CYCLE = PAPER_ORDER.length * SPAN_MS;
const LENGTH = END_X - HAND_X;

// The whole cycle frame by frame, as the drawing shows it.
const frames = () => {
  const out = [];
  for (let ms = 0; ms < CYCLE; ms += TICK) {
    const { name, p } = playAt(ms);
    const state = sheetAt(ms, scriptAt);
    const shape = sheetShape(state);
    const peak = shape.points.reduce((best, pt) => (pt[1] > best[1] ? pt : best), [0, 0]);
    out.push({
      ms, name, p, state, shape, peak,
    });
  }
  return out;
};
const ALL = frames();
const during = (name, from, to) => ALL.filter((f) => f.name === name && f.p >= from && f.p <= to);

describe('the paper cycle', () => {
  test('plays its moves in order, and has no lift — the paper does not do one', () => {
    expect(PAPER_ORDER.map((_, i) => playAt(i * SPAN_MS + 10).name)).toEqual(['coarse', 'fine', 'here', 'stop', 'zero']);
  });

  test('the sheet keeps its length at every frame: slack is moved, never made or lost', () => {
    ALL.forEach((f) => expect(drawnLength(f.shape)).toBeCloseTo(LENGTH, 1));
  });

  test('nothing jumps where one move gives way to the next, and the slack moves no faster than the hand', () => {
    for (let i = 1; i < ALL.length; i++) {
      const [was, now] = [ALL[i - 1], ALL[i]];
      if (was.name !== now.name) {
        expect(Math.abs(now.peak[1] - was.peak[1])).toBeLessThan(1);
        expect(Math.abs(now.state.slack - was.state.slack)).toBeLessThan(0.5);
      }
      expect(Math.abs(now.state.slack - was.state.slack)).toBeLessThan(1);
    }
  });

  test('free, the whole sheet goes with the hand: no slack, its far end swings too', () => {
    const coarse = during('coarse', 0, 1);
    coarse.forEach((f) => expect(f.state.slack).toBeCloseTo(0, 6));
    const ends = coarse.map((f) => f.shape.end);
    expect(Math.max(...ends) - Math.min(...ends)).toBeGreaterThan(8);
  });

  test('dragging: pushed, it folds by the hand; pulled, it goes straight and slides', () => {
    const drag = during('here', 0.1, 0.44);
    const pushed = drag.filter((f) => f.state.slack > 0.3);
    const pulled = drag.filter((f) => f.state.slack < 0.01);
    expect(pushed.length).toBeGreaterThan(3);
    expect(pulled.length).toBeGreaterThan(3);
    // The folds stand nearer the hand than the tool.
    pushed.forEach((f) => {
      const hand = f.shape.points[0][0];
      expect(f.peak[0] - hand).toBeLessThan((TOOL_X - hand) / 2);
    });
  });

  test('held, it bows into one arch across the stretch, and does not slide', () => {
    const held = during('here', 0.9, 1);
    held.forEach((f) => {
      const hand = f.shape.points[0][0];
      const mid = (hand + TOOL_X) / 2;
      expect(Math.abs(f.peak[0] - mid)).toBeLessThan((TOOL_X - hand) * 0.2);
    });
    const ends = during('here', 0.46, 1).map((f) => f.shape.end);
    expect(Math.max(...ends) - Math.min(...ends)).toBeLessThan(1e-9);
  });

  test('stopped, the folds stand still; let go, it lies straight; the zero is written on a flat sheet', () => {
    const stood = during('stop', 0.3, 0.5).map((f) => f.state.slack);
    expect(Math.max(...stood) - Math.min(...stood)).toBeLessThan(0.05);
    expect(Math.min(...stood)).toBeGreaterThan(1);
    during('stop', 0.95, 1).concat(during('zero', 0, 1)).forEach((f) => expect(f.state.slack).toBeLessThan(0.01));
  });

  test('tags the drag, the hold, the stop and the letting go', () => {
    expect(paperScene('here', 0.2).tag).toBe('probe.paper.drag');
    expect(paperScene('here', 0.8).tag).toBe('probe.paper.held');
    expect(paperScene('stop', 0.4).tag).toBe('probe.paper.stopped');
    expect(paperScene('stop', 1).tag).toBe('probe.paper.loose');
  });

  test('the tool comes down a step at a time, 1 mm then 0.1 mm, and grips only at the end', () => {
    expect(paperScene('coarse', 0).gap).toBe(60);
    expect(paperScene('coarse', 1).gap).toBe(10);
    expect(paperScene('fine', 1).gap).toBe(0);
    expect(paperScene('fine', 0.5).held).toBe(false);
    expect(paperScene('zero', 0.5).held).toBe(true);
  });

  test('says each move as its line, the zero with the sheet and on a side the radius', () => {
    const texts = { paperThickness: '0.1', toolDiameter: '6' };
    expect(paperCode('coarse', 'z', texts)).toBe('$J=G91 Z-1');
    expect(paperCode('fine', 'x-left', texts)).toBe('$J=G91 X0.1');
    expect(paperCode('here', 'z', texts)).toBeNull();
    expect(paperCode('zero', 'z', texts, 2)).toBe('G10 L20 P2 Z0.1');
    expect(paperCode('zero', 'x-left', texts)).toBe('G10 L20 P1 X-3.1');
    expect(paperCode('zero', 'y-back', texts)).toBe('G10 L20 P1 Y3.1');
  });

  test('reads the axis against the old zero, then the offset, held through the moves', () => {
    const mm = { paperThickness: 0.1, toolDiameter: 6 };
    expect(paperReadout('fine', 'z', mm)).toEqual({ axis: 'z', value: 12.34, after: false });
    expect(paperReadout('zero', 'x-right', mm)).toEqual({ axis: 'x', value: 3.1, after: true });
  });

  test('a figure being set loops the zero, its dimension lit', () => {
    expect(playAt(10, { field: 'paperThickness' })).toMatchObject({ name: 'zero', focus: 'paperThickness' });
    expect(playAt(RUN_MS * 0.3 + 10, { pinned: 'zero' }).p).toBeCloseTo((RUN_MS * 0.3 + 10) / RUN_MS, 6);
  });
});
