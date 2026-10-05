import {
  explainOf, signedFor, sumOf,
  BEFORE_MM, CORNER_GROUPS, cornerTimeline, CORNER_ORDER, CORNER_PARAMS, HOLD_MS, LOOP_HOLD_MS, motionEnd, SPAN_MS, cornerCode, cornerReadout, cornerSides, moveOf, moveOfPhase, playAt, positionAt, positionOf, tipOf,
} from '../cornerCycle';
import { methodOf, stepBeside, stepsOf } from '../probe';
import { segmentsOf } from '../timeline';

jest.mock('../../../machine/controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

const TEXTS = {
  cornerThickness: '10', wallX: '10', wallY: '10', toolDiameter: '6', travel: '10', depth: '5', maxZ: '20', maxXY: '15', retract: '5', fast: '50', slow: '15', lift: '20',
};

describe('the L plate cycle (probe proposal)', () => {
  test('plays Z, then each wall, then the zero and the lift, each move for its span', () => {
    const at = [];
    let ms = 10;
    CORNER_ORDER.forEach((name) => {
      at.push(playAt(ms).name);
      if (moveOf(name).plane) {
        ms += 1000 + HOLD_MS;
      } else {
        // The zero, seen from two sides, plays three times as long.
        ms += moveOf(name).walls ? SPAN_MS * 3 : SPAN_MS;
      }
    });
    expect(at).toEqual(CORNER_ORDER);
    expect(playAt(ms).name).toBe('zFast');
  });

  test('a set-up and the lift are a move a line of G-code, each a second', () => {
    expect(playAt(0, { pinned: 'xOut' }).span).toBe(1000 * 0.9 + LOOP_HOLD_MS);
    expect(playAt(0).span).toBe(SPAN_MS);
    ['xOut', 'xDown', 'yUp', 'yOver', 'yOut', 'yDown', 'lift', 'corner'].forEach((name) => {
      expect(cornerCode(name, TEXTS).parts.length).toBeLessThanOrEqual(1);
    });
  });

  test('the X set-up starts off the plate, goes out past the wall and comes down beside it', () => {
    const [x, , start] = positionOf(moveOf('xOut').frames, 0);
    const [outX, , up] = positionOf(moveOf('xOut').frames, 1);
    const [downX, , down] = positionOf(moveOf('xDown').frames, 1);
    expect(tipOf(start)).toBe(134);
    expect(up).toBe(1);
    expect(outX).toBeLessThan(x);
    expect(downX).toBe(outX);
    // The depth under the plate's top, still over the work's (170), as far under as a back-off is over.
    expect(tipOf(down)).toBe(158);
    expect(tipOf(down)).toBeLessThan(170);
  });

  test('says each move in G-code as the server runs it', () => {
    expect(cornerCode('zFast', TEXTS).parts).toEqual(['G38.2 Z-20 F50']);
    // Each set-up move lights the figures its way is: sideways from the start, the travel.
    expect(cornerCode('xOut', TEXTS)).toEqual({ parts: ['G0 X-10'], now: -1, uses: ['travel'] });
    expect(cornerCode('xDown', TEXTS)).toEqual({ parts: ['G38.3 Z-10 F50'], now: -1, uses: ['depth', 'retract'] });
    expect(cornerCode('yUp', TEXTS).parts).toEqual(['G0 Z+10']);
    expect(cornerCode('yOut', TEXTS).parts).toEqual(['G0 Y-10']);
    expect(cornerCode('xSlow', TEXTS).parts).toEqual(['G38.2 X+10 F15']);
    expect(cornerCode('lift', TEXTS).parts).toEqual(['G0 Z+25']);
    expect(cornerCode('corner', TEXTS).parts).toEqual(['G0 X0 Y0']);
    expect(cornerCode('yOff', TEXTS).parts).toEqual(['G0 Y-5']);
    // Turned for the corner, as the drawing is: out past a right corner's wall is X+, its touch X−.
    expect(cornerCode('xOut', TEXTS, 1, 'back-right').parts).toEqual(['G0 X+10']);
    expect(cornerCode('xSlow', TEXTS, 1, 'front-right').parts).toEqual(['G38.2 X-10 F15']);
    expect(cornerCode('yOff', TEXTS, 1, 'back-left').parts).toEqual(['G0 Y+5']);
    expect(cornerCode('corner', TEXTS, 1, 'back-right').parts).toEqual(['G0 X0 Y0']);
    // Back over where Z was touched: no numbers to show, so no line made up.
    expect(cornerCode('yOver', TEXTS).parts).toEqual([]);
    expect(signedFor('front-right')('G0 X-20')).toBe('G0 X+20');
  });

  test('a Z way of two figures is said as their sum, and where it comes from (rule 1)', () => {
    expect(sumOf(moveOf('xDown'), TEXTS)).toBe('10');
    expect(explainOf(moveOf('yUp'), TEXTS)).toEqual(['probe.sum.retractDepth', { sum: '10', retract: '5', depth: '5' }]);
    expect(explainOf(moveOf('lift'), TEXTS)).toEqual(['probe.sum.depthLift', { sum: '25', depth: '5', lift: '20' }]);
    expect(explainOf(moveOf('xOut'), TEXTS)).toBeNull();
  });

  test('a figure being set loops the move it changes, over the part that shows it, held longer', () => {
    expect(playAt(10, { field: 'toolDiameter' })).toMatchObject({ name: 'xSlow', focus: 'tool' });
    expect(motionEnd('zFast')).toBe(0.75);
    expect(motionEnd('xBack')).toBe(0.6);
    expect(playAt(10, { field: 'depth' })).toMatchObject({ name: 'depth', focus: 'dim' });
    const wall = playAt(10, { field: 'wallX' });
    expect(wall).toMatchObject({ name: 'zero', focus: 'wallX' });
    expect(wall.p).toBeGreaterThanOrEqual(0.6);
  });

  test('a move looped alone ends, for a pause, inside its loop', () => {
    CORNER_ORDER.forEach((name) => {
      const { run, span } = playAt(0, { pinned: name });
      expect(run).toBeLessThan(span);
    });
  });

  test('on a phone, a move before the view turns holds as long as a loop', () => {
    const spanIn = (items, name) => items.find((item) => item.name === name).span;
    expect(spanIn(cornerTimeline({ apart: true }), 'zOff')).toBe(SPAN_MS - HOLD_MS + LOOP_HOLD_MS);
    expect(spanIn(cornerTimeline(), 'zSlow')).toBe(SPAN_MS);
    expect(spanIn(cornerTimeline({ apart: true }), 'zBack')).toBe(SPAN_MS);
  });

  test('the bar segments: the zero two views on a phone, one for any other move', () => {
    const segments = segmentsOf(cornerTimeline({ apart: true }));
    expect(segments.filter((one) => one.name === 'xOut')).toHaveLength(1);
    expect(segments.filter((one) => one.name === 'zero')).toHaveLength(2);
    expect(segmentsOf(cornerTimeline()).filter((one) => one.name === 'zero')).toHaveLength(1);
  });

  test('reads the example against the old zero, then a radius and a wall off the corner', () => {
    const mm = {
      toolDiameter: 6, wallX: 10, wallY: 10, cornerThickness: 10,
    };
    expect(cornerReadout('xFast', 'front-left', mm)).toEqual({ ...BEFORE_MM, after: false });
    expect(cornerReadout('zero', 'front-left', mm)).toEqual({
      x: -13, y: -13, z: 10, after: true,
    });
    expect(cornerReadout('lift', 'back-right', mm)).toMatchObject({ x: 13, y: 13 });
  });

  test('mirrors the right corners across and the back ones top to bottom', () => {
    expect(cornerSides('front-left')).toMatchObject({ flipX: false, flipY: false, dirs: ['X+', 'Y+'] });
    expect(cornerSides('back-right')).toMatchObject({ flipX: true, flipY: true, dirs: ['X−', 'Y−'] });
  });

  test('every move is on the bar once, and every figure in one group', () => {
    const barred = CORNER_GROUPS.flatMap((group) => group.subs.flatMap((sub) => sub.moves));
    expect(barred).toEqual(CORNER_ORDER);
    const grouped = CORNER_PARAMS.flatMap((group) => group.fields).sort();
    expect(grouped).toEqual(['cornerThickness', 'depth', 'fast', 'lift', 'maxXY', 'maxZ', 'retract', 'slow', 'toolDiameter', 'travel', 'wallX', 'wallY']);
  });

  test('plays the move of the server\'s step on the measurement screen', () => {
    expect(moveOfPhase('z-fast')).toBe('zFast');
    expect(moveOfPhase('x-out')).toBe('xOut');
    expect(moveOfPhase('x-down')).toBe('xDown');
    expect(moveOfPhase('x-up')).toBe('yUp');
    expect(moveOfPhase('x-return')).toBe('yOver');
    expect(moveOfPhase('y-out')).toBe('yOut');
    expect(moveOfPhase('y-down')).toBe('yDown');
    expect(moveOfPhase('y-settle')).toBe('yBack');
    expect(moveOfPhase('lift')).toBe('lift');
    expect(moveOfPhase('corner')).toBe('corner');
    expect(moveOfPhase('unknown')).toBe('zFast');
  });

  test('comes into place across and down, then holds over the plate', () => {
    expect(positionAt(0)).toMatchObject({ over: false });
    expect(positionAt(6800)).toMatchObject({ over: true, level: 1 });
  });
});

describe('the corner\'s steps', () => {
  test('the corner is chosen first, on a step of its own, named for it', () => {
    const corner = methodOf('corner');

    expect(stepsOf(corner).map((s) => s.id)).toEqual(['method', 'choose', 'prepare', 'wire', 'position', 'measure', 'result']);
    expect(stepsOf(corner)[1].key).toBe('probe.step.corner');
    expect(stepBeside(corner, 'method', 1)).toBe('choose');
    expect(stepBeside(corner, 'prepare', -1)).toBe('choose');
  });
});
