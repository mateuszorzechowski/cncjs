import GrblController from '../GrblController';
import config from '../../../services/configstore';
import heightMap from '../../../services/height-map';
import { createController } from '../../__tests__/helpers/createController';
import { GRBL_ACTIVE_STATE_IDLE } from '../constants';

jest.mock('../../../lib/logger', () => {
  const quiet = () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), silly: jest.fn() });
  return { __esModule: true, default: quiet, getLevel: jest.fn(() => 'info'), setLevel: jest.fn() };
});

// A board tilting up along X, measured over machine X 0..40, Y 0..40.
const MAP = {
  xs: [0, 20, 40], ys: [0, 20, 40], dz: [[0, 0.1, 0.2], [0, 0.1, 0.2], [0, 0.1, 0.2]], travel: 5,
};

// Ten lines, two blank.
const PROGRAM = ['(engrave)', 'G21 G90', '', 'G0 X0 Y0 Z2', 'G1 Z-0.2 F100', 'G1 X40', '', 'G1 Y40', 'G0 Z5', 'M2'].join('\n');

const controllers = [];

const setup = () => {
  jest.spyOn(config, 'get').mockImplementation((key, fallback) => fallback);
  const { controller } = createController(GrblController);
  clearInterval(controller.queryTimer);
  const { state } = controller.runner;
  state.status.activeState = GRBL_ACTIVE_STATE_IDLE;
  state.parserstate.modal = { ...state.parserstate.modal, wcs: 'G54' };
  controller.runner.settings.parameters = { G54: { x: '0.000', y: '0.000', z: '0.000' } };
  const refusals = [];
  controller.commandSocket = { id: 'asking', emit: (event, payload) => refusals.push(payload) };
  const events = [];
  controller.sockets.watching = { emit: (event, ...args) => events.push({ event, args }) };
  controllers.push(controller);
  const status = () => controller.senderStatus();
  return { controller, refusals, events, status };
};

afterEach(() => {
  while (controllers.length > 0) {
    const controller = controllers.pop();
    controller.ready = false;
    controller.destroy();
  }
  heightMap.open(null);
  jest.restoreAllMocks();
});

describe('a program bent to the height map', () => {
  test('without a map there is nothing to turn on', () => {
    const { controller, refusals, status } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);

    expect(status().heightMap).toBeNull();
    controller.command('height-map:use', true);
    expect(refusals.pop()).toMatchObject({ cmd: 'height-map:use', reason: 'no-map' });
  });

  test('worked out at the load; turned on, the sender holds it, and every count is still the file\'s', () => {
    heightMap.set(MAP);
    const { controller, status } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    const asWritten = status();
    expect(asWritten.heightMap).toEqual({ on: false, refused: null });

    controller.command('height-map:use', true);
    const bent = controller.sender.state.lines;
    expect(bent.length).toBeGreaterThan(asWritten.total);
    expect(bent).toContain('G1 X20 Y0 Z-0.1');
    expect(status()).toMatchObject({ total: asWritten.total, heightMap: { on: true, refused: null } });

    // The sender through all of it: the file's last line.
    controller.sender.state.received = bent.length;
    expect(status().received).toBe(asWritten.total);
    // Through the cut along X, cut in two: still the file's `G1 X40`, the fifth line that is not blank.
    controller.sender.state.received = bent.indexOf('X40 Y0 Z0') + 1;
    expect(status().received).toBe(5);
  });

  test('a new device is handed the file as written, not the bent lines', () => {
    heightMap.set(MAP);
    const { controller } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.command('height-map:use', true);

    const got = [];
    controller.addConnection({ id: 'new', emit: (event, ...args) => got.push({ event, args }) });
    const load = got.find(({ event }) => event === 'gcode:load');
    expect(load.args[1]).toBe(controller.programSource.gcode);
    expect(load.args[1]).not.toMatch(/Z-0\.1/);
  });

  test('turned off, the sender holds the file again', () => {
    heightMap.set(MAP);
    const { controller } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.command('height-map:use', true);
    controller.command('height-map:use', false);

    expect(controller.sender.state.gcode).toBe(controller.programSource.gcode);
    expect(controller.senderStatus().heightMap).toEqual({ on: false, refused: null });
  });

  test('a program the map does not cover cannot be bent, and says which line', () => {
    heightMap.set(MAP);
    const { controller, refusals, status } = setup();
    controller.command('gcode:load', 'wide.nc', 'G0 X0 Y0 Z2\nG1 Z-0.2 F100\nG1 X80');

    expect(status().heightMap).toEqual({ on: false, refused: { code: 'outside-map', line: 2 } });
    controller.command('height-map:use', true);
    expect(refusals.pop()).toMatchObject({ reason: 'outside-map', line: 2 });
    expect(controller.bentOn).toBe(false);
  });

  test('X0 moved since it was bent: bent again over the new place before it starts', () => {
    heightMap.set(MAP);
    const { controller, refusals } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.command('height-map:use', true);
    expect(controller.sender.state.lines).toContain('G1 X20 Y0 Z-0.1');

    // The zero 5 mm to the right: the program's X0 is over the machine's X5, bent by the surface there.
    controller.runner.settings.parameters = { G54: { x: '5.000', y: '0.000', z: '0.000' } };
    controller.command('gcode:start');
    expect(controller.bent.wco).toEqual({ x: 5, y: 0 });
    expect(controller.sender.state.lines).toContain('G1 X0 Y0 Z-0.175 F100');

    // 15 mm: the program reaches machine X 55, past the map by more than half a step — refused, as written again.
    controller.command('gcode:stop');
    controller.runner.settings.parameters = { G54: { x: '15.000', y: '0.000', z: '0.000' } };
    controller.command('gcode:start');
    expect(refusals.pop()).toMatchObject({ cmd: 'gcode:start', reason: 'outside-map', line: 5 });
    expect(controller.bentOn).toBe(false);
    expect(controller.sender.state.gcode).toBe(controller.programSource.gcode);
  });

  test('a new map bends the loaded program again', () => {
    heightMap.set(MAP);
    const { controller } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.command('height-map:use', true);
    controller.probe = { method: 'height-map', wcs: 'G54', result: { map: { ...MAP, dz: MAP.dz.map((row) => row.map((v) => v * 2)) } } };
    controller.command('probe:apply');

    expect(controller.bentOn).toBe(true);
    expect(controller.sender.state.lines).toContain('G1 X20 Y0 Z0');
  });

  test('the bent program is there to draw, with the sender count beside the file count', () => {
    heightMap.set(MAP);
    const { controller } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    expect(controller.bentProgram('kept').gcode).toContain('G1 X20 Y0 Z-0.1');
    expect(controller.bentProgram('result')).toBeNull();

    controller.command('height-map:use', true);
    controller.sender.state.received = 7;
    const status = controller.senderStatus();
    // The file's count for the file's drawing, the bent one's for the bent drawing.
    expect(status.heightMap.received).toBe(7);
    expect(status.received).toBeLessThan(7);
  });

  test('a map just measured bends the loaded program for the result, before it is kept', () => {
    const { controller } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.probe = { method: 'height-map', wcs: 'G54' };
    const strategy = { map: () => MAP };
    controller.probe.run = null;
    controller.endProbe(strategy, {}, { seen: {} });
    expect(controller.bentProgram('result').gcode).toContain('G1 X20 Y0 Z-0.1');
  });

  test('another program loaded while the result waits: the result bends that one, unloaded none', () => {
    const { controller } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.probe = { method: 'height-map', wcs: 'G54' };
    controller.endProbe({ map: () => MAP }, {}, { seen: {} });

    controller.command('gcode:load', 'other.nc', ['G21 G90', 'G0 X0 Y20 Z2', 'G1 Z-0.3 F100', 'G1 X40'].join('\n'));
    expect(controller.bentProgram('result').gcode).toContain('X20 Y20 Z-0.2');
    expect(controller.bentProgram('result').gcode).not.toContain('X20 Y0');
    controller.command('gcode:unload');
    expect(controller.bentProgram('result')).toBeNull();
  });
});

