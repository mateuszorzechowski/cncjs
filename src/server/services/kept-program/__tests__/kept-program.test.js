import fs from 'fs';
import os from 'os';
import path from 'path';
import GrblController from '../../../controllers/Grbl/GrblController';
import config from '../../configstore';
import heightMap from '../../height-map';
import keptProgram from '..';
import { createController } from '../../../controllers/__tests__/helpers/createController';
import { GRBL_ACTIVE_STATE_IDLE } from '../../../controllers/Grbl/constants';

jest.mock('../../../lib/logger', () => {
  const quiet = () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), silly: jest.fn() });
  return { __esModule: true, default: quiet, getLevel: jest.fn(() => 'info'), setLevel: jest.fn() };
});

const MAP = {
  xs: [0, 20, 40], ys: [0, 20, 40], dz: [[0, 0.1, 0.2], [0, 0.1, 0.2], [0, 0.1, 0.2]], travel: 5,
};
const PROGRAM = 'G21 G90\nG0 X0 Y0 Z2\nG1 Z-0.2 F100\nG1 X40\nG0 Z5';

let dir;
const controllers = [];

const setup = () => {
  jest.spyOn(config, 'get').mockImplementation((key, fallback) => fallback);
  const { controller } = createController(GrblController);
  clearInterval(controller.queryTimer);
  controller.runner.state.status.activeState = GRBL_ACTIVE_STATE_IDLE;
  controller.runner.state.parserstate.modal = { ...controller.runner.state.parserstate.modal, wcs: 'G54' };
  controller.runner.settings.parameters = { G54: { x: '0.000', y: '0.000', z: '0.000' } };
  controller.sockets.watching = { emit: () => {} };
  controllers.push(controller);
  return controller;
};

/** What `open` does once the port answers, without a port: load back what was kept. */
const reopen = () => {
  const controller = setup();
  const kept = keptProgram.kept('/dev/null');
  if (kept) {
    controller.command('gcode:load', kept.name, kept.gcode, kept.context);
  }
  return controller;
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kept-program-'));
  keptProgram.open({ dir, saved: null });
});

afterEach(() => {
  while (controllers.length > 0) {
    const controller = controllers.pop();
    controller.ready = false;
    controller.destroy();
  }
  keptProgram.open({ dir: null, saved: null });
  heightMap.open(null);
  fs.rmSync(dir, { recursive: true, force: true });
  jest.restoreAllMocks();
});

describe('the loaded program kept on the server', () => {
  test('a load writes the file as written; a controller on the same port loads it back', () => {
    setup().command('gcode:load', 'part.nc', PROGRAM, { a: 1 });
    expect(fs.readFileSync(path.join(dir, 'program.nc'), 'utf8')).toBe(PROGRAM);

    const again = reopen();
    expect(again.programSource).toMatchObject({ name: 'part.nc', context: { a: 1 } });
    expect(again.sender.state.total).toBeGreaterThan(0);
  });

  test('with a map, the program as it will be cut is kept beside it', () => {
    heightMap.set(MAP, '/dev/null');
    setup().command('gcode:load', 'part.nc', PROGRAM);

    expect(fs.readFileSync(path.join(dir, 'program-bent.nc'), 'utf8')).toContain('G1 X20 Y0 Z-0.1');
  });

  test('unloaded: nothing to load back', () => {
    const controller = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.command('gcode:unload');

    expect(fs.existsSync(path.join(dir, 'program.nc'))).toBe(false);
    expect(keptProgram.kept('/dev/null')).toBeNull();
  });

  test('another port does not get it', () => {
    setup().command('gcode:load', 'part.nc', PROGRAM);
    expect(keptProgram.kept('COM7')).toBeNull();
  });

  test('read from `.cncrc` at the start, it is there for its port', () => {
    setup().command('gcode:load', 'part.nc', PROGRAM);
    keptProgram.open({ dir, saved: { port: '/dev/null', name: 'part.nc', context: {} } });

    expect(keptProgram.kept('/dev/null')).toEqual({ name: 'part.nc', gcode: PROGRAM, context: {} });
  });
});
