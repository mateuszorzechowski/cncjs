import {
  PAPER_ORDER, RUN_MS, SPAN_MS, feelAt, paperCode, paperReadout, paperScene, playAt, scriptAt,
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
const feel = (name, p) => {
  const { tag, tone } = paperScene(name, p);
  return [tag, tone];
};

describe('the paper cycle', () => {
  test('down past the drag to standing, back a step at a time to the drag, "here", the zero — no lift', () => {
    expect(PAPER_ORDER.map((_, i) => playAt(i * SPAN_MS + 10).name)).toEqual(['coarse', 'fine', 'over', 'back', 'here', 'zero']);
  });

  test('the feel is the tool\'s height over the sheet: free, drags, resists, stands', () => {
    expect([1, 0.5, 0, -0.5].map(feelAt)).toEqual(['free', 'drag', 'resist', 'stuck']);
  });

  test('coloured by the feel: the drag green, resisting amber, standing red', () => {
    expect(feel('fine', 0.5)).toEqual([null, null]);
    expect(feel('over', 0.2)).toEqual(['probe.paper.drag', 'grn']);
    expect(feel('over', 0.5)).toEqual(['probe.paper.resist', 'amb']);
    expect(feel('over', 0.8)).toEqual(['probe.paper.stuck', 'red']);
    expect(feel('back', 0.3)).toEqual(['probe.paper.resist', 'amb']);
    expect(feel('back', 0.6)).toEqual(['probe.paper.drag', 'grn']);
    expect(feel('here', 0.5)).toEqual(['probe.paper.ok', 'grn']);
    // The zero written at the drag; its figures say it, not a tag.
    expect(feel('zero', 0.5)).toEqual([null, 'grn']);
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
      // Slack comes only from the hand: never more of it in a frame than the hand moved.
      let moved = 0;
      // Over the window the simulation stepped, 10 ms at a time.
      for (let ms = Math.floor(was.ms / 10) * 10; ms < Math.floor(now.ms / 10) * 10; ms += 1) {
        moved += Math.abs(scriptAt(ms + 1).hand - scriptAt(ms).hand);
      }
      expect(Math.abs(now.state.slack - was.state.slack)).toBeLessThanOrEqual(moved + 0.1);
    }
  });

  test('free, the whole sheet goes with the hand: no slack, its far end swings too', () => {
    const coarse = during('coarse', 0, 1);
    coarse.forEach((f) => expect(f.state.slack).toBeCloseTo(0, 6));
    const ends = coarse.map((f) => f.shape.end);
    expect(Math.max(...ends) - Math.min(...ends)).toBeGreaterThan(8);
  });

  test('dragging: pushed, it folds by the hand; pulled, it goes straight and slides', () => {
    const drag = during('over', 0.12, 0.39);
    const pushed = drag.filter((f) => f.state.slack > 0.3);
    expect(pushed.length).toBeGreaterThan(2);
    expect(drag.some((f) => f.state.slack < 0.01)).toBe(true);
    pushed.forEach((f) => {
      const hand = f.shape.points[0][0];
      expect(f.peak[0] - hand).toBeLessThan((TOOL_X - hand) / 2);
    });
  });

  test('standing, nothing slides and the pushed sheet bows into one arch', () => {
    const stuck = during('over', 0.72, 1);
    const ends = stuck.map((f) => f.shape.end);
    expect(Math.max(...ends) - Math.min(...ends)).toBeLessThan(1e-9);
    const bowed = stuck.filter((f) => f.state.slack > 1);
    expect(bowed.length).toBeGreaterThan(3);
    bowed.slice(-3).forEach((f) => {
      const hand = f.shape.points[0][0];
      expect(Math.abs(f.peak[0] - (hand + TOOL_X) / 2)).toBeLessThan((TOOL_X - hand) * 0.25);
    });
  });

  test('backed off, the slack comes out; at "here" the hand stops and the zero is written with it still', () => {
    const slackAt = (name, p) => during(name, p - 0.02, p + 0.02)[0].state.slack;
    expect(slackAt('back', 0.72)).toBeLessThan(slackAt('over', 0.98));
    const hands = during('here', 0.42, 1).concat(during('zero', 0, 1)).map((f) => f.state.hand);
    expect(Math.max(...hands) - Math.min(...hands)).toBeLessThan(0.05);
  });

  test('the tool comes down a step at a time, 1 mm then 0.1 mm, past the drag and back to it', () => {
    expect(paperScene('coarse', 0).gap).toBe(60);
    expect(paperScene('coarse', 1).gap).toBe(10);
    expect(paperScene('fine', 1).gap).toBe(1);
    expect(paperScene('over', 1).gap).toBe(-0.5);
    expect(paperScene('back', 1).gap).toBe(0.5);
    expect(paperScene('zero', 1).gap).toBe(0.5);
  });

  test('says each move as its line, the zero with the sheet and on a side the radius', () => {
    const texts = { paperThickness: '0.1', toolDiameter: '6' };
    expect(paperCode('coarse', 'z', texts)).toBe('$J=G91 Z-1');
    expect(paperCode('over', 'z', texts)).toBe('$J=G91 Z-0.1');
    expect(paperCode('back', 'z', texts)).toBe('$J=G91 Z0.1');
    expect(paperCode('fine', 'x-left', texts)).toBe('$J=G91 X0.1');
    expect(paperCode('back', 'x-left', texts)).toBe('$J=G91 X-0.1');
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
