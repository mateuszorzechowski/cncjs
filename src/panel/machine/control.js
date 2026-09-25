import { programHolds } from './readings';

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

/*
 * Unlock also waits for a program to be over. The server takes nothing but
 * control while a program holds the machine (`program-gate`), and an alarm
 * that stopped a program leaves it holding: Unlock lit there was three
 * refusals in a row (2026-09-25). Reset is the way out, and stays live.
 */
const heldByProgram = (id, { status, workflow }) => (
  id === 'unlock' && programHolds(workflow, status?.word)
);

export const controlsFor = ({ connected, status, workflow }) => Object.fromEntries(CONTROLS.map((id) => [
  id,
  Boolean(connected) &&
    (id === 'reset' || LIVE_IN[id].includes(status?.word)) &&
    !heldByProgram(id, { status, workflow }),
]));

const COMMAND = {
  unlock: () => 'unlock',
  hold: (workflow) => (workflow === 'running' ? 'gcode:pause' : 'feedhold'),
  resume: (workflow) => (workflow === 'paused' ? 'gcode:resume' : 'cyclestart'),
  reset: () => 'reset',
};

export const sendControl = (controller, id, workflow) => controller.command(COMMAND[id](workflow));
