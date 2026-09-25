import GrblController from '../GrblController';
import library from '../../../services/library';
import { createController } from '../../__tests__/helpers/createController';
import { GRBL_ACTIVE_STATE_ALARM, GRBL_ACTIVE_STATE_IDLE } from '../constants';

jest.mock('../../../lib/logger', () => {
  const quiet = () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), silly: jest.fn() });
  return { __esModule: true, default: quiet, getLevel: jest.fn(() => 'info'), setLevel: jest.fn() };
});

jest.mock('../../../services/library', () => ({
  __esModule: true,
  default: {
    stamp: jest.fn(),
    read: jest.fn(),
    setControllerCheck: jest.fn(() => Promise.resolve()),
    setMachine: jest.fn(),
    bounds: jest.fn(() => ({})),
  },
}));

const STAMP = { mtime: '2026-09-25T10:00:00.000Z', size: 42 };
const BANNER = "Grbl 1.1h ['$' for help]";

const controllers = [];

/** A standing, idle controller, with the socket that asks and one that watches. */
const setup = (text = '') => {
  const { controller, writes } = createController(GrblController);
  clearInterval(controller.queryTimer);
  controller.runner.state.status.activeState = GRBL_ACTIVE_STATE_IDLE;
  const refusals = [];
  controller.commandSocket = { id: 'asking', emit: (event, payload) => refusals.push(payload) };
  const events = [];
  controller.sockets.watching = { emit: (event, ...args) => events.push({ event, args }) };
  library.stamp.mockResolvedValue(STAMP);
  library.read.mockResolvedValue(text);
  controllers.push(controller);
  return { controller, writes, refusals, events, sent: () => writes.map(write => String(write.data).trim()) };
};

const settle = () => new Promise((resolve) => setImmediate(resolve));

afterEach(() => {
  while (controllers.length > 0) {
    const controller = controllers.pop();
    controller.ready = false;
    controller.destroy();
  }
  jest.clearAllMocks();
});

describe('file:check', () => {
  test('goes into $C, sends the file, keeps every error, and leaves', async () => {
    const { controller, sent, events } = setup('G21\nG41 G1 X1\nG0 X1');

    controller.command('file:check', { name: 'part.nc' });
    await settle();
    expect(sent()).toEqual(['$C']);

    controller.runner.parse('ok');
    expect(sent()).toEqual(['$C', 'G21', 'G41 G1 X1', 'G0 X1']);
    controller.runner.parse('ok');
    controller.runner.parse('error:20');
    controller.runner.parse('ok');
    expect(sent()[sent().length - 1]).toBe('$C');
    controller.runner.parse('ok');
    controller.runner.parse(BANNER);

    const result = { complete: true, total: 3, errors: [{ code: 'error:20', line: 2, sent: 'G41 G1 X1', count: 1 }], alarm: null, stoppedAt: null };
    expect(library.setControllerCheck).toHaveBeenCalledWith('part.nc', STAMP, { ...result, at: expect.any(String) });
    expect(events.filter(({ event }) => event === 'file:check').pop().args[0]).toMatchObject({ name: 'part.nc', state: 'done', result });
  });

  test('to the first error, when asked', async () => {
    const long = `G1 X${'1'.repeat(36)}`;
    const { controller, sent } = setup(['G41', long, long, long].join('\n'));

    controller.command('file:check', { name: 'part.nc', firstError: true });
    await settle();
    controller.runner.parse('ok');
    controller.runner.parse('error:20');
    controller.runner.parse('ok');
    controller.runner.parse('ok');
    controller.runner.parse('ok');
    controller.runner.parse(BANNER);

    expect(sent().filter(line => line === long)).toHaveLength(2);
    expect(library.setControllerCheck.mock.calls[0][2]).toMatchObject({ complete: false, firstError: true, stoppedAt: 1 });
  });

  test('an alarm ends it and is what is kept', async () => {
    const { controller } = setup('G21\nG53 G0 X10');

    controller.command('file:check', { name: 'part.nc' });
    await settle();
    controller.runner.parse('ok');
    controller.runner.parse('ok');
    controller.runner.parse('ALARM:2');

    expect(library.setControllerCheck.mock.calls[0][2]).toMatchObject({ complete: false, alarm: 'ALARM:2', stoppedAt: 2 });
  });

  test('while it runs the machine is held as by a program: control only', async () => {
    const { controller } = setup('G21');

    controller.command('file:check', { name: 'part.nc' });
    await settle();

    expect(controller.clientRefusal('jogStart')).toBe('program-running');
    expect(controller.clientRefusal('gcode:load')).toBe('program-running');
    expect(controller.clientRefusal('reset')).toBeNull();
  });

  test('its answers are not the feeder\'s', async () => {
    const { controller } = setup('G21\nG0 X1');
    const next = jest.spyOn(controller.feeder, 'next');

    controller.command('file:check', { name: 'part.nc' });
    await settle();
    controller.runner.parse('ok');
    controller.runner.parse('ok');
    controller.runner.parse('error:20');

    expect(next).not.toHaveBeenCalled();
  });

  test.each([
    ['alarm', (controller) => {
      controller.runner.state.status.activeState = GRBL_ACTIVE_STATE_ALARM;
    }],
    ['not-idle', (controller) => {
      controller.runner.state.status.activeState = 'Hold';
    }],
    ['program-running', (controller) => {
      controller.workflow.state = 'paused';
    }],
    ['jogging', (controller) => {
      controller.jogging.dir = { x: 1 };
    }],
  ])('refuses with %s, and sends nothing', async (reason, arrange) => {
    const { controller, writes, refusals } = setup('G21');
    arrange(controller);

    controller.command('file:check', { name: 'part.nc' });
    await settle();

    expect(writes).toEqual([]);
    expect(refusals).toEqual([{ cmd: 'file:check', reason }]);
  });

  test('refuses a second while one runs', async () => {
    const { controller, refusals } = setup('G21');

    controller.command('file:check', { name: 'part.nc' });
    controller.command('file:check', { name: 'part.nc' });

    expect(refusals).toEqual([{ cmd: 'file:check', reason: 'checking' }]);
  });

  test('a file that is gone says so, and frees the machine', async () => {
    const { controller, refusals } = setup();
    library.stamp.mockRejectedValue(Object.assign(new Error('gone'), { code: 'ENOENT' }));

    controller.command('file:check', { name: 'gone.nc' });
    // As CNCEngine does: the asking socket is only known during the call.
    const asker = controller.commandSocket;
    controller.commandSocket = null;
    await settle();
    controller.commandSocket = asker;

    expect(refusals).toEqual([{ cmd: 'file:check', reason: 'not-found' }]);
    expect(controller.clientRefusal('jogStart')).toBeNull();
  });
});

describe('files:fit', () => {
  test('says where each file leaves the table at the current zero, once per change', () => {
    const { controller, events } = setup();
    controller.envelope = { min: { x: -1000, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } };
    controller.runner.settings = { settings: { $20: '1' } };
    controller.runner.state.status.wco = { x: -10, y: -300, z: -70 };
    library.bounds.mockReturnValue({ 'part.nc': { min: { x: -25, y: -25, z: -10 }, max: { x: 25, y: 25, z: 1 } } });

    controller.updateFits();
    controller.updateFits();

    const said = events.filter(({ event }) => event === 'files:fit').map(({ args }) => args[0]);
    expect(said).toEqual([{ softLimits: true, files: { 'part.nc': [{ axis: 'x', side: 'max', by: 15 }] } }]);
  });
});
