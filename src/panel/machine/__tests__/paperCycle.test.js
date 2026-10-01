import {
  FEEL_ORDER, PAPER_ORDER, RUN_MS, SPAN_MS, feelAt, feelLoopAt, paperCode, paperReadout, paperScene, playAt, scriptAt,
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
  test('each feel a stage of its own: down through drags, resists, stands; back to resists, to drags — "here"; the zero', () => {
    expect(PAPER_ORDER.map((_, i) => playAt(i * SPAN_MS + 10).name)).toEqual(['coarse', 'fine', 'drag', 'resist', 'stuck', 'back', 'here', 'zero', 'lift']);
  });

  test('after the zero, off the surface by the lift: a rapid, the sheet let go and lying flat', () => {
    expect(paperScene('lift', 0.5).motion).toMatchObject({ kind: 'rapid' });
    expect(paperScene('lift', 1).tone).toBeNull();
    expect(paperScene('lift', 1).zero).toBe(1);
    during('lift', 0.9, 1).forEach((f) => expect(f.state.slack).toBeLessThan(0.05));
    const texts = { paperLift: '2' };
    expect(paperCode('lift', 'z', texts)).toBe('G0 Z+2');
    expect(paperCode('lift', 'x-left', texts)).toBe('G0 X-2');
  });

  test('each step is one press of a jog key: lit just after it, the way it goes', () => {
    expect(paperScene('resist', 0.16).click).toEqual({ way: 'Z−', step: 'probe.paper.mm01', on: true });
    expect(paperScene('resist', 0.5).click.on).toBe(false);
    expect(paperScene('back', 0.16).click.way).toBe('Z+');
    expect(paperScene('coarse', 0.5, { edge: 'x-left' }).click).toMatchObject({ way: 'X+', step: 'probe.paper.mm1' });
    expect(paperScene('zero', 0.5).click).toBeNull();
    expect(paperScene('lift', 0.5).click).toBeNull();
  });

  test('the feel is the tool\'s height over the sheet: free, drags, resists, stands', () => {
    expect([1, 0.5, 0, -0.5].map(feelAt)).toEqual(['free', 'drag', 'resist', 'stuck']);
  });

  test('coloured by the feel: the drag green, resisting amber, standing red', () => {
    expect(feel('fine', 0.5)).toEqual([null, null]);
    expect(feel('drag', 0.5)).toEqual(['probe.paper.drag', 'grn']);
    expect(feel('resist', 0.5)).toEqual(['probe.paper.resist', 'amb']);
    expect(feel('stuck', 0.5)).toEqual(['probe.paper.stuck', 'red']);
    expect(feel('back', 0.5)).toEqual(['probe.paper.resist', 'amb']);
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

  test('dragging, the sheet still slides and only ripples; resisting, it hardly slides and piles up in folds', () => {
    const range = (list) => Math.max(...list) - Math.min(...list);
    const drag = during('drag', 0.3, 1);
    const resist = during('resist', 0.3, 1);
    expect(range(drag.map((f) => f.shape.end))).toBeGreaterThan(3);
    expect(range(resist.map((f) => f.shape.end))).toBeLessThan(0.5);
    const highest = (list) => Math.max(...list.map((f) => f.peak[1]));
    expect(highest(resist)).toBeGreaterThan(2 * highest(drag));
    // Pushed, the folds stand nearer the hand than the tool.
    resist.filter((f) => f.state.slack > 0.5).forEach((f) => {
      const hand = f.shape.points[0][0];
      expect(f.peak[0] - hand).toBeLessThan((TOOL_X - hand) / 2);
    });
  });

  test('standing, nothing slides and the pushed sheet bows into one arch', () => {
    const stuck = during('stuck', 0.3, 1);
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
    expect(slackAt('here', 0.4)).toBeLessThan(slackAt('stuck', 0.98));
    const hands = during('here', 0.86, 1).concat(during('zero', 0, 1)).map((f) => f.state.hand);
    expect(Math.max(...hands) - Math.min(...hands)).toBeLessThan(0.05);
  });

  test('the tool comes down a step at a time, 1 mm then 0.1 mm, past the drag and back to it', () => {
    expect(paperScene('coarse', 0).gap).toBe(60);
    expect(paperScene('coarse', 1).gap).toBe(10);
    expect(paperScene('fine', 1).gap).toBe(1);
    expect(paperScene('drag', 1).gap).toBe(0.5);
    expect(paperScene('resist', 1).gap).toBe(0);
    expect(paperScene('stuck', 1).gap).toBe(-0.5);
    expect(paperScene('back', 1).gap).toBe(0);
    expect(paperScene('here', 1).gap).toBe(0.5);
    expect(paperScene('zero', 1).gap).toBe(0.5);
  });

  test('says each move as its line, the zero with the sheet and on a side the radius', () => {
    const texts = { paperThickness: '0.1', toolDiameter: '6' };
    expect(paperCode('coarse', 'z', texts)).toBe('$J=G91 Z-1');
    expect(paperCode('resist', 'z', texts)).toBe('$J=G91 Z-0.1');
    expect(paperCode('back', 'z', texts)).toBe('$J=G91 Z0.1');
    expect(paperCode('fine', 'x-left', texts)).toBe('$J=G91 X0.1');
    expect(paperCode('back', 'x-left', texts)).toBe('$J=G91 X-0.1');
    expect(paperCode('here', 'z', texts)).toBe('$J=G91 Z0.1');
    expect(paperCode('zero', 'z', texts, 2)).toBe('G10 L20 P2 Z0.1');
    expect(paperCode('zero', 'x-left', texts)).toBe('G10 L20 P1 X-3.1');
    expect(paperCode('zero', 'y-back', texts)).toBe('G10 L20 P1 Y3.1');
  });

  test('on the top, Z0 on the table: the work over it; a side keeps no surface', () => {
    const texts = { paperThickness: '0.1', toolDiameter: '6', stockThickness: '18' };
    const table = { on: 'work', z0: 'table' };
    expect(paperCode('zero', 'z', texts, 1, table)).toBe('G10 L20 P1 Z18.1');
    expect(paperCode('zero', 'x-left', texts, 1, table)).toBe('G10 L20 P1 X-3.1');
    expect(paperReadout('zero', 'z', { paperThickness: 0.1, toolDiameter: 6, stockThickness: 18 }, table).value).toBeCloseTo(18.1, 6);
    expect(paperScene('zero', 1, { edge: 'x-left', surface: table }).surface).toEqual({ on: 'work', z0: 'top' });
  });

  test('reads the axis against the old zero, then the offset, held through the moves', () => {
    const mm = { paperThickness: 0.1, toolDiameter: 6 };
    expect(paperReadout('fine', 'z', mm)).toEqual({ axis: 'z', value: 12.34, after: false });
    expect(paperReadout('zero', 'x-right', mm)).toEqual({ axis: 'x', value: 3.1, after: true });
  });

  test('the measuring step loop plays the feel alone: drags, resists, stands, back, here', () => {
    expect(FEEL_ORDER.map((_, i) => feelLoopAt(i * SPAN_MS + 10).name)).toEqual(['drag', 'resist', 'stuck', 'back', 'here']);
    expect(feelLoopAt(FEEL_ORDER.length * SPAN_MS + 10).name).toBe('drag');
  });

  test('a figure being set loops the zero, its dimension lit', () => {
    expect(playAt(10, { field: 'paperThickness' })).toMatchObject({ name: 'zero', focus: 'paperThickness' });
    expect(playAt(RUN_MS * 0.3 + 10, { pinned: 'zero' }).p).toBeCloseTo((RUN_MS * 0.3 + 10) / RUN_MS, 6);
  });
});
