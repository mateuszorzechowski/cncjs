import GrblController from '../GrblController';
import config from '../../../services/configstore';
import taskRunner from '../../../services/taskrunner';
import units from '../../../services/units';
import { WORKFLOW_STATE_IDLE, WORKFLOW_STATE_RUNNING } from '../../../lib/Workflow';
import { createController } from '../../__tests__/helpers/createController';
import { GRBL_ACTIVE_STATE_ALARM, GRBL_ACTIVE_STATE_IDLE } from '../constants';

jest.mock('../../../lib/logger', () => {
  const quiet = () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), silly: jest.fn() });
  return { __esModule: true, default: quiet, getLevel: jest.fn(() => 'info'), setLevel: jest.fn() };
});

const PROGRAM = 'G0 X-1\nG0 Y-1\nG0 X0\nM30';
// What the sender streams of it: the controller appends `%wait` on load.
const STREAMED = ['G0 X-1', 'G0 Y-1', 'G0 X0', 'M30', 'G4 P0.5'];

const controllers = [];

const startEvent = (commands, trigger = 'gcode') => ({ event: 'gcode:start', trigger, commands, enabled: true });

/** An idle controller with a program loaded and these start events in `.cncrc`. */
const setup = (events = []) => {
  jest.spyOn(config, 'get').mockImplementation((key, fallback) => (key === 'events' ? events : fallback));
  const { controller, writes } = createController(GrblController);
  clearInterval(controller.queryTimer);
  controller.runner.state.status.activeState = GRBL_ACTIVE_STATE_IDLE;
  const refusals = [];
  controller.commandSocket = { id: 'asking', emit: (event, payload) => refusals.push(payload) };
  controller.command('gcode:load', 'part.nc', PROGRAM);
  controllers.push(controller);
  return { controller, refusals, sent: () => writes.map(write => String(write.data).trim()) };
};

const ok = (controller) => controller.runner.emit('ok', { raw: 'ok' });
const error = (controller, code) => controller.runner.emit('error', { raw: `error:${code}`, message: String(code) });

afterEach(() => {
  while (controllers.length > 0) {
    const controller = controllers.pop();
    controller.ready = false;
    controller.destroy();
  }
  units.open({ name: 'mm', restore: false });
  jest.restoreAllMocks();
});

describe('the lines sent before a program', () => {
  test('without any, the program starts at once, as it always did', () => {
    const { controller, sent } = setup();

    controller.command('gcode:start');

    expect(sent()).toEqual(STREAMED);
    expect(controller.workflow.state).toBe(WORKFLOW_STATE_RUNNING);
  });

  test('every one of them goes out, each after the one before is answered, and only then the program', () => {
    const { controller, sent } = setup([startEvent('G21\nG90'), startEvent('G17')]);

    controller.command('gcode:start');
    expect(sent()).toEqual(['G21']);
    expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);

    ok(controller);
    expect(sent()).toEqual(['G21', 'G90']);
    ok(controller);
    expect(sent()).toEqual(['G21', 'G90', 'G17']);
    expect(controller.sender.state.sent).toBe(0);

    ok(controller);
    expect(controller.workflow.state).toBe(WORKFLOW_STATE_RUNNING);
    expect(sent()).toEqual(['G21', 'G90', 'G17', ...STREAMED]);
  });

  test("their ok is not the sender's: the program's first ok is counted as its first line", () => {
    const { controller } = setup([startEvent('G21\nG90')]);

    controller.command('gcode:start');
    ok(controller);
    ok(controller);
    expect(controller.sender.state).toEqual(expect.objectContaining({ sent: STREAMED.length, received: 0 }));

    ok(controller);
    expect(controller.sender.state.received).toBe(1);
  });

  test("with the server keeping the units, its units go first — the events' own may still change them", () => {
    units.open({ name: 'inch', restore: true });
    const { controller, sent } = setup([startEvent('G21')]);

    controller.command('gcode:start');
    ok(controller);

    expect(sent()).toEqual(['G20', 'G21']);
  });

  test('the units alone are enough to hold the program back until they are answered', () => {
    units.open({ name: 'mm', restore: true });
    const { controller, sent } = setup();

    controller.command('gcode:start');
    expect(sent()).toEqual(['G21']);
    expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);

    ok(controller);
    expect(controller.workflow.state).toBe(WORKFLOW_STATE_RUNNING);
  });

  test('a refused one cancels the start, and whoever pressed Start is told', () => {
    const { controller, refusals, sent } = setup([startEvent('G21\nG90')]);

    controller.command('gcode:start');
    controller.commandSocket = null;
    error(controller, 20);
    ok(controller);

    expect(sent()).toEqual(['G21']);
    expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);
    expect(refusals).toEqual([{ cmd: 'gcode:start', reason: 'start-failed' }]);
  });

  test.each([
    ['reset', () => []],
    ['gcode:stop', () => []],
    ['gcode:unload', () => []],
  ])('%s while they are on their way means no program starts', (cmd, args) => {
    const { controller, sent } = setup([startEvent('G21\nG90')]);

    controller.command('gcode:start');
    controller.command(cmd, ...args());
    ok(controller);
    ok(controller);

    expect(sent().filter(line => line.startsWith('G0'))).toEqual([]);
    expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);
    expect(controller.isStarting()).toBe(false);
  });

  test('while they are on their way the machine is held as by a program, and a second Start does nothing', () => {
    const { controller, sent } = setup([startEvent('G21\nG90')]);

    controller.command('gcode:start');
    controller.command('gcode:start');

    expect(controller.clientRefusal('gcode')).toBe('program-running');
    expect(controller.clientRefusal('jogStart')).toBe('program-running');
    expect(controller.clientRefusal('gcode:stop')).toBe(null);
    expect(sent()).toEqual(['G21']);

    ok(controller);
    ok(controller);
    expect(controller.clientRefusal('gcode')).toBe('program-running');
    expect(controller.workflow.state).toBe(WORKFLOW_STATE_RUNNING);
  });

  test('in alarm, where the feeder would drop them, the start is refused', () => {
    const { controller, refusals, sent } = setup([startEvent('G21')]);
    controller.runner.state.status.activeState = GRBL_ACTIVE_STATE_ALARM;

    controller.command('gcode:start');

    expect(sent()).toEqual([]);
    expect(refusals).toEqual([{ cmd: 'gcode:start', reason: 'alarm' }]);
  });

  test('a system event still runs its shell, and holds nothing back', () => {
    const run = jest.spyOn(taskRunner, 'run').mockImplementation(() => {});
    const { controller } = setup([startEvent('echo start', 'system')]);

    controller.command('gcode:start');

    expect(run).toHaveBeenCalledWith('echo start');
    expect(controller.workflow.state).toBe(WORKFLOW_STATE_RUNNING);
  });
});
