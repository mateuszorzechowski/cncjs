import {
  HOLE_PARAMS, HOLE_R, holeCode, holeGroups, holeOrder, holeReadout, holeScene, holeTimeline, holeWords, moveOf, moveOfPhase, playAt, positionAt, titleOf, toolAt,
} from '../holeCycle';
import { methodOf, phaseWords, stepsOf } from '../probe';
import { segmentsOf } from '../timeline';

jest.mock('../controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

const TEXTS = {
  holeSize: '20', ballDiameter: '6', retract: '2', fast: '100', slow: '20',
};

describe('the hole centre cycle', () => {
  test('two passes, each across X and then Y, each pair then its middle; the zero last', () => {
    expect(holeOrder()).toEqual([
      'x1p', 'x1m', 'x1c', 'y1p', 'y1m', 'y1c', 'x2p', 'x2m', 'x2c', 'y2p', 'y2m', 'y2c', 'zero',
    ]);
  });

  test('one pass: the first half and the zero, which the first pass already ends on', () => {
    expect(holeOrder(1)).toEqual(['x1p', 'x1m', 'x1c', 'y1p', 'y1m', 'y1c', 'zero']);
    expect(toolAt(moveOf('y1c'), 1)).toEqual(moveOf('zero').from);
    expect(holeGroups(1).map((group) => group.id)).toEqual(['pass1', 'zero']);
    expect(playAt(holeTimeline(1).find((item) => item.name === 'zero').start + 10, { passes: 1 }).name).toBe('zero');
  });

  test('every move is on the bar once, and every figure the server asks for in one group', () => {
    [1, 2].forEach((passes) => {
      const barred = holeGroups(passes).flatMap((group) => group.subs.flatMap((sub) => sub.moves));
      expect(barred).toEqual(holeOrder(passes));
    });
    // The passes are a switch at the measuring group's head.
    const grouped = HOLE_PARAMS.flatMap((group) => (group.passes ? [...group.fields, 'holePasses'] : group.fields)).sort();
    expect(grouped).toEqual(['ballDiameter', 'fast', 'holePasses', 'holeSize', 'retract', 'slow']);
  });

  test('a touch ends with the tool off the wall, a way to the middle at the middle of its pair', () => {
    const touch = moveOf('x1p');
    expect(toolAt(touch, 0.4)).toEqual(touch.wall);
    expect(toolAt(touch, 1)[0]).toBeLessThan(touch.wall[0]);
    const middle = moveOf('x1c');
    const [a, b] = middle.touches;
    expect(toolAt(middle, 1)[0]).toBeCloseTo((a[0] + b[0]) / 2);
    // The second pass, from the first's centre, finds it again.
    expect(toolAt(moveOf('y2c'), 1)[0]).toBeCloseTo(0);
    expect(toolAt(moveOf('y2c'), 1)[1]).toBeCloseTo(0);
  });

  test('the touch is drawn where the tool\'s edge meets the wall, and stays for the pass', () => {
    const at = holeScene('x1p', 0.42);
    expect(Math.hypot(...at.contact)).toBeCloseTo(HOLE_R);
    expect(holeScene('x1m', 0.2).touched).toHaveLength(1);
    expect(holeScene('x1c', 0.2).touched).toHaveLength(2);
    // A new pass starts with none.
    expect(holeScene('x2p', 0.2).touched).toEqual([]);
  });

  test('a segment\'s end frame is its own move\'s: the touch back off, the middle reached, the zero shown', () => {
    const items = holeTimeline();
    segmentsOf(items).forEach((one) => {
      const item = items.find((it) => it.name === one.name);
      const frame = playAt(one.b - 1);
      expect(frame.name).toBe(one.name);
      expect(one.b).toBeLessThanOrEqual(item.start + item.span);
    });
    expect(holeScene('zero', moveOf('zero').end).zero).toBe(1);
  });

  test('a figure being set loops the move it changes, its part lit', () => {
    expect(playAt(10, { field: 'holeSize' })).toMatchObject({ name: 'x1p', focus: 'dim' });
    expect(playAt(10, { field: 'fast' })).toMatchObject({ name: 'x1p', focus: 'feed' });
    expect(playAt(10, { field: 'ballDiameter' })).toMatchObject({ name: 'zero', focus: 'dim' });
    expect(holeScene('x1p', 0.3, { texts: TEXTS, focus: 'dim' }).limit).toMatchObject({ lit: true, text: '20' });
  });

  test('says each move in G-code as the server runs it', () => {
    expect(holeCode('x1p', TEXTS)).toBe('G38.2 X+20 F100');
    // The slow touch: twice the way back, its own feed — drawn too (review note, 2026-10-01).
    expect(holeCode('x1p', TEXTS, 1, 0.85)).toBe('G38.2 X+4 F20');
    expect(holeScene('x1p', 0.84, { texts: TEXTS }).motion).toMatchObject({ kind: 'probe', feed: '20' });
    expect(holeCode('y2m', TEXTS)).toBe('G38.2 Y-20 F100');
    expect(holeCode('x1c', TEXTS)).toEqual(['probe.hole.centreCode']);
    expect(holeCode('zero', TEXTS, 2)).toBe('G10 L20 P2 X0 Y0');
  });

  test('names each move with its pass and way', () => {
    expect(titleOf('y2m')).toEqual(['probe.hole.move.touch', { pass: 2, axis: 'Y−' }]);
    expect(titleOf('x1c')).toEqual(['probe.hole.move.centre', { pass: 1, axis: 'X' }]);
  });

  test('reads X and Y against the old zero, then 0 0', () => {
    expect(holeReadout('y2c').after).toBe(false);
    expect(holeReadout('zero')).toEqual({ axes: [['x', 0], ['y', 0]], after: true });
  });

  test('plays the move of the server\'s step on the measurement screen, with its words', () => {
    expect(moveOfPhase('x1a-fast')).toBe('x1p');
    expect(moveOfPhase('y2b')).toBe('y2m');
    expect(moveOfPhase('x2-centre')).toBe('x2c');
    expect(holeWords('x1a-fast')).toEqual(['probe.hole.phase.fast', { axis: 'X+' }]);
    expect(holeWords('y1b-settle')).toEqual(['probe.phase.settle', { axis: 'Y−' }]);
    expect(holeWords('y1b')).toEqual(['probe.phase.touch', { axis: 'Y−' }]);
    expect(holeWords('x1-centre')).toEqual(['probe.hole.phase.centre', { axis: 'X' }]);
    // A failure names the axis, not the step's tag.
    expect(phaseWords('y2b-fast').axis).toBe('Y');
    expect(phaseWords('z-fast').axis).toBe('Z');
  });

  test('comes into place across, then down into the hole', () => {
    expect(positionAt(0).level).toBe(1);
    expect(positionAt(5900).level).toBe(0);
  });
});

describe('the hole\'s steps', () => {
  test('through the probe, nothing chosen first', () => {
    expect(stepsOf(methodOf('hole')).map((s) => s.id)).toEqual(['method', 'prepare', 'wire', 'position', 'measure', 'result']);
  });
});
