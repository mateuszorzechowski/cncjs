import { machineEnvelope, axisRange } from '../envelope';
import { RATE_UNKNOWN, goToPointLines, goToWorkZeroLines, rateFor } from '../travel';

// A Grbl that homes to the maximum: travel is [-range, 0], which is the
// default and the source of "why are my machine coordinates all minus".
const HOMES_TO_MAX = {
  $130: '1000', $131: '700', $132: '150', $23: '0', $110: '5000', $112: '4000',
};
// The Z bit set in `$23`: that axis homes at the bottom, travel is [0, range].
const Z_HOMES_TO_MIN = { ...HOMES_TO_MAX, $23: '4' };

describe('where the machine reaches', () => {
  test('is negative by default, because Grbl puts zero at the top', () => {
    expect(machineEnvelope(HOMES_TO_MAX)).toEqual({
      min: { x: -1000, y: -700, z: -150 },
      max: { x: 0, y: 0, z: 0 },
    });
  });

  test('flips the axis whose bit is set in $23', () => {
    // An envelope taken as [0, travel] regardless comes out mirrored through
    // the origin: the right size, in the wrong place, plausible enough to ship.
    expect(machineEnvelope(Z_HOMES_TO_MIN).min.z).toBe(0);
    expect(machineEnvelope(Z_HOMES_TO_MIN).max.z).toBe(150);
  });

  test('is nothing at all when an axis has not said', () => {
    // Three quarters of an envelope is not an envelope. A move planned against
    // one would put a wall where there is none.
    expect(machineEnvelope({ ...HOMES_TO_MAX, $131: undefined })).toBeNull();
    expect(machineEnvelope({ ...HOMES_TO_MAX, $132: '0' })).toBeNull();
    // Per axis it is still answerable, which is what a jog along X asks.
    expect(axisRange('x', { ...HOMES_TO_MAX, $132: '0' })).toEqual({ min: -1000, max: 0 });
  });
});

describe('going back to the work zero', () => {
  test('lifts Z to the top of the travel before it crosses', () => {
    /*
     * To the top of the travel, not to `G53 Z0`. They are the same place on a
     * Grbl that homes to the maximum, and on one with the Z bit set in `$23`
     * machine zero is at the *bottom* — `G53 Z0` would be a plunge to the
     * table.
     */
    expect(goToWorkZeroLines(HOMES_TO_MAX)).toEqual([
      '$J=G53 G90 G21 Z0 F4000',
      '$J=G90 G21 X0 Y0 F5000',
    ]);
    expect(goToWorkZeroLines(Z_HOMES_TO_MIN)[0]).toBe('$J=G53 G90 G21 Z150 F4000');
  });

  test('crosses in work coordinates, because that is where the zero is', () => {
    // No `G53` on the second line. The first is machine coordinates because
    // the top of the travel is; the second is the operator's own zero.
    expect(goToWorkZeroLines(HOMES_TO_MAX)[1]).not.toContain('G53');
  });

  test('is refused rather than degraded when the travel is unknown', () => {
    // What is left without a known top to retract to is exactly the move being
    // avoided: the old application's bare `G0 X0 Y0`, through the work.
    expect(goToWorkZeroLines({ $23: '0' })).toBeNull();
  });

  test('runs at the rate the axis reports, and at a stated one when it does not', () => {
    // A jog carries its own feed rate rather than running at the machine's
    // rapid, so the axis maximum is the speed `G0` would have used.
    expect(rateFor(HOMES_TO_MAX, 'xy')).toBe(5000);
    expect(rateFor({}, 'xy')).toBe(RATE_UNKNOWN);
    expect(rateFor({ $110: '0' }, 'xy')).toBe(RATE_UNKNOWN);
  });
});

describe('travelling to a point off the drawing', () => {
  test('lifts first, then goes there in machine coordinates', () => {
    expect(goToPointLines(HOMES_TO_MAX, { x: -412.38471629, y: -200 })).toEqual([
      '$J=G53 G90 G21 Z0 F4000',
      // Three decimals. A cursor lands at full float precision, and
      // `X-412.38471629` says more about the mouse than about the machine.
      '$J=G53 G90 G21 X-412.385 Y-200 F5000',
    ]);
  });

  test('refuses a point the machine cannot reach', () => {
    /*
     * With `$20=1` the firmware refuses the line outright rather than clipping
     * it, so pointing slightly wide of the bed did nothing at all and said
     * nothing about why.
     */
    expect(goToPointLines(HOMES_TO_MAX, { x: 10, y: -200 })).toBeNull();
    expect(goToPointLines(HOMES_TO_MAX, { x: -1200, y: -200 })).toBeNull();
    expect(goToPointLines(HOMES_TO_MAX, { x: -100, y: -900 })).toBeNull();
  });

  test('accepts the corners, which are inside', () => {
    expect(goToPointLines(HOMES_TO_MAX, { x: 0, y: 0 })).not.toBeNull();
    expect(goToPointLines(HOMES_TO_MAX, { x: -1000, y: -700 })).not.toBeNull();
  });

  test('refuses a point that is not two numbers', () => {
    expect(goToPointLines(HOMES_TO_MAX, null)).toBeNull();
    expect(goToPointLines(HOMES_TO_MAX, { x: -100 })).toBeNull();
    expect(goToPointLines(HOMES_TO_MAX, { x: -100, y: 'nowhere' })).toBeNull();
  });
});
