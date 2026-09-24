import controller from '../controller';
import { zeroLine, zero, activeWcsNumber } from '../zero';

jest.mock('../controller', () => ({ command: jest.fn() }));

describe('zeroLine', () => {
  test('zeroes the coordinate system the machine is actually working in', () => {
    // Not a hard-coded P1. Zeroing G54 while the job runs in G55 is silent,
    // and it is discovered by a tool moving to the wrong place under power.
    expect(zeroLine({ modal: { wcs: 'G55' }, axes: ['z'] })).toBe('G10 L20 P2 Z0');
    expect(zeroLine({ modal: { wcs: 'G59' }, axes: ['x', 'y'] })).toBe('G10 L20 P6 X0 Y0');
  });

  test('refuses rather than guesses when the system is unknown', () => {
    expect(zeroLine({ modal: {}, axes: ['z'] })).toBeNull();
    expect(zeroLine({ modal: { wcs: 'G92' }, axes: ['z'] })).toBeNull();
    expect(activeWcsNumber({})).toBe(0);
  });

  test('refuses an empty set of axes', () => {
    expect(zeroLine({ modal: { wcs: 'G54' }, axes: [] })).toBeNull();
  });
});

describe('zero on Grbl', () => {
  beforeEach(() => controller.command.mockClear());

  /*
   * The intention, not the line.
   *
   * Composing `G10 L20 P<n>` here meant shadowing a reading the server
   * already has and being wrong about it in silence — either the wrong
   * coordinate system written, or the right one written into an alarmed
   * controller, where the server drops the line before the cable and says
   * nothing. Measured at the machine, 2026-09-23.
   */
  test('sends what was meant and lets the server compose it', () => {
    zero({ type: 'Grbl', modal: { wcs: 'G54' }, axes: ['x', 'y'] });

    expect(controller.command).toHaveBeenCalledTimes(1);
    expect(controller.command).toHaveBeenCalledWith('zero', { axes: ['x', 'y'] });
  });

  test('sends it even when this panel cannot see a coordinate system', () => {
    /*
     * The panel's own reading is for greying the button out, and it is not
     * the authority. A press that arrives here anyway is a race — the button
     * was live when the thumb came down — and the server answers it with a
     * refusal rather than this side guessing at one.
     */
    zero({ type: 'Grbl', modal: {}, axes: ['z'] });

    expect(controller.command).toHaveBeenCalledWith('zero', { axes: ['z'] });
  });
});

describe('zero on a controller whose server side cannot compose it', () => {
  beforeEach(() => controller.command.mockClear());

  // Marlin, Smoothie and TinyG have no `zero` command. They keep the composed
  // line, which is what those firmwares can actually be given.
  test.each(['Marlin', 'Smoothie', 'TinyG'])('%s gets the line', (type) => {
    zero({ type, modal: { wcs: 'G54' }, axes: ['x', 'y'] });

    expect(controller.command).toHaveBeenCalledTimes(1);
    expect(controller.command).toHaveBeenCalledWith('gcode', 'G10 L20 P1 X0 Y0');
  });

  test('sends nothing at all when it would have to guess', () => {
    // The trap: a command that quietly falls back to P1 looks like it worked.
    zero({ type: 'Marlin', modal: {}, axes: ['z'] });
    expect(controller.command).not.toHaveBeenCalled();
  });
});
