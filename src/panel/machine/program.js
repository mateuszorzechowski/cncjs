/**
 * The two job buttons in the status bar: Start, and Pause that becomes Resume.
 *
 * They were drawn from the start and wired to nothing (`canStart={false}`),
 * which went unnoticed until a paused tool change turned out to have no way
 * back from the panel. Found on a screenshot, 2026-09-24.
 *
 * **Start is a move**, so it goes dark for the same reasons the jog pad does —
 * alarm, another device holding the machine — and the server refuses it for
 * those reasons too. **Pause and Resume are not**: they are how a program is
 * steered, and the server lets them through while it runs (`program-gate.js`).
 */
export const programControls = ({ connected, canMove, workflow, job }) => {
  const paused = connected && workflow === 'paused';

  return {
    canStart: Boolean(connected && canMove && job && workflow === 'idle'),
    canPause: Boolean(connected && (workflow === 'running' || paused)),
    paused: Boolean(paused),
  };
};

export const startProgram = (controller) => controller.command('gcode:start');

/** Pause a running program, or resume a paused one. */
export const pressPause = (controller, paused) => (
  controller.command(paused ? 'gcode:resume' : 'gcode:pause')
);
