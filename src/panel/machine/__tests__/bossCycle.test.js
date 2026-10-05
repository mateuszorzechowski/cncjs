import { bossCycleOf } from '../bossCycle';
import { BOSS_R, toolAt } from '../bossMoves';
import { segmentsOf } from '../timeline';

jest.mock('../controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

const BOSS_CYCLE = bossCycleOf();
const {
  params: BOSS_PARAMS, code: bossCode, groups: bossGroups, order: bossOrder, scene: bossScene, timeline: bossTimeline, words: bossWords, moveOf, moveOfPhase, playAt, positionAt, titleOf, usesAt,
} = BOSS_CYCLE;

const TEXTS = {
  bossSize: '30', clear: '10', depth: '5', maxZ: '15', ballDiameter: '2', retract: '2', fast: '100', slow: '20',
};

const STEPS = ['Out', 'Down', 'Fast', 'Back', 'Slow', 'Off', 'Up'];
const sideSteps = (side) => STEPS.map((step) => `${side}${step}`);

describe('a part measured from outside', () => {
  test('the top\'s steps as the corner\'s, then each side\'s, the middle after each pair, the size last', () => {
    expect(bossOrder(1)).toEqual([
      'zFast', 'zBack', 'zSlow', 'zOff', ...sideSteps('x1p'), ...sideSteps('x1m'), 'x1c', ...sideSteps('y1p'), ...sideSteps('y1m'), 'y1c', 'zero',
    ]);
    expect(bossOrder()).toHaveLength(4 + 2 * 30 + 1);
  });

  test('the bar: Z searched and measured, a stage per axis and pass, every move once; a set-up two moves', () => {
    [1, 2].forEach((passes) => {
      const barred = bossGroups(passes).flatMap((group) => group.subs.flatMap((sub) => sub.moves));
      expect(barred).toEqual(bossOrder(passes));
    });
    expect(bossGroups(1).map((group) => group.name || group.key)).toEqual(['Z', 'X', 'Y', 'probe.bar.size']);
    expect(segmentsOf(bossTimeline(1)).filter((one) => one.name === 'x1pOut')).toHaveLength(1);
    expect(segmentsOf(bossTimeline(1)).filter((one) => one.name === 'x1pDown')).toHaveLength(1);
    const grouped = BOSS_PARAMS.flatMap((group) => (group.passes ? [...group.fields, 'holePasses', 'repeats'] : group.fields)).sort();
    expect(grouped).toEqual(['ballDiameter', 'bossSize', 'clear', 'depth', 'fast', 'holePasses', 'maxZ', 'repeats', 'retract', 'slow']);
  });

  test('a side: set up out over the top and down beside it, the touches, up again', () => {
    expect(toolAt(moveOf('x1pOut'), 0).level).toBeGreaterThan(0);
    expect(toolAt(moveOf('x1pOut'), 1).at[0]).toBeGreaterThan(BOSS_R);
    expect(toolAt(moveOf('x1pDown'), 1).level).toBe(0);
    expect(toolAt(moveOf('x1pFast'), 1).at).toEqual(moveOf('x1pFast').wall);
    expect(toolAt(moveOf('x1pUp'), 1).level).toBeGreaterThan(0);
  });

  test('the touch is drawn where the ball meets the part, the top where the ball stands', () => {
    expect(Math.hypot(...bossScene('x1pFast', 1).contact)).toBeCloseTo(BOSS_R);
    expect(bossScene('x1pBack', 0.3).touched).toHaveLength(1);
    expect(bossScene('x1mOut', 0.1).touched).toHaveLength(1);
    expect(bossScene('zFast', 1).contact).toEqual(toolAt(moveOf('zFast'), 1).at);
    // The first pass ends on the centre.
    expect(toolAt(moveOf('y1c'), 1).at[0]).toBeCloseTo(0);
    expect(toolAt(moveOf('y1c'), 1).at[1]).toBeCloseTo(0);
  });

  test('each step across X and Y its arrow and distances from above; Z none (the animation rules)', () => {
    expect(bossScene('x1pOut', 0.5).motion).toMatchObject({ kind: 'rapid' });
    expect(bossScene('x1pDown', 0.5, { texts: TEXTS }).motion).toBeNull();
    expect(bossScene('x1pFast', 0.5, { texts: TEXTS }).motion).toMatchObject({ kind: 'probe', feed: '100' });
    // The back-off as the Z plate's: the arrow bare, its figure a dimension.
    expect(bossScene('x1pBack', 0.4, { texts: TEXTS }).motion).toMatchObject({ kind: 'rapid', feed: null });
    expect(bossScene('x1pBack', 0.4, { texts: TEXTS }).dims).toEqual([expect.objectContaining({ id: 'retract', text: '2' })]);
    // The slow touch: its feed, and its reach — twice the back-off — as a limit.
    expect(bossScene('x1pSlow', 0.4, { texts: TEXTS }).motion).toMatchObject({ kind: 'probe', feed: '20' });
    // One reach: back to the side, and the margin past it — the back-off each.
    expect(bossScene('x1pSlow', 0.4, { texts: TEXTS }).reach).toMatchObject({ text: '4' });
    expect(bossScene('zSlow', 0.4, { texts: TEXTS })).toMatchObject({ motion: null, limit: null, dims: [] });
    // The fast touch's reach (review note, 2026-10-01: *"w pomiarze czopa brakuje odległości"*).
    expect(bossScene('x1pFast', 0.5, { texts: TEXTS }).limit).toMatchObject({ text: '25' });
    // Where it comes from, said under the drawing (review note #9, 2026-10-02).
    expect(BOSS_CYCLE.explain('x1pFast', TEXTS)).toEqual(['probe.boss.reachWhy', { reach: '25', clear: '10', size: '30' }]);
    expect(BOSS_CYCLE.explain('x1pBack', TEXTS)).toBeNull();
    // Down beside a side and up again: the back-off and the depth, said as their sum (rule 1, 2026-10-02).
    expect(BOSS_CYCLE.explain('x1pDown', TEXTS)).toEqual(['probe.sum.retractDepth', expect.objectContaining({ retract: TEXTS.retract, depth: TEXTS.depth })]);
    expect(BOSS_CYCLE.explain('x1pUp', TEXTS)[0]).toBe('probe.sum.retractDepth');
  });

  test('a segment\'s end frame is its own move\'s', () => {
    [1, 2].forEach((passes) => {
      segmentsOf(bossTimeline(passes)).forEach((one) => {
        expect(playAt(one.b - 1, { passes }).name).toBe(one.name);
      });
    });
  });

  test('a figure being set loops the step it changes, its part lit', () => {
    expect(playAt(10, { field: 'clear' })).toMatchObject({ name: 'x1pOut', focus: 'clear' });
    expect(playAt(10, { field: 'maxZ' })).toMatchObject({ name: 'zFast', focus: 'dim' });
    expect(playAt(10, { field: 'retract' })).toMatchObject({ name: 'x1pBack', focus: 'retract' });
    // One figure, the sum — half the part and the way past it — lit with either (rule 1, 2026-10-02).
    expect(bossScene('x1pOut', 0.2, { texts: TEXTS, focus: 'clear' }).dims).toEqual([expect.objectContaining({ id: 'clear', lit: true, text: '25' })]);
    expect(bossScene('x1pOut', 0.2, { texts: TEXTS, focus: 'size' }).dims[0]).toMatchObject({ id: 'size', lit: true });
    expect(BOSS_CYCLE.explain('x1pOut', TEXTS)).toEqual(['probe.boss.outWhy', { reach: '25', clear: '10', size: '30' }]);
  });

  test('says each step in G-code as the server runs it, and lights its figures', () => {
    expect(bossCode('zFast', TEXTS)).toBe('G38.2 Z-15 F100');
    expect(bossCode('zBack', TEXTS)).toBe('G0 Z+2');
    expect(bossCode('zSlow', TEXTS)).toBe('G38.2 Z-4 F20');
    expect(bossCode('x1pOut', TEXTS)).toEqual(['probe.boss.outCode']);
    expect(bossCode('x1pDown', TEXTS)).toBe('G38.3 Z-7 F100');
    expect(bossCode('x1pFast', TEXTS)).toBe('G38.2 X-25 F100');
    expect(bossCode('y1mFast', TEXTS)).toBe('G38.2 Y+25 F100');
    expect(bossCode('x1pBack', TEXTS)).toBe('G0 X+2');
    expect(bossCode('x1pSlow', TEXTS)).toBe('G38.2 X-4 F20');
    expect(bossCode('x1pUp', TEXTS)).toBe('G0 Z+7');
    expect(bossCode('zero', TEXTS)).toEqual(['probe.size.codeBoss']);
    expect(usesAt('x1pDown')).toEqual(['depth', 'retract']);
    expect(usesAt('zFast', 0.5)).toEqual(['maxZ', 'fast']);
  });

  test('names each step, plays the server\'s step with its words', () => {
    expect(titleOf('y2mUp')).toEqual(['probe.boss.move.up', { pass: 2, axis: 'Y−' }]);
    expect(moveOfPhase('z-fast')).toBe('zFast');
    expect(moveOfPhase('z-settle')).toBe('zBack');
    expect(moveOfPhase('z')).toBe('zSlow');
    expect(moveOfPhase('x1a-out')).toBe('x1pOut');
    expect(moveOfPhase('x1a-down')).toBe('x1pDown');
    expect(moveOfPhase('x1a-fast')).toBe('x1pFast');
    expect(moveOfPhase('x1a')).toBe('x1pSlow');
    expect(moveOfPhase('y2b-up')).toBe('y2mUp');
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
