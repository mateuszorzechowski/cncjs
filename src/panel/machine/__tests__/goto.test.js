import controller from '../controller';
import { cancelTravel, canGoToPoint, canGoToWorkZero, goToPoint, goToWorkZero } from '../goto';

jest.mock('../controller', () => ({ command: jest.fn() }));

// Where the machine can reach, as the server sends it. A Grbl that homes to
// the maximum puts zero at the top, so the reachable volume is negative.
const ENVELOPE = {
  min: { x: -1000, y: -700, z: -150 },
  max: { x: 0, y: 0, z: 0 },
};

describe('what the panel sends', () => {
  beforeEach(() => controller.command.mockClear());

  /*
   * The intention, not the lines.
   *
   * Both travels were composed here out of four firmware settings —
   * `$130`-`$132` and `$23` for where the top of the travel is, `$110` and
   * `$112` for how fast to cross. All four are read by the side holding the
   * port. See `src/server/controllers/Grbl/travel.js`.
   */
  test('going back to the work zero carries nothing', () => {
    goToWorkZero();
    expect(controller.command.mock.calls).toEqual([['goToWorkZero']]);
  });

  test('going to a point carries the point', () => {
    goToPoint({ x: -412.5, y: -233.25 });
    expect(controller.command.mock.calls).toEqual([
      ['goToPoint', { x: -412.5, y: -233.25 }],
    ]);
  });

  test('calling a travel off is the jog cancel, not a reset', () => {
    /*
     * `0x85` drops what is left of the move and decelerates normally; the
     * position stays known. A reset stops just as fast by abandoning the
     * planner, and leaves the machine not knowing where it is.
     */
    cancelTravel();
    expect(controller.command).toHaveBeenCalledWith('jogCancel');
  });
});

describe('when a travel is offered at all', () => {
  test('only with an envelope, because only then is there a machine that can', () => {
    /*
     * The envelope comes from the side that makes the move: the server sends
     * one for a Grbl that has reported its travel and for nothing else.
     * Without one there is no known top to retract to, and what is left is
     * the move being avoided — the old application's bare `G0 X0 Y0`.
     */
    expect(canGoToWorkZero(ENVELOPE)).toBe(true);
    expect(canGoToWorkZero(null)).toBe(false);
  });

  test('and only to a point the machine can reach', () => {
    /*
     * Asked here so the button is dark rather than refused. With `$20=1` the
     * firmware rejects a move outside the travel outright rather than
     * clipping it, so pointing slightly wide of the bed did nothing at all
     * and said nothing about why.
     */
    expect(canGoToPoint(ENVELOPE, { x: -412, y: -233 })).toBe(true);
    expect(canGoToPoint(ENVELOPE, { x: -412, y: 50 })).toBe(false);
    expect(canGoToPoint(ENVELOPE, { x: -1400, y: -233 })).toBe(false);
  });

  test('the edge of the travel is inside it', () => {
    expect(canGoToPoint(ENVELOPE, { x: -1000, y: 0 })).toBe(true);
    expect(canGoToPoint(ENVELOPE, { x: 0, y: -700 })).toBe(true);
  });

  test('nothing to point at, and nothing to point within', () => {
    expect(canGoToPoint(ENVELOPE, null)).toBe(false);
    expect(canGoToPoint(ENVELOPE, { x: -412 })).toBe(false);
    expect(canGoToPoint(null, { x: -412, y: -233 })).toBe(false);
  });
});
