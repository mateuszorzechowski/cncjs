import { programRefusal } from '../program-gate';

const IDLE = { workflow: 'idle', firmware: 'Idle' };
const RUNNING = { workflow: 'running', firmware: 'Run' };
const TOOL_CHANGE = { workflow: 'paused', firmware: 'Idle' };
const JOGGING_IN_A_PAUSE = { workflow: 'paused', firmware: 'Jog' };
const FEED_HOLD = { workflow: 'paused', firmware: 'Hold' };

const CONTROL = [
  'estop', 'reset', 'feedhold', 'cyclestart', 'statusreport',
  'jogStop', 'jogCancel',
  'feedOverride', 'spindleOverride', 'rapidOverride',
  'gcode:pause', 'gcode:resume', 'gcode:stop', 'pause', 'resume', 'stop',
  'feeder:start', 'feeder:stop', 'lasertest:off', 'realtime',
];
const MANUAL = ['jogStart', 'jogStep', 'jogHold', 'zero', 'goToWorkZero', 'goToPoint', 'homing', 'unlock', 'gcode', 'write', 'macro:run'];
const PROGRAM = ['gcode:load', 'gcode:unload', 'gcode:start', 'start', 'watchdir:load', 'macro:load', 'file:check'];

describe('with no program under way', () => {
  test.each([...CONTROL, ...MANUAL, ...PROGRAM])('%s goes through', (cmd) => {
    expect(programRefusal(cmd, IDLE)).toBeNull();
  });
});

describe('while a program is running', () => {
  test.each(CONTROL)('%s goes through, because it stops, steers or reports', (cmd) => {
    expect(programRefusal(cmd, RUNNING)).toBeNull();
  });

  test.each([...MANUAL, ...PROGRAM])('%s is refused', (cmd) => {
    expect(programRefusal(cmd, RUNNING)).toBe('program-running');
  });
});

describe('paused with the firmware idle — a tool change', () => {
  test.each([...CONTROL, ...MANUAL])('%s goes through', (cmd) => {
    // The operator has to jog to the plate, touch off and zero Z. The job is
    // stopped in the sender and Grbl is standing still, so nothing here can
    // land between two lines of the program.
    expect(programRefusal(cmd, TOOL_CHANGE)).toBeNull();
  });

  test.each(PROGRAM)('%s is refused, because it would replace the paused job', (cmd) => {
    expect(programRefusal(cmd, TOOL_CHANGE)).toBe('program-running');
  });
});

describe('paused, with a jog under way — the tool change, a moment later', () => {
  test.each([...CONTROL, ...MANUAL])('%s goes through', (cmd) => {
    // Grbl reports `Jog` the instant a jog starts, and the held key keeps
    // saying so with `jogHold` every 100ms. Refusing that cut the jog through
    // its deadman and told the operator a program was running — found by
    // Mateusz jogging after a program paused on an error, 2026-09-24.
    expect(programRefusal(cmd, JOGGING_IN_A_PAUSE)).toBeNull();
  });

  test.each(PROGRAM)('%s is still refused', (cmd) => {
    expect(programRefusal(cmd, JOGGING_IN_A_PAUSE)).toBe('program-running');
  });
});

describe('paused with the firmware in hold — a feed hold or M0', () => {
  test.each(CONTROL)('%s goes through', (cmd) => {
    expect(programRefusal(cmd, FEED_HOLD)).toBeNull();
  });

  test.each([...MANUAL, ...PROGRAM])('%s is refused, as while running', (cmd) => {
    // Grbl refuses a jog in Hold itself (error:8), and queues any other line
    // behind the rest of the program. Neither is what the operator meant.
    expect(programRefusal(cmd, FEED_HOLD)).toBe('program-running');
  });
});
