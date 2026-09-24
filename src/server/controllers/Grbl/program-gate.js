/**
 * What a client may ask for while a program is under way.
 *
 * One rule for every entry a client has — a socket command, a raw line typed
 * into a console, a file uploaded over HTTP — decided 2026-09-24 and checked
 * against how UGS, gSender, Candle and LinuxCNC do it:
 *
 * - **No program:** anything.
 * - **Running:** only what stops, steers or reports it — hold, resume, stop,
 *   reset, the overrides, a status query. Everything else would land between
 *   two lines of the job: a `G10 L20` moves every cut still to come, and any
 *   line from the feeder takes an `ok` the program was counting on.
 * - **Paused, firmware idle:** a manual tool change. The sender has stopped
 *   and Grbl is standing still, so the operator may jog, touch off and zero —
 *   the standard manual flow in UGS, gSender and Candle. Only a program of
 *   its own may not be loaded or started over the paused one.
 * - **Paused, firmware in hold** (a feed hold, an `M0`): as while running.
 *   Grbl refuses a jog in Hold itself, and would queue any other line behind
 *   the rest of the program.
 *
 * Measured on this bench: an `M0` pause leaves Grbl in `Hold`, an `M6` under
 * the default tool-change policy leaves it `Idle`.
 *
 * **Only for what a client asks.** The server drives the machine itself during
 * a pause — the tool-change routine, a G-code event on `gcode:pause` — and none
 * of that may be refused by a rule written for somebody else's hand.
 */

/** What stops, steers or reports a program. `realtime` is a raw byte like `!` or `~`. */
const CONTROL = new Set([
  'estop', 'reset', 'feedhold', 'cyclestart', 'statusreport',
  'jogStop', 'jogCancel',
  'feedOverride', 'spindleOverride', 'rapidOverride',
  'gcode:pause', 'gcode:resume', 'gcode:stop', 'pause', 'resume', 'stop',
  'feeder:start', 'feeder:stop', 'lasertest:off', 'realtime',
]);

/** What would replace the program that is paused. */
const PROGRAM = new Set([
  'gcode:load', 'gcode:unload', 'gcode:start', 'start', 'watchdir:load', 'macro:load',
]);

/**
 * Why this command may not go through now, or null when it may.
 *
 * @param {string} cmd the command, or `realtime` / `write` for a raw line
 * @param {object} state `{ workflow, firmware }` — the sender's workflow state
 *   and Grbl's own active state
 */
export const programRefusal = (cmd, { workflow, firmware }) => {
  const allowed = workflow === 'idle' ||
    CONTROL.has(cmd) ||
    (workflow === 'paused' && firmware === 'Idle' && !PROGRAM.has(cmd));

  return allowed ? null : 'program-running';
};
