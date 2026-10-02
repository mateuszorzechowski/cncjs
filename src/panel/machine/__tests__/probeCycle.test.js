import {
  BEFORE_MM, LOOP_HOLD_MS, PLATE_GROUPS, PLATE_ORDER, PLATE_PARAMS, RUN_MS, SPAN_MS, TOP, gapAt, motionEnd, moveOf, moveOfPhase, plateCode, plateExplain, plateReadout, plateScene, playAt, positionAt,
} from '../probeCycle';

const TEXTS = {
  maxZ: '20', fast: '50', retract: '5', slow: '15', plateThickness: '20', lift: '20',
};
const say = (field, text) => (field === 'fast' || field === 'slow' ? `F${text}` : `${text} mm`);
const upTo = (v) => `maks. ${v}`;

describe('the Z plate cycle (probe proposal)', () => {
  test('plays its six moves in order, each for a span, and loops', () => {
    expect(PLATE_ORDER.map((_, i) => playAt(i * SPAN_MS + 10).name)).toEqual(['fast', 'retract', 'slow', 'zero', 'lift']);
    expect(playAt(PLATE_ORDER.length * SPAN_MS + 10).name).toBe('fast');
  });

  test('holds a move at its end between the run and the next move', () => {
    expect(playAt(RUN_MS + 100).p).toBe(1);
    expect(playAt(RUN_MS + 100).name).toBe('fast');
  });

  test('shows every move at its end when the system asks for less motion', () => {
    expect(playAt(10, { still: true }).p).toBe(1);
  });

  test('loops a pinned move alone', () => {
    expect(playAt(5 * SPAN_MS + 10, { pinned: 'slow' }).name).toBe('slow');
  });

  test('a figure being set loops the move it changes, its part lit', () => {
    expect(playAt(10, { field: 'fast' })).toMatchObject({ name: 'fast', focus: 'feed' });
    expect(playAt(10, { field: 'retract' })).toMatchObject({ name: 'retract', focus: 'dim' });
    expect(playAt(10, { field: 'plateThickness' })).toMatchObject({ name: 'zero', focus: 'dim' });
    expect(playAt(10, { field: 'lift' })).toMatchObject({ name: 'lift', focus: 'dim' });
  });

  test('the travel limit loops the touch, then the same way with no plate, each held alike', () => {
    expect(playAt(10, { field: 'maxZ' }).name).toBe('fast');
    // The fast touch stops moving at 0.7 of its run.
    expect(playAt(RUN_MS * 0.7 + LOOP_HOLD_MS + 10, { field: 'maxZ' }).name).toBe('miss');
  });

  test('a move looped on its own holds its end the same long while, whatever its length', () => {
    const hold = (name) => {
      const at = playAt(0, { pinned: name });
      return at.span - RUN_MS * motionEnd(name);
    };
    expect(hold('retract')).toBe(LOOP_HOLD_MS);
    expect(hold('slow')).toBe(LOOP_HOLD_MS);
    expect(motionEnd('retract')).toBe(0.55);
    expect(motionEnd('zero')).toBe(0.45);
  });

  test('the fast touch: a probing arrow down to the plate, its limit dashed past it', () => {
    const scene = plateScene('fast', 0.5, { texts: TEXTS, say, upTo });
    expect(scene.gap).toBe(gapAt(moveOf('fast').frames, 0.5));
    expect(scene.motion).toMatchObject({ from: TOP - 84, to: TOP, kind: 'probe', feed: 'F50' });
    expect(scene.dim).toMatchObject({ limit: true, text: 'maks. 20 mm' });
    // The arrow carries its feed beside the dimension.
    expect(scene.feedTag).toBe(true);
  });

  test('the back-off is a rapid, the slow touch searches twice it', () => {
    expect(plateScene('retract', 0.8, { texts: TEXTS, say }).motion.kind).toBe('rapid');
    // Back to the plate and as far again past it: one figure, the sum as a limit, a short tick at the plate's top.
    const { dim } = plateScene('slow', 0.5, { texts: TEXTS, say, upTo });
    expect(dim).toMatchObject({ text: 'maks. 10 mm', mid: TOP });
    expect(plateExplain('slow', TEXTS, say)).toEqual(['probe.sum.slowReach', { reach: '10 mm', retract: '5 mm' }]);
    expect(plateExplain('fast', TEXTS, say)).toBeNull();
  });

  test('touches green where the tip reaches the plate', () => {
    expect(plateScene('fast', 1, { texts: TEXTS, say }).contact).toBe(true);
    expect(plateScene('fast', 0.3, { texts: TEXTS, say }).contact).toBe(false);
  });

  test('the zero: Z0 comes in with the plate thickness; the lift keeps it and goes up by G0', () => {
    const zero = plateScene('zero', 0.6, { texts: TEXTS, say });
    expect(zero.zero).toBe(1);
    expect(zero.dim.text).toBe('20 mm');
    expect(zero.motion).toBeNull();
    const lift = plateScene('lift', 0.5, { texts: TEXTS, say });
    expect(lift.zero).toBe(1);
    expect(lift.motion.kind).toBe('rapid');
    expect(lift.dim.top).toBe(TOP - 56);
    // Straight off the touch up to the lift: its way is the lift, from the plate's top.
    expect(lift.dim).toMatchObject({ bottom: TOP, text: '20 mm' });
  });

  test('with no plate the tool goes the whole limit and ends in the alarm', () => {
    expect(plateScene('miss', 0.5, { texts: TEXTS, say }).alarm).toBe(false);
    const end = plateScene('miss', 1, { texts: TEXTS, say });
    expect(end).toMatchObject({ ghost: true, alarm: true, contact: false });
  });

  test('says each move in G-code with the figures typed', () => {
    expect(plateCode('fast', TEXTS)).toBe('G38.2 Z-20 F50');
    expect(plateCode('slow', TEXTS)).toBe('G38.2 Z-10 F15');
    expect(plateCode('zero', TEXTS, 2)).toBe('G10 L20 P2 Z20');
    // Off the touch and up to the lift, one rapid the same way: the lift whole.
    expect(plateCode('lift', TEXTS)).toBe('G0 Z+20');
  });

  test('reads the tool Z against the old zero, then the new one, held through the moves', () => {
    const mm = { plateThickness: 20 };
    expect(plateReadout('fast', mm)).toEqual({ z: BEFORE_MM, after: false });
    expect(plateReadout('retract', mm)).toEqual({ z: BEFORE_MM, after: false });
    expect(plateReadout('zero', mm)).toEqual({ z: 20, after: true });
    expect(plateReadout('lift', mm)).toEqual({ z: 20, after: true });
  });

  test('every move in the bar is one of the cycle\'s, and every figure is in one group', () => {
    const barred = PLATE_GROUPS.flatMap((group) => group.subs.flatMap((sub) => sub.moves));
    expect(barred).toEqual(PLATE_ORDER);
    const grouped = PLATE_PARAMS.flatMap((group) => group.fields).sort();
    expect(grouped).toEqual(['fast', 'lift', 'maxZ', 'plateThickness', 'retract', 'slow', 'stockThickness']);
  });

  test('Z0 on the table: the zero written over the surface by the work, and read so', () => {
    const texts = { ...TEXTS, stockThickness: '18' };
    expect(plateCode('zero', texts, 1, { on: 'work', z0: 'table' })).toBe('G10 L20 P1 Z38');
    expect(plateCode('zero', texts, 1, { on: 'table', z0: 'top' })).toBe('G10 L20 P1 Z2');
    expect(plateCode('zero', texts, 1, { on: 'table', z0: 'table' })).toBe('G10 L20 P1 Z20');
    expect(plateReadout('zero', { plateThickness: 20, stockThickness: 18 }, { on: 'work', z0: 'table' }).z).toBe(38);
    expect(plateScene('zero', 1, { texts, say, surface: { on: 'work', z0: 'table' } }).stock).toMatchObject({ text: '18 mm' });
  });

  test('plays the move of the server\'s step on the measurement screen', () => {
    expect(moveOfPhase('z-fast')).toBe('fast');
    expect(moveOfPhase('z-settle')).toBe('retract');
    expect(moveOfPhase('z')).toBe('slow');
    expect(moveOfPhase('lift')).toBe('lift');
    expect(moveOfPhase('unknown')).toBe('fast');
  });

  test('the position step comes across and down to a few millimetres, then holds', () => {
    const start = positionAt(0);
    expect(start.shift).toBeLessThan(0);
    const held = positionAt(6800);
    expect(held).toMatchObject({ over: true, motion: null });
    expect(held.shift + 0).toBe(0);
  });
});
