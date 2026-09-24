import { alarmAdvice } from '../alarm';

describe('the way out of an alarm', () => {
  test.each([2, 4, 5])('ALARM:%i keeps the position, so Unlock', (code) => {
    expect(alarmAdvice(code)).toMatchObject({ position: 'kept', action: 'unlock' });
  });

  test.each([1, 3])('ALARM:%i loses it, so Home', (code) => {
    // ALARM:3 is what the big STOP leaves behind.
    expect(alarmAdvice(code)).toMatchObject({ position: 'lost', action: 'home' });
  });

  test.each([6, 7, 8, 9, 10])('ALARM:%i is a homing that failed, so the position was never known', (code) => {
    expect(alarmAdvice(code)).toMatchObject({ position: 'unknown', action: 'home' });
  });

  test('the homing lock after a reset has no number, and nothing homed yet', () => {
    expect(alarmAdvice(null)).toMatchObject({ meaning: 'alarm.lock', position: 'unknown', action: 'home' });
  });

  test('says what it means in Grbl\'s own words', () => {
    expect(alarmAdvice(3).meaning).toBe('grbl.alarm.3');
  });
});
