import { HOLE_R, holeCycleOf, toolAt } from '../holeCycle';
import { phaseWords } from '../probe';
import { segmentsOf } from '../timeline';

jest.mock('../controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

const HOLE_CYCLE = holeCycleOf();
const {
  params: HOLE_PARAMS, code: holeCode, groups: holeGroups, order: holeOrder, scene: holeScene, timeline: holeTimeline, words: holeWords, moveOf, moveOfPhase, playAt, positionAt, titleOf,
} = HOLE_CYCLE;

const TEXTS = {
  holeSize: '20', ballDiameter: '6', retract: '2', fast: '100', slow: '20',
};

const STEPS = ['Fast', 'Back', 'Slow', 'Off'];
const sideSteps = (side) => STEPS.map((step) => `${side}${step}`);

describe('a hole measured', () => {
  test('each wall in the corner\'s steps — fast, back, slow, off — the middle after each pair, the size last', () => {
    // Off the second wall straight on to the middle: one rapid, no back-off of its own (rule, 2026-10-02).
    const second = (side) => sideSteps(side).filter((step) => !step.endsWith('Off'));
    expect(holeOrder(1)).toEqual([
      ...sideSteps('x1p'), ...second('x1m'), 'x1c', ...sideSteps('y1p'), ...second('y1m'), 'y1c', 'zero',
    ]);
    expect(holeOrder()).toHaveLength(2 * 16 + 1);
  });

  test('the bar: a stage per axis and pass, a wall\'s steps each, the middle; every move once', () => {
    [1, 2].forEach((passes) => {
      const barred = holeGroups(passes).flatMap((group) => group.subs.flatMap((sub) => sub.moves));
      expect(barred).toEqual(holeOrder(passes));
    });
    expect(holeGroups(1).map((group) => group.name || group.key)).toEqual(['X', 'Y', 'probe.bar.size']);
    expect(holeGroups(2).map((group) => group.name || group.key)).toEqual(['X · 1', 'Y · 1', 'X · 2', 'Y · 2', 'probe.bar.size']);
    expect(holeGroups(1)[0].subs.map((sub) => sub.name || sub.key)).toEqual(['X+', 'X−', 'probe.hole.middle']);
    const grouped = HOLE_PARAMS.flatMap((group) => (group.passes ? [...group.fields, 'holePasses', 'repeats'] : group.fields)).sort();
    expect(grouped).toEqual(['ballDiameter', 'fast', 'holePasses', 'holeSize', 'repeats', 'retract', 'slow']);
  });

  test('the fast touch ends at the wall, the back off it, the slow one at it again and off', () => {
    const fast = moveOf('x1pFast');
    expect(toolAt(fast, 1)).toEqual(fast.wall);
    expect(toolAt(moveOf('x1pBack'), 1)[0]).toBeLessThan(fast.wall[0]);
    expect(toolAt(moveOf('x1pSlow'), 0.74)).toEqual(fast.wall);
    const [a, b] = [moveOf('x1pFast').wall, moveOf('x1mFast').wall];
    expect(toolAt(moveOf('x1c'), 1)[0]).toBeCloseTo((a[0] + b[0]) / 2);
    // The first pass ends on the centre.
    expect(toolAt(moveOf('y1c'), 1)[0]).toBeCloseTo(0);
    expect(toolAt(moveOf('y1c'), 1)[1]).toBeCloseTo(0);
  });

  test('the touch is drawn where the ball\'s edge meets the wall, and stays for the pass', () => {
    expect(Math.hypot(...holeScene('x1pFast', 1).contact)).toBeCloseTo(HOLE_R);
    expect(holeScene('x1pFast', 0.5).touched).toHaveLength(0);
    expect(holeScene('x1pBack', 0.5).touched).toHaveLength(1);
    expect(holeScene('x1mFast', 0.5).touched).toHaveLength(1);
    expect(holeScene('x1c', 0.2).touched).toHaveLength(2);
    expect(holeScene('x2pFast', 0.2).touched).toEqual([]);
  });

  test('each step its arrow: the fast touch\'s feed, the way back\'s, the slow touch\'s', () => {
    expect(holeScene('x1pFast', 0.5, { texts: TEXTS }).motion).toMatchObject({ kind: 'probe', feed: '100' });
    // The back-off as the Z plate's: the arrow bare, its figure a dimension.
    expect(holeScene('x1pBack', 0.4, { texts: TEXTS }).motion).toMatchObject({ kind: 'rapid', feed: null });
    expect(holeScene('x1pBack', 0.4, { texts: TEXTS }).dims).toEqual([expect.objectContaining({ id: 'retract', text: '2' })]);
    // The slow touch: its feed, and its reach — twice the back-off — as a limit.
    expect(holeScene('x1pSlow', 0.4, { texts: TEXTS }).motion).toMatchObject({ kind: 'probe', feed: '20' });
    // One reach, one figure: back to the wall and as far again past it, said as the sum.
    expect(holeScene('x1pSlow', 0.4, { texts: TEXTS }).reach).toMatchObject({ text: '4' });
    expect(HOLE_CYCLE.explain('x1pSlow', TEXTS)).toEqual(['probe.sum.slowReach', { reach: '4', retract: '2' }]);
    expect(holeScene('zero', 0.5).motion).toBeNull();
  });

  test('a segment\'s end frame is its own move\'s', () => {
    [1, 2].forEach((passes) => {
      segmentsOf(holeTimeline(passes)).forEach((one) => {
        expect(playAt(one.b - 1, { passes }).name).toBe(one.name);
      });
    });
  });

  test('a figure being set loops the step it changes, its part lit', () => {
    expect(playAt(10, { field: 'holeSize' })).toMatchObject({ name: 'x1pFast', focus: 'dim' });
    expect(playAt(10, { field: 'fast' })).toMatchObject({ name: 'x1pFast', focus: 'feed' });
    expect(playAt(10, { field: 'slow' })).toMatchObject({ name: 'x1pSlow', focus: 'feed' });
    expect(playAt(10, { field: 'retract' })).toMatchObject({ name: 'x1pBack', focus: 'retract' });
    expect(playAt(10, { field: 'ballDiameter' })).toMatchObject({ name: 'zero', focus: 'dim' });
    expect(holeScene('x1pFast', 0.3, { texts: TEXTS, focus: 'dim' }).limit).toMatchObject({ lit: true, text: '20' });
  });

  test('says each step in G-code as the server runs it', () => {
    expect(holeCode('x1pFast', TEXTS)).toBe('G38.2 X+20 F100');
    expect(holeCode('x1pBack', TEXTS)).toBe('G0 X-2');
    // The slow touch: twice the way back, its own feed.
    expect(holeCode('x1pSlow', TEXTS)).toBe('G38.2 X+4 F20');
    expect(holeCode('y2mFast', TEXTS)).toBe('G38.2 Y-20 F100');
    expect(holeCode('x1c', TEXTS)).toEqual(['probe.hole.centreCode']);
    expect(holeCode('zero', TEXTS)).toEqual(['probe.size.codeHole']);
  });

  test('names each step with its pass and way', () => {
    expect(titleOf('y2mSlow')).toEqual(['probe.hole.move.slow', { pass: 2, axis: 'Y−' }]);
    expect(titleOf('x1c')).toEqual(['probe.hole.move.centre', { pass: 1, axis: 'X' }]);
  });

  test('plays the step of the server\'s on the measurement screen, with its words', () => {
    expect(moveOfPhase('x1a-fast')).toBe('x1pFast');
    expect(moveOfPhase('x1a-back')).toBe('x1pBack');
    expect(moveOfPhase('x1a-settle')).toBe('x1pBack');
    expect(moveOfPhase('y2b')).toBe('y2mSlow');
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