describe('a height map that may no longer be where the machine thinks', () => {
  test('read from `.cncrc` when the server starts, it is in doubt: the switch is refused', () => {
    heightMap.open(MAP);
    const { controller, refusals, status } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);

    expect(heightMap.current()).toMatchObject({ doubt: { code: 'restart' } });
    expect(status().heightMap).toEqual({ on: false, refused: null });
    controller.command('height-map:use', true);
    expect(refusals.pop()).toMatchObject({ cmd: 'height-map:use', reason: 'map-doubt' });
    expect(controller.bentOn).toBe(false);
  });

  test('measured again, it is trusted', () => {
    heightMap.open(MAP);
    const { controller } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.probe = { method: 'height-map', wcs: 'G54', result: { map: MAP } };
    controller.command('probe:apply');

    expect(heightMap.current()).toMatchObject({ port: '/dev/null', doubt: null });
    controller.command('height-map:use', true);
    expect(controller.bentOn).toBe(true);
  });

  test('an alarm that loses the position puts it in doubt and the program back to as written', () => {
    heightMap.set(MAP, '/dev/null');
    const { controller, events } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.command('height-map:use', true);
    controller.runner.parse('ALARM:3');

    expect(heightMap.current()).toMatchObject({ doubt: { code: 'position-lost' } });
    expect(controller.bentOn).toBe(false);
    expect(controller.sender.state.gcode).toBe(controller.programSource.gcode);
    expect(events.some(({ event, args }) => event === 'height-map:state' && args[0]?.doubt)).toBe(true);
  });

  test('an alarm that keeps it — a soft limit — does not', () => {
    heightMap.set(MAP, '/dev/null');
    const { controller } = setup();
    controller.runner.parse('ALARM:2');

    expect(heightMap.current().doubt).toBeNull();
  });

  test('the port closed: in doubt', () => {
    heightMap.set(MAP, '/dev/null');
    const { controller } = setup();
    jest.spyOn(controller, 'isClose').mockReturnValue(true);
    controller.close(() => {});

    expect(heightMap.current()).toMatchObject({ doubt: { code: 'port-closed' } });
  });

  test('put in doubt while the program ran: the next start is refused and the program is as written', () => {
    heightMap.set(MAP, '/dev/null');
    const { controller, refusals } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.command('height-map:use', true);
    controller.workflow.start();
    controller.doubtMap('position-lost');
    expect(controller.bentOn).toBe(true);
    controller.workflow.stop();

    controller.command('gcode:start');
    expect(refusals.pop()).toMatchObject({ cmd: 'gcode:start', reason: 'map-doubt' });
    expect(controller.bentOn).toBe(false);
  });

  test('a map measured on another port is not for this machine', () => {
    heightMap.set(MAP, 'COM7');
    const { controller, status } = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);

    expect(status().heightMap).toBeNull();
    controller.doubtMap('port-closed');
    expect(heightMap.current().doubt).toBeNull();
  });
});
