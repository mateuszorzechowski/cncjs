/**
 * What an alarm means for the position, and the way out of it.
 *
 * From Grbl's own descriptions (gnea/grbl `doc/csv/alarm_codes_en_US.csv`):
 * a soft limit and the two probe failures say "machine position retained";
 * a hard limit and a reset in motion say "position is likely lost …
 * re-homing is highly recommended"; the homing failures happened before
 * there was a position to keep. The homing lock a reset leaves with `$22=1`
 * has no number at all, and no position yet either.
 *
 * **Kept means Unlock; anything else means Home**, with Unlock still offered
 * for the machine that cannot home — the bare board on this bench has no
 * switches — but said to be a guess. Settled after a STOP left ALARM:3 and the
 * panel's only lit button was Unlock (2026-09-24).
 */

const KEPT = new Set([2, 4, 5]);
const LOST = new Set([1, 3]);

// Written out, so each is a key something can grep for (rule 8).
const MEANING = {
  1: 'grbl.alarm.1',
  2: 'grbl.alarm.2',
  3: 'grbl.alarm.3',
  4: 'grbl.alarm.4',
  5: 'grbl.alarm.5',
  6: 'grbl.alarm.6',
  7: 'grbl.alarm.7',
  8: 'grbl.alarm.8',
  9: 'grbl.alarm.9',
  10: 'grbl.alarm.10',
};

const POSITION = {
  kept: 'alarm.position.kept',
  lost: 'alarm.position.lost',
  unknown: 'alarm.position.unknown',
};

/**
 * `{ code, meaning, position, positionKey, action }` for a machine in alarm.
 *
 * @param {number|null} code Grbl's number, or null for the homing lock.
 * @param {object} [context]
 * @param {boolean} [context.program] Whether a program is stopped on it. Then
 *   the way out is to stop the program first (`abort`): the server takes
 *   neither unlock nor homing while a program holds the machine, and the
 *   sheet under the chip suggesting either was a suggestion it refused
 *   (2026-09-25).
 */
export const alarmAdvice = (code, { program = false } = {}) => {
  let position = 'unknown';
  if (KEPT.has(code)) {
    position = 'kept';
  } else if (LOST.has(code)) {
    position = 'lost';
  }

  return {
    code,
    meaning: MEANING[code] || 'alarm.lock',
    position,
    positionKey: POSITION[position],
    action: program ? 'abort' : (position === 'kept' ? 'unlock' : 'home'),
  };
};

export default alarmAdvice;
