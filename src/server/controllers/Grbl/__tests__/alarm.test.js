import GrblController from '../GrblController';
import { createController } from '../../__tests__/helpers/createController';

jest.mock('../../../lib/logger', () => {
  const quiet = () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), silly: jest.fn() });
  return { __esModule: true, default: () => quiet(), getLevel: jest.fn(() => 'info'), setLevel: jest.fn() };
});

const controllers = [];
const setup = () => {
  const { controller } = createController(GrblController);
  clearInterval(controller.queryTimer);
  const told = [];
  controller.sockets.watcher = { emit: (event, payload) => event === 'controller:alarm' && told.push(payload) };
  controllers.push(controller);
  return { controller, told };
};

afterEach(() => {
  while (controllers.length) {
    controllers.pop().destroy();
  }
});

describe('which alarm the machine is in', () => {
  test('is kept from the ALARM line, and told once', () => {
    const { controller, told } = setup();

    controller.runner.parse('ALARM:3');
    // Grbl repeats nothing, but a second report of the same state must not
    // wake every panel again.
    controller.runner.parse('<Alarm|MPos:0.000,0.000,0.000|FS:0,0>');

    expect(controller.alarmCode).toBe(3);
    expect(told).toEqual([3]);
  });

  test('is cleared the moment the machine reports anything but Alarm', () => {
    const { controller, told } = setup();
    controller.runner.parse('ALARM:2');

    controller.runner.parse('<Idle|MPos:0.000,0.000,0.000|FS:0,0>');

    expect(controller.alarmCode).toBeNull();
    expect(told).toEqual([2, null]);
  });

  test('is replayed to a device that attaches afterwards', () => {
    const { controller } = setup();
    controller.runner.parse('ALARM:1');
    const heard = [];
    const late = { id: 'late', emit: (event, payload) => event === 'controller:alarm' && heard.push(payload) };

    controller.addConnection(late);

    expect(heard).toEqual([1]);
  });
});
