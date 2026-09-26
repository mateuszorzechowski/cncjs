import GrblController from '../GrblController';
import config from '../../../services/configstore';
import { WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED } from '../../../lib/Workflow';
import { createController } from '../../__tests__/helpers/createController';
import { GRBL_ACTIVE_STATE_IDLE, GRBL_ACTIVE_STATE_RUN } from '../constants';

jest.mock('../../../lib/logger', () => {
  const quiet = () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), silly: jest.fn() });
  return { __esModule: true, default: quiet, getLevel: jest.fn(() => 'info'), setLevel: jest.fn() };
});

// COM3's limits.
const SETTINGS = {
  $11: '0.010', $12: '0.002',
  $110: '5000', $111: '5000', $112: '5000',
  $120: '500', $121: '500', $122: '300',
};

const MOVES = ['G21 G91', ...Array(20).fill('G1 X-1 F300'), 'M2'].join('\n');

const controllers = [];

const setup = () => {
  jest.spyOn(config, 'get').mockImplementation((key, fallback) => fallback);
  const { controller, writes } = createController(GrblController);
  clearInterval(controller.queryTimer);
  controller.settings = { settings: SETTINGS };
  controller.runner.state.status.activeState = GRBL_ACTIVE_STATE_IDLE;
  controllers.push(controller);
  return { controller, writes };
};

const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

const ok = (controller) => controller.runner.emit('ok', { raw: 'ok' });

afterEach(() => {
  while (controllers.length > 0) {
    const controller = controllers.pop();
    controller.ready = false;
    controller.destroy();
  }
  jest.restoreAllMocks();
});

describe('where a running program is', () => {
  test('the report carries the line being cut, not the lines acknowledged', async () => {
    const { controller } = setup();
    controller.command('gcode:load', 'moves.nc', MOVES);
    await settle();

    controller.command('gcode:start');
    for (let i = 0; i < 16; i++) {
      ok(controller);
    }
    controller.runner.state.status.activeState = GRBL_ACTIVE_STATE_RUN;
    controller.progressAt = Date.now() - 300;
    controller.advanceProgress();

    const { received, progress } = controller.senderStatus();
    expect(received).toBe(16);
    // 0.3 s in: the second move, which is line 3.
    expect(progress.line).toBe(3);
    expect(progress.remaining).toBeGreaterThan(3);
    expect(progress.percent).toBeLessThan(10);
  });

  test('no timeline: the sender counts as it did — but its milliseconds are seconds now', () => {
    const { controller } = setup();
    controller.settings = { settings: {} };

    controller.command('gcode:load', 'moves.nc', MOVES);
    controller.command('gcode:start');
    ok(controller);
    controller.sender.state.remainingTime = 61400;

    expect(controller.senderStatus().progress).toEqual({ line: 1, remaining: 61, percent: 4 });
  });

  test('loaded and not started: the whole program is left', async () => {
    const { controller } = setup();

    controller.command('gcode:load', 'moves.nc', MOVES);
    await settle();

    // Twenty moves of a fifth of a second, and a little to get up to speed.
    expect(controller.senderStatus().progress).toEqual({ line: 0, remaining: 4, percent: 0 });
  });

  test('a timeline that arrives after Start still gets a clock', async () => {
    const { controller } = setup();

    controller.command('gcode:load', 'moves.nc', MOVES);
    controller.command('gcode:start');
    for (let i = 0; i < 16; i++) {
      ok(controller);
    }

    await settle();
    controller.advanceProgress();
    expect(controller.senderStatus().progress.line).toBe(2);
  });

  test('nothing loaded, nothing to report', () => {
    const { controller } = setup();

    expect(controller.senderStatus().progress).toBe(null);
  });
});

describe('a program paused on an error', () => {
  const pausedOnError = (controller) => {
    controller.command('gcode:load', 'bad.nc', 'G0 X-1\nG7');
    controller.command('gcode:start');
    ok(controller);
    controller.runner.emit('error', { raw: 'error:20', message: '20' });
  };

  test('says which line and which error, for the footer to say at once', () => {
    const { controller } = setup();

    pausedOnError(controller);

    expect(controller.workflow.state).toBe(WORKFLOW_STATE_PAUSED);
    expect(controller.senderStatus().error).toEqual({ code: 'error:20', line: 2 });
  });

  test('and forgets it once the program resumes or ends', () => {
    const { controller } = setup();

    pausedOnError(controller);
    controller.command('gcode:resume');
    expect(controller.senderStatus().error).toBe(null);

    pausedOnError(controller);
    controller.command('gcode:stop');
    expect(controller.senderStatus().error).toBe(null);
  });

  test('waits for the operator, even with every line answered', () => {
    const { controller } = setup();
    pausedOnError(controller);
    ok(controller);
    expect(controller.actionTime.senderFinishTime).toBeGreaterThan(0);

    controller.actionTime.senderFinishTime -= 5000;
    controller.finishWhenStopped(true);

    expect(controller.workflow.state).toBe(WORKFLOW_STATE_PAUSED);
  });

  test('and a program that ran to its end still ends by itself', () => {
    const { controller } = setup();
    controller.command('gcode:load', 'fine.nc', 'G0 X-1');
    controller.command('gcode:start');
    ok(controller);
    ok(controller);
    expect(controller.actionTime.senderFinishTime).toBeGreaterThan(0);

    controller.actionTime.senderFinishTime -= 5000;
    controller.finishWhenStopped(true);

    expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);
  });
});
