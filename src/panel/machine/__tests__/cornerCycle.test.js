import {
  signedFor,
  BEFORE_MM, CORNER_GROUPS, cornerTimeline, CORNER_ORDER, CORNER_PARAMS, HOLD_MS, LOOP_HOLD_MS, motionEnd, SPAN_MS, cornerCode, cornerReadout, cornerSides, legAt, moveOf, moveOfPhase, playAt, positionAt, positionOf, tipOf,
} from '../cornerCycle';
import { methodOf, stepBeside, stepsOf } from '../probe';
import { segmentsOf } from '../timeline';

jest.mock('../controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

const TEXTS = {
  cornerThickness: '10', wallX: '10', wallY: '10', toolDiameter: '6', clear: '10', depth: '5', maxZ: '20', maxXY: '15', retract: '5', fast: '50', slow: '15', lift: '20',
};

describe('the L plate cycle (probe proposal)', () => {
  test('plays Z, then each wall, then the zero and the lift, each move for its span', () => {
    const at = [];
    let ms = 10;
    CORNER_ORDER.forEach((name) => {
      at.push(playAt(ms).name);
      if (moveOf(name).legs) {
        ms += 1000 * moveOf(name).legs.length + HOLD_MS;
      } else {
        // The zero, seen from two sides, plays three times as long.
        ms += moveOf(name).walls ? SPAN_MS * 3 : SPAN_MS;
      }
    });
    expect(at).toEqual(CORNER_ORDER);
    expect(playAt(ms).name).toBe('zFast');
  });

  test('gives a set-up a second a leg, and knows the leg under way', () => {
    const set = moveOf('xSet');
    expect(playAt(0, { pinned: 'xSet' }).span).toBe(3000 + LOOP_HOLD_MS);
    expect(playAt(0).span).toBe(SPAN_MS);
    expect(legAt(set, 0.1)).toBe(0);
    expect(legAt(set, 0.5)).toBe(1);
    expect(legAt(set, 0.9)).toBe(2);
  });

  test('the X set-up rises off the plate, goes out past the wall and comes down beside it', () => {
    const set = moveOf('xSet');
    const [, , start] = positionOf(set.frames, 0);
    const [x, , up] = positionOf(set.frames, 0.24);
    const [outX, , down] = positionOf(set.frames, 1);
    expect(tipOf(start)).toBe(146);
    expect(up).toBe(1);
    expect(outX).toBeLessThan(x);
    expect(tipOf(down)).toBeGreaterThan(170);
  });

  test('says each move in G-code as the server runs it', () => {
    expect(cornerCode('zFast', 0.5, TEXTS).parts).toEqual(['G38.2 Z-20 F50']);
    expect(cornerCode('xSet', 0.5, TEXTS)).toEqual({ parts: ['G0 X-10'], now: -1, leg: 'out' });
    expect(cornerCode('xSet', 0.9, TEXTS)).toMatchObject({ parts: ['G38.3 Z-10 F50'], leg: 'down' });
    expect(cornerCode('xSlow', 0.5, TEXTS).parts).toEqual(['G38.2 X+10 F15']);
    expect(cornerCode('lift', 0.5, TEXTS)).toMatchObject({ parts: ['G0 Z+25'], leg: 'lift' });
    expect(cornerCode('lift', 0.9, TEXTS)).toMatchObject({ parts: ['G0 X0 Y0'], leg: 'corner' });
    expect(cornerCode('lift', 0.1, TEXTS)).toMatchObject({ parts: ['G0 Y-5'], leg: 'off' });
    // Turned for the corner, as the drawing is: out past a right corner's wall is X+, its touch X−.
    expect(cornerCode('xSet', 0.5, TEXTS, 1, 'back-right').parts).toEqual(['G0 X+10']);
    expect(cornerCode('xSlow', 0.5, TEXTS, 1, 'front-right').parts).toEqual(['G38.2 X-10 F15']);
    expect(cornerCode('lift', 0.1, TEXTS, 1, 'back-left').parts).toEqual(['G0 Y+5']);
    expect(cornerCode('lift', 0.9, TEXTS, 1, 'back-right').parts).toEqual(['G0 X0 Y0']);
    expect(signedFor('front-right')('X− 20 mm')).toBe('X+ 20 mm');
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
    expect(spanIn(cornerTimeline({ apart: true }), 'zSlow')).toBe(SPAN_MS - HOLD_MS + LOOP_HOLD_MS);
    expect(spanIn(cornerTimeline(), 'zSlow')).toBe(SPAN_MS);
    expect(spanIn(cornerTimeline({ apart: true }), 'zBack')).toBe(SPAN_MS);
  });

  test('the bar segments: a set-up legs, the zero two views on a phone, one for any other move', () => {
    const segments = segmentsOf(cornerTimeline({ apart: true }));
    expect(segments.filter((one) => one.name === 'xSet')).toHaveLength(3);
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
    expect(grouped).toEqual(['clear', 'cornerThickness', 'depth', 'fast', 'lift', 'maxXY', 'maxZ', 'retract', 'slow', 'toolDiameter', 'wallX', 'wallY']);
  });

  test('plays the move of the server\'s step on the measurement screen', () => {
    expect(moveOfPhase('z-fast')).toBe('zFast');
    expect(moveOfPhase('x-down')).toBe('xSet');
    expect(moveOfPhase('y-settle')).toBe('yBack');
    expect(moveOfPhase('lift')).toBe('lift');
    expect(moveOfPhase('corner')).toBe('lift');
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
