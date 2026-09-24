/**
 * The firmware's own controls: unlock, hold, resume, reset.
 *
 * Each is live only in the state where it does something, and that state is
 * the firmware's word — `$X` acts only in an alarm, `!` only on a machine in
 * motion, `~` only on one that is held. Reset is live whenever the port is,
 * because it is a stop, and stops are never withheld.
 *
 * **Hold and resume follow the program when there is one.** A bare `!` in the
 * middle of a job stops the machine and leaves the sender running; a bare `~`
 * during a program pause moves the machine and leaves the sender paused. Either
 * way the status bar and the machine disagree about the same job, so while a
 * program is under way they pause and resume it instead — which is also a feed
 * hold and a cycle start, on the wire.
 */
export const CONTROLS = ['unlock', 'hold', 'resume', 'reset'];

const LIVE_IN = {
  unlock: ['Alarm'],
  hold: ['Run', 'Jog'],
  resume: ['Hold', 'Door'],
};

export const controlsFor = ({ connected, status }) => Object.fromEntries(CONTROLS.map((id) => [
  id,
  Boolean(connected) && (id === 'reset' || LIVE_IN[id].includes(status?.word)),
]));

const COMMAND = {
  unlock: () => 'unlock',
  hold: (workflow) => (workflow === 'running' ? 'gcode:pause' : 'feedhold'),
  resume: (workflow) => (workflow === 'paused' ? 'gcode:resume' : 'cyclestart'),
  reset: () => 'reset',
};

export const sendControl = (controller, id, workflow) => controller.command(COMMAND[id](workflow));
