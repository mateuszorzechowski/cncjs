/**
 * Which client commands the journal keeps, and at what level.
 *
 * One table, read once at the door (`CNCEngine`) after a command has been let
 * in — a refusal is its own entry, recorded where it is decided. Anything not
 * here is not kept: `statusreport` and `jogHold` arrive ten times a second, and
 * the program's own commands are recorded by what they did to the program
 * (`event: 'program'`), not by the press.
 */
const LEVEL = {
  // The two resets: the big STOP is one, and it is the entry an operator
  // looks for afterwards.
  reset: 'warn',
  estop: 'warn',
  unlock: 'info',
  homing: 'info',
  feedhold: 'info',
  cyclestart: 'info',
  sleep: 'info',
  zero: 'info',
  goToWorkZero: 'info',
  goToPoint: 'info',
  'macro:run': 'info',
  // A line typed into a console: somebody's `G10` is exactly what the journal
  // is for.
  gcode: 'info',
  write: 'info',
  jogStart: 'debug',
  jogStep: 'debug',
  jogStop: 'debug',
  jogCancel: 'debug',
};

/**
 * The entry for a command a client sent, or null when it is not kept.
 *
 * `detail` is what the command carried that is worth reading back: the line
 * for a console write, the axes for a zero.
 */
export const commandEntry = (cmd, detail) => {
  const level = LEVEL[cmd];
  if (!level) {
    return null;
  }
  return {
    level,
    source: 'server',
    event: 'command',
    code: cmd,
    ...(detail === undefined ? {} : { data: detail }),
  };
};

export default commandEntry;
