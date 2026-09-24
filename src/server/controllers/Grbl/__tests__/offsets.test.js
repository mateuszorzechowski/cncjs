import { changesWorkOffsets } from '../offsets';

describe('which lines make the work offsets stale', () => {
  test('the two that write a coordinate system', () => {
    expect(changesWorkOffsets('G10 L20 P1 X0 Y0')).toBe(true);
    expect(changesWorkOffsets('G10 L2 P2 X-100')).toBe(true);
    expect(changesWorkOffsets('G92 X0 Y0')).toBe(true);
    // `G92.1` clears what `G92` set, and reports through `$#` just as much.
    expect(changesWorkOffsets('G92.1')).toBe(true);
    // The one operator action that changes all of them at once.
    expect(changesWorkOffsets('$RST=#')).toBe(true);
  });

  test('lowercase counts, because nothing upper-cases a console line', () => {
    expect(changesWorkOffsets('g10 l20 p1 z0')).toBe(true);
  });

  test('not the lines the machine spends its life sending', () => {
    /*
     * Asked of every line written, including a jog segment every ten
     * milliseconds — so what it must not do is be vague. `G100` is not `G10`,
     * and a coordinate of 10 is not a G-word at all.
     */
    expect(changesWorkOffsets('$J=G91 G21 X10 Y-10 F1500')).toBe(false);
    expect(changesWorkOffsets('$J=G53 G90 G21 Z0 F4000')).toBe(false);
    expect(changesWorkOffsets('G0 X10 Y92')).toBe(false);
    expect(changesWorkOffsets('G100')).toBe(false);
    expect(changesWorkOffsets('G1 X1 F500')).toBe(false);
  });

  test('not a bare G28, which is where a job goes home', () => {
    /*
     * `G28.1` and `G30.1` do set positions that `$#` reports, but a bare `G28`
     * is an ordinary "go home" and is the form that appears in programs.
     * Matching the word would mean a re-read after every homing move in every
     * job; the `.1` forms are rare enough to be worth missing instead.
     */
    expect(changesWorkOffsets('G28')).toBe(false);
    expect(changesWorkOffsets('G28 Z0')).toBe(false);
  });

  test('nothing at all is not a change', () => {
    expect(changesWorkOffsets('')).toBe(false);
    expect(changesWorkOffsets(null)).toBe(false);
    expect(changesWorkOffsets(undefined)).toBe(false);
  });
});
