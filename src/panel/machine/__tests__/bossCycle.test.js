import {
  BOSS_PARAMS, bossCode, bossGroups, bossOrder, bossReadout, bossScene, bossTimeline, bossWords, moveOf, moveOfPhase, playAt, positionAt, titleOf, usesAt,
} from '../bossCycle';
import { BOSS_R, legAt, toolAt } from '../bossMoves';
import { methodOf, stepsOf } from '../probe';
import { segmentsOf } from '../timeline';

jest.mock('../controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

const TEXTS = {
  bossSize: '30', clear: '10', depth: '5', maxZ: '15', ballDiameter: '2', retract: '2', fast: '100', slow: '20',
};

describe('the centre from outside cycle', () => {
  test('the top first, then two passes, each side of X and its middle, then Y; the zero last', () => {
    expect(bossOrder()).toEqual([
      'z', 'x1p', 'x1m', 'x1c', 'y1p', 'y1m', 'y1c', 'x2p', 'x2m', 'x2c', 'y2p', 'y2m', 'y2c', 'zero',
    ]);
    expect(bossOrder(1)).toEqual(['z', 'x1p', 'x1m', 'x1c', 'y1p', 'y1m', 'y1c', 'zero']);
  });

  test('every move is on the bar once, and every figure the server asks for in one group', () => {
    [1, 2].forEach((passes) => {
      const barred = bossGroups(passes).flatMap((group) => group.subs.flatMap((sub) => sub.moves));
      expect(barred).toEqual(bossOrder(passes));
    });
    const grouped = BOSS_PARAMS.flatMap((group) => (group.passes ? [...group.fields, 'holePasses'] : group.fields)).sort();
    expect(grouped).toEqual(['ballDiameter', 'bossSize', 'clear', 'depth', 'fast', 'holePasses', 'maxZ', 'retract', 'slow']);
  });

  test('a side: out over the top, down beside it, the touch moving in, up again', () => {
    const side = moveOf('x1p');
    expect(toolAt(side, 0).level).toBeGreaterThan(0);
    expect(toolAt(side, 0.3).at[0]).toBeGreaterThan(BOSS_R);
    expect(toolAt(side, 0.42).level).toBe(0);
    expect(toolAt(side, 0.62).at).toEqual(side.wall);
    expect(toolAt(side, 1).level).toBeGreaterThan(0);
    expect(['out', 'down', 'touch', 'up'].map((leg, i) => legAt([0.2, 0.35, 0.6, 0.95][i]).name)).toEqual(['out', 'down', 'touch', 'up']);
  });

  test('the touch is drawn where the ball meets the part, the top where the ball stands', () => {
    const at = bossScene('x1p', 0.64);
    expect(Math.hypot(...at.contact)).toBeCloseTo(BOSS_R);
    expect(bossScene('x1m', 0.1).touched).toHaveLength(1);
    expect(bossScene('z', 0.54).contact).toEqual(toolAt(moveOf('z'), 0.54).at);
    // The first pass ends on the centre.
    expect(toolAt(moveOf('y1c'), 1).at[0]).toBeCloseTo(0);
    expect(toolAt(moveOf('y1c'), 1).at[1]).toBeCloseTo(0);
  });

  test('a segment\'s end frame is its own move\'s', () => {
    [1, 2].forEach((passes) => {
      const items = bossTimeline(passes);
      segmentsOf(items).forEach((one) => {
        expect(playAt(one.b - 1, { passes }).name).toBe(one.name);
      });
    });
  });

  test('a figure being set loops the move it changes, its part lit', () => {
    expect(playAt(10, { field: 'clear' })).toMatchObject({ name: 'x1p', focus: 'clear' });
    expect(playAt(10, { field: 'maxZ' })).toMatchObject({ name: 'z', focus: 'dim' });
    expect(bossScene('x1p', 0.2, { texts: TEXTS, focus: 'clear' }).dims.find((one) => one.id === 'clear')).toMatchObject({ lit: true, text: '10' });
    expect(bossScene('x1p', 0.35, { texts: TEXTS }).tag).toMatchObject({ text: '↓ 5' });
  });

  test('says each leg in G-code as the server runs it, and lights its figures', () => {
    expect(bossCode('z', TEXTS)).toBe('G38.2 Z-15 F100');
    expect(bossCode('x1p', TEXTS, 1, 0.2)).toEqual(['probe.boss.outCode']);
    expect(bossCode('x1p', TEXTS, 1, 0.35)).toBe('G38.3 Z-7 F100');
    expect(bossCode('x1p', TEXTS, 1, 0.6)).toBe('G38.2 X-25 F100');
    expect(bossCode('y1m', TEXTS, 1, 0.6)).toBe('G38.2 Y+25 F100');
    expect(bossCode('x1p', TEXTS, 1, 0.95)).toBe('G0 Z+7');
    expect(bossCode('zero', TEXTS, 2)).toBe('G10 L20 P2 X0 Y0');
    expect(usesAt('x1p', 0.35)).toEqual(['depth', 'retract']);
    expect(usesAt('z', 0.5)).toEqual(['maxZ', 'fast', 'slow', 'retract']);
  });

  test('names each move, reads X and Y, plays the server\'s step with its words', () => {
    expect(titleOf('y2m')).toEqual(['probe.boss.move.side', { pass: 2, axis: 'Y−' }]);
    expect(bossReadout('zero').after).toBe(true);
    expect(moveOfPhase('z-fast')).toBe('z');
    expect(moveOfPhase('x1a-out')).toBe('x1p');
    expect(moveOfPhase('y2b-up')).toBe('y2m');
    expect(moveOfPhase('x2-centre')).toBe('x2c');
    expect(bossWords('z-fast')).toEqual(['probe.boss.phase.top', { axis: 'Z' }]);
    expect(bossWords('x1a-down')).toEqual(['probe.phase.down', { axis: 'X+' }]);
    expect(bossWords('x1b-up')).toEqual(['probe.boss.phase.up', { axis: 'X−' }]);
    expect(bossWords('y1b')).toEqual(['probe.phase.touch', { axis: 'Y−' }]);
  });

  test('comes into place across, then down to just over the top', () => {
    expect(positionAt(0).level).toBe(2);
    expect(positionAt(5900).level).toBe(1);
  });
});

describe('the centre from outside\'s steps', () => {
  test('through the probe, nothing chosen first', () => {
    expect(stepsOf(methodOf('boss')).map((s) => s.id)).toEqual(['method', 'prepare', 'wire', 'position', 'measure', 'result']);
  });
});
