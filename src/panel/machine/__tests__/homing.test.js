import { canHome, homingState } from '../homing';

/**
 * Whether the panel may offer to send a machine home.
 *
 * This decides whether a button that moves every axis at once is pressable, so
 * the cases that matter are the ones where the answer is "no" and the ones
 * where the panel is guessing.
 */
describe('canHome', () => {
  test('says no when Grbl reports homing disabled', () => {
    // `$22=0` is a machine with no limit switches wired, or with them turned
    // off. `$H` answers `error:5` and moves nothing — but a control that
    // cannot work should not look like one that can.
    expect(canHome('Grbl', { settings: { $22: '0' } })).toBe(false);
  });

  test('says yes when Grbl reports homing enabled', () => {
    expect(canHome('Grbl', { settings: { $22: '1' } })).toBe(true);
  });

  test('reads the setting as written, spaces and all', () => {
    // The value arrives as firmware text, not as a number.
    expect(canHome('Grbl', { settings: { $22: ' 0 ' } })).toBe(false);
    expect(canHome('Grbl', { settings: { $22: ' 1 ' } })).toBe(true);
  });

  test('defers to the firmware when it does not report the setting', () => {
    // Marlin and TinyG have no `$22`. The panel does not claim to know, and
    // the controller refuses if it cannot home — which is better than the
    // panel hiding a control that would have worked.
    expect(canHome('Marlin', {})).toBe(true);
    expect(canHome('TinyG', { settings: {} })).toBe(true);
  });

  test('says no when there is no controller at all', () => {
    expect(canHome('', { settings: { $22: '1' } })).toBe(false);
    expect(canHome(undefined, undefined)).toBe(false);
  });
});

describe('what the Bazowanie screen says', () => {
  const at = 1759097700000;

  test('nothing, with no machine', () => {
    expect(homingState({ connected: false, homedAt: at })).toEqual({ key: 'homing.state.unknown', tone: null });
  });

  test('homing switched off wins over everything else', () => {
    // `$22=0`: there is nothing to have homed.
    expect(homingState({ connected: true, placed: false, homedAt: at }).key).toBe('homing.state.off');
  });

  test('homed, when the server saw a $H succeed since the position was last lost', () => {
    expect(homingState({ connected: true, placed: true, homedAt: at })).toEqual({ key: 'homing.state.homed', tone: null });
  });

  test('the lock of a hard reset, and otherwise simply not homed', () => {
    expect(homingState({ connected: true, placed: true, homedAt: null, lock: true }).key).toBe('homing.state.lock');
    expect(homingState({ connected: true, placed: true, homedAt: null, lock: false })).toEqual({ key: 'homing.state.not', tone: 'warn' });
  });
});
