import { alarmAdvice } from '../alarm';

describe('the way out of an alarm', () => {
  // cnc-sim, 2026-10-04: after a limit, Home and Unlock were swallowed until a reset.
  test.each([1, 2])('ALARM:%i is a limit: Grbl takes a reset before anything', (code) => {
    expect(alarmAdvice(code).action).toBe('reset');
    expect(alarmAdvice(code, { program: true }).action).toBe('reset');
  });

  test.each([4, 5])('ALARM:%i keeps the position, so Unlock', (code) => {
    expect(alarmAdvice(code)).toMatchObject({ position: 'kept', action: 'unlock' });
  });

  test('ALARM:3 loses it, so Home', () => {
    // ALARM:3 is what the big STOP leaves behind.
    expect(alarmAdvice(3)).toMatchObject({ position: 'lost', action: 'home' });
  });

  test.each([6, 7, 8, 9, 10])('ALARM:%i is a homing that failed, so the position was never known', (code) => {
    expect(alarmAdvice(code)).toMatchObject({ position: 'unknown', action: 'home' });
  });

  test('the homing lock after a reset has no number, and nothing homed yet', () => {
    expect(alarmAdvice(null)).toMatchObject({ meaning: 'alarm.lock', position: 'unknown', action: 'home' });
  });

  test('with a program stopped on it, the way out is to stop the program first', () => {
    // Whatever the alarm: the server takes neither unlock nor homing while a
    // program holds the machine, so either would be a suggestion it refuses —
    // which is what the sheet under the chip offered on 2026-09-25.
    expect(alarmAdvice(4, { program: true })).toMatchObject({ position: 'kept', action: 'abort' });
    expect(alarmAdvice(3, { program: true })).toMatchObject({ position: 'lost', action: 'abort' });
    expect(alarmAdvice(4, { program: false }).action).toBe('unlock');
  });

  test('says what it means in Grbl\'s own words', () => {
    expect(alarmAdvice(3).meaning).toBe('grbl.alarm.3');
  });
});
