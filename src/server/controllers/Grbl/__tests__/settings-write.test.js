import GrblController from '../GrblController';
import machineSettings from '../../../services/machine-settings';
import delay from '../../../lib/delay';
import { createController } from '../../__tests__/helpers/createController';

jest.mock('../../../lib/logger', () => {
  const quiet = () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), silly: jest.fn() });
  return { __esModule: true, default: () => quiet(), getLevel: jest.fn(() => 'info'), setLevel: jest.fn() };
});

const controllers = [];

/**
 * A controller that has read `$$` once — `$110=500.000`, `$20=1`, `$13=0` —
 * standing in `state`, with a socket asking as `laptop`.
 */
const setup = ({ state = 'Idle', ticking = false } = {}) => {
  machineSettings.open({});
  const { controller, writes } = createController(GrblController);
  if (!ticking) {
    clearInterval(controller.queryTimer);
  }
  controllers.push(controller);
  for (const line of ['$110=500.000', '$20=1', '$13=0']) {
    controller.runner.parse(line);
  }
  controller.runner.state.status.activeState = state;
  const refusals = [];
  controller.commandSocket = {
    id: 'asking',
    device: 'laptop',
    emit: (event, payload) => refusals.push({ event, payload }),
  };
  const socketEvents = [];
  controller.sockets.test = { emit: (event, ...args) => socketEvents.push({ event, args }) };
  return { controller, writes, refusals, socketEvents };
};

const lines = (writes) => writes.map((write) => String(write.data));

afterEach(() => {
  while (controllers.length) {
    const controller = controllers.pop();
    controller.ready = false;
    controller.destroy();
  }
  machineSettings.flush();
});

describe('settings:write', () => {
  test('goes straight onto the wire, and `$$` is read again on its `ok`', () => {
    const { controller, writes } = setup();

    controller.command('settings:write', { name: '$110', value: 800 });
    expect(lines(writes)).toEqual(['$110=800.000\n']);

    controller.runner.parse('ok');
    expect(lines(writes)).toEqual(['$110=800.000\n', '$$\n']);
  });

  test('in alarm too — Grbl takes a setting there, and the feeder would drop it', () => {
    const { controller, writes, refusals } = setup({ state: 'Alarm' });

    controller.command('settings:write', { name: '$20', value: 0 });

    expect(lines(writes)).toEqual(['$20=0\n']);
    expect(refusals).toEqual([]);
  });

  test('a value shown in inches is written in millimetres', () => {
    const { controller, writes } = setup();

    controller.command('settings:write', { name: '$110', value: 20, units: 'inch' });

    expect(lines(writes)).toEqual(['$110=508.000\n']);
  });

  test.each([
    ['Run'], ['Hold'], ['Jog'], ['Home'], ['Check'],
  ])('refused in %s: Grbl would answer error:8', (state) => {
    const { controller, writes, refusals } = setup({ state });

    controller.command('settings:write', { name: '$110', value: 800 });

    expect(writes).toEqual([]);
    expect(refusals).toEqual([{ event: 'command:refused', payload: { cmd: 'settings:write', reason: 'not-idle' } }]);
  });

  test('refused while a program is loaded and paused, whatever Grbl says', () => {
    const { controller, writes, refusals } = setup();
    controller.command('gcode:load', 'a.nc', 'G0 X1');
    controller.workflow.start();
    controller.workflow.pause();
    writes.length = 0;

    controller.command('settings:write', { name: '$110', value: 800 });

    expect(writes).toEqual([]);
    expect(refusals.map(({ payload }) => payload.reason)).toEqual(['not-idle']);
  });

  test.each([
    [{ name: '$110', value: 0 }, 'bad-value'],
    [{ name: '$20', value: 2 }, 'bad-value'],
    [{ name: '$111', value: 500 }, 'unknown-setting'],
    [{ name: '$13', value: 1 }, 'setting-locked'],
  ])('%j is refused as %s, nothing written', (asked, reason) => {
    const { controller, writes, refusals } = setup();

    controller.command('settings:write', asked);

    expect(writes).toEqual([]);
    expect(refusals.map(({ payload }) => payload.reason)).toEqual([reason]);
  });

  test('one at a time: a second write waits for the first one\'s answer', () => {
    const { controller, writes, refusals } = setup();

    controller.command('settings:write', { name: '$110', value: 800 });
    controller.command('settings:write', { name: '$20', value: 0 });

    expect(lines(writes)).toEqual(['$110=800.000\n']);
    expect(refusals.map(({ payload }) => payload.reason)).toEqual(['setting-pending']);
  });

  test('Grbl\'s refusal goes back to the device that asked, with its code', () => {
    const { controller, writes, refusals } = setup();

    controller.command('settings:write', { name: '$110', value: 800 });
    const asker = controller.commandSocket;
    // `CNCEngine` puts it back to null once the command has been handled.
    controller.commandSocket = null;
    controller.runner.parse('error:8');

    expect(lines(writes)).toEqual(['$110=800.000\n']);
    expect(refusals).toEqual([{ event: 'command:refused', payload: { cmd: 'settings:write', reason: 'error:8' } }]);
    expect(asker).toBeTruthy();
    // And the next `ok` is nobody's write: it goes to the feeder as before.
    controller.runner.parse('ok');
    expect(lines(writes)).toEqual(['$110=800.000\n']);
  });

  test('a reset in between drops the answer it was waiting for', () => {
    const { controller, writes } = setup();
    // Past its first startup, so the reset does not read `$$` for itself.
    controller.initialized = true;

    controller.command('settings:write', { name: '$110', value: 800 });
    controller.runner.parse('Grbl 1.1h [\'$\' for help]');
    controller.runner.parse('ok');

    expect(lines(writes).filter((line) => line === '$$\n')).toEqual([]);
  });
});

describe('the copy and the history', () => {
  test('the new value `$$` reports is a change, put down to the device that wrote it', () => {
    const { controller } = setup();

    controller.command('settings:write', { name: '$110', value: 800 });
    controller.runner.parse('ok');
    controller.runner.parse('$110=800.000');

    expect(machineSettings.saved().history).toEqual([
      expect.objectContaining({ name: '$110', from: '500.000', to: '800.000', device: 'laptop' }),
    ]);
    expect(machineSettings.saved().copy.values).toEqual(expect.objectContaining({ '$110': '800.000' }));
  });

  test('a change made anywhere else is in the history too, from nobody', () => {
    const { controller } = setup();

    // Typed into a console, and read back the next time `$$` came round.
    controller.runner.parse('$20=0');

    expect(machineSettings.saved().history).toEqual([
      expect.objectContaining({ name: '$20', from: '1', to: '0', device: null }),
    ]);
  });

  test('every client is sent the rows and the history beside `controller:settings`', async () => {
    const { controller, socketEvents } = setup({ ticking: true });
    controller.ready = true;
    controller.runner.parse('$20=0');
    await delay(250);

    const sent = socketEvents.filter(({ event }) => event === 'machine:settings').pop();
    expect(sent.args[0].rows.map(({ name, value }) => [name, value])).toEqual([['$13', 0], ['$20', 0], ['$110', 500]]);
    expect(sent.args[0].history).toEqual([expect.objectContaining({ name: '$20', to: '0' })]);
  });
});
