import { bossCycleOf } from '../bossCycle';
import { heightOf, scaleAt } from '../bossSide';
import { holeCycleOf } from '../holeCycle';

const BOSS_CYCLE = bossCycleOf();
const HOLE_CYCLE = holeCycleOf();
const bossMove = BOSS_CYCLE.moveOf;

describe('the centres from the front', () => {
  test('the part: always along X; Y is depth — larger at the front, dashed behind the part', () => {
    expect(heightOf(0.4)).toBe(0);
    expect(heightOf(0)).toBeLessThan(0);
    expect(scaleAt(-40)).toBeGreaterThan(1);
    expect(scaleAt(40)).toBeLessThan(1);
    // Down beside the back side (+Y): hidden; beside the front: not.
    expect(BOSS_CYCLE.side('y1pFast', 0.5).hidden).toBe(true);
    expect(BOSS_CYCLE.side('y1mFast', 0.5).hidden).toBe(false);
    // From the side, Z moves only (the animation rules): X and Y are the view from above's.
    expect(BOSS_CYCLE.side('y1pFast', 0.5).motion).toBeNull();
    expect(BOSS_CYCLE.side('x1pFast', 0.5).motion).toBeNull();
    expect(BOSS_CYCLE.side('x1pOut', 0.5).motion).toBeNull();
    expect(BOSS_CYCLE.side('x1pDown', 0.5, { texts: { fast: '50' } }).motion).toMatchObject({ dir: 'v', kind: 'probe', text: '50' });
    // A G0 bare, its distance a dimension beside it.
    expect(BOSS_CYCLE.side('zBack', 0.4).motion).toMatchObject({ dir: 'v', kind: 'rapid', text: null });
    expect(BOSS_CYCLE.side('x1pUp', 0.5, { texts: { depth: '5', overTop: '10' } })).toMatchObject({ motion: { kind: 'rapid', text: null }, vdims: [{ text: '15', split: 0 }] });
    // The top's search: its feed on the arrow, its reach a dashed dimension.
    expect(BOSS_CYCLE.side('zFast', 0.5, { texts: { fast: '50', maxZ: '20' } })).toMatchObject({ motion: { text: '50' }, vdims: [{ id: 'reach', text: '20', limit: true }] });
    // The top's back-off and slow reach as the Z plate's: the way back, then back to the top and the margin past it.
    expect(BOSS_CYCLE.side('zBack', 0.4, { texts: { retract: '2' } }).vdims).toEqual([expect.objectContaining({ text: '2' })]);
    expect(BOSS_CYCLE.side('zSlow', 0.4, { texts: { retract: '2' } }).vdims).toEqual([expect.objectContaining({ id: 'reach', text: '4', mid: 0 })]);
  });

  test('the part: down beside a side one dimension, its sum, a tick at the top, beside the ball away from its arrow; the touch at the ball\'s side', () => {
    const down = BOSS_CYCLE.side('x1pDown', 0.5, { texts: { depth: '5', overTop: '10' } });
    expect(down.vdims.map((dim) => dim.text)).toEqual(['15']);
    expect(down.vdims[0].from).toBeGreaterThan(0);
    expect(down.vdims[0].split).toBe(0);
    expect(down.vdims[0].to).toBeLessThan(0);
    // Lit with either figure of the sum.
    expect(BOSS_CYCLE.side('x1pDown', 0.5, { texts: { depth: '5', overTop: '10' }, focus: 'depth' }).vdims[0]).toMatchObject({ id: 'depth', lit: true });
    expect(down.vdims[0].at).toBeGreaterThan(down.along);
    const side = BOSS_CYCLE.side('x1pFast', 1);
    expect(side.vdims).toEqual([]);
    expect(side.contact[0]).toBeCloseTo(bossMove('x1pFast').wall[0] - side.r);
  });

  test('the hole: cut through, the ball in it seen; a few millimetres once in place', () => {
    expect(HOLE_CYCLE.side('x1pFast', 0.3).hidden).toBeFalsy();
    // No Z moves in a hole: no arrows from the side (the animation rules).
    expect(HOLE_CYCLE.side('x1pFast', 0.3).motion).toBeUndefined();
    expect(HOLE_CYCLE.sidePlace({ tool: [0, 0], level: 1 }).gap).toBeNull();
    expect(HOLE_CYCLE.sidePlace({ tool: [0, 0], level: 0 }).gap).toMatchObject({ key: 'probe.position.few' });
    expect(BOSS_CYCLE.sidePlace({ tool: [0, 0], level: 1 }).gap).toMatchObject({ key: 'probe.position.few' });
  });
});
