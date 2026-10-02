import GrblController from '../GrblController';
import { programRefusal } from '../program-gate';
import { createProbeRun, offsetFor, offsetLine } from '../probe-run';
import probeSettings from '../../../services/probe';
import heightMap from '../../../services/height-map';
import { createController } from '../../__tests__/helpers/createController';
import { GRBL_ACTIVE_STATE_ALARM, GRBL_ACTIVE_STATE_IDLE } from '../constants';

jest.mock('../../../lib/logger', () => {
  const quiet = () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), silly: jest.fn() });
  return { __esModule: true, default: quiet, getLevel: jest.fn(() => 'info'), setLevel: jest.fn() };
});

const BANNER = "Grbl 1.1h ['$' for help]";
const controllers = [];

/**
 * An idle Grbl in G54, the tool at machine Z0 over a work zero 30 mm down,
 * with the socket that asks and one that watches.
 */
const setup = () => {
  const { controller, writes } = createController(GrblController);
  clearInterval(controller.queryTimer);
  const { state } = controller.runner;
  state.status.activeState = GRBL_ACTIVE_STATE_IDLE;
  state.status.mpos = { x: '0.000', y: '0.000', z: '0.000' };
  state.status.wpos = { x: '0.000', y: '0.000', z: '30.000' };
  state.parserstate.modal = { ...state.parserstate.modal, wcs: 'G54', distance: 'G91', units: 'G21' };
  controller.runner.settings.parameters = {
    G54: { x: '0.000', y: '0.000', z: '-30.000' },
    G92: { x: '0.000', y: '0.000', z: '0.000' },
    TLO: '0.000',
  };
  const refusals = [];
  controller.commandSocket = { id: 'asking', device: 'laptop', emit: (event, payload) => refusals.push(payload) };
  const events = [];
  controller.sockets.watching = { emit: (event, ...args) => events.push({ event, args }) };
  controllers.push(controller);
  const sent = () => writes.map((write) => String(write.data).trim());
  const probeStates = () => events.filter(({ event }) => event === 'probe:state').map(({ args }) => args[0]);
  return { controller, sent, refusals, probeStates };
};

beforeEach(() => {
  probeSettings.open({});
});

afterEach(() => {
  while (controllers.length > 0) {
    const controller = controllers.pop();
    controller.ready = false;
    controller.destroy();
  }
});

describe('probe:start', () => {
  test('touches the plate twice, and holds the zero it found for the operator', () => {
    const { controller, sent, probeStates } = setup();

    controller.command('probe:start', { method: 'z' });
    // Work coordinates: machine Z-15 is work Z15 with the zero 30 mm down.
    expect(sent()).toEqual(['G90 G21 G38.2 Z15 F100']);

    controller.runner.parse('[PRB:0.000,0.000,-7.000:1]');
    controller.runner.parse('ok');
    controller.runner.parse('ok');
    controller.runner.parse('ok');
    controller.runner.parse('[PRB:0.000,0.000,-7.100:1]');
    controller.runner.parse('ok');
    controller.runner.parse('ok');
    expect(sent().slice(1)).toEqual([
      'G90 G21 G53 G0 Z-5',
      // A clip still touching as the tool backs off would fail the slow touch.
      'G4 P0.5',
      'G90 G21 G38.2 Z21 F25',
      // Off the touch and up clear of the plate, so it can come out from under the tool: two rapids the same
      // way, one move.
      'G90 G21 G53 G0 Z2.9',
      // The modes it found, put back.
      'G91 G21',
    ]);
    controller.runner.parse('ok');

    // The top of the work is 10 mm under the touch: G54 Z moves up 12.9 mm.
    const last = probeStates().pop();
    expect(last).toMatchObject({ method: 'z', wcs: 'G54', state: 'measured' });
    expect(last.result.offset.z).toBeCloseTo(-17.1, 6);
    expect(last.result.shift.z).toBeCloseTo(12.9, 6);
  });

  test('writes nothing to the offsets until the operator confirms', () => {
    const { controller, sent } = setup();
    controller.command('probe:start', { method: 'z' });
    for (const line of ['[PRB:0,0,-7:1]', 'ok', 'ok', 'ok', '[PRB:0,0,-7:1]', 'ok', 'ok', 'ok', 'ok']) {
      controller.runner.parse(line);
    }

    expect(sent().some((line) => line.includes('G10'))).toBe(false);

    controller.command('probe:apply');
    expect(sent().pop()).toBe('G21 G10 L2 P1 Z-17');
    expect(controller.probe).toBeNull();
  });

  test('a plate not found is said, and the zero stays where it was', () => {
    const { controller, sent, probeStates } = setup();
    controller.command('probe:start', { method: 'z' });

    // COM3's order for a G38.2 that touched nothing.
    controller.runner.parse('ALARM:5');
    controller.runner.parse('[PRB:0.000,0.000,-3.000:0]');
    controller.runner.parse('ok');

    expect(probeStates().pop()).toMatchObject({ state: 'failed', failure: { code: 'ALARM:5', phase: 'z-fast' }, result: null });
    expect(sent()).toHaveLength(1);
    controller.command('probe:apply');
    expect(sent()).toHaveLength(1);
  });

  test('an alarm that sends no ok — a soft limit — ends it all the same', () => {
    const { controller, probeStates } = setup();
    controller.command('probe:start', { method: 'z' });

    // COM3, 2026-09-29: a start above the soft limits, and nothing after this.
    controller.runner.parse('ALARM:2');

    expect(probeStates().pop()).toMatchObject({ state: 'failed', failure: { code: 'ALARM:2' } });
    expect(controller.clientRefusal('jogStart')).toBeNull();
  });

  test('a reset in the middle ends it', () => {
    const { controller, probeStates } = setup();
    controller.command('probe:start', { method: 'z' });

    controller.runner.parse(BANNER);

    expect(probeStates().pop()).toMatchObject({ state: 'failed', failure: { code: 'reset' } });
  });

  test('while it measures the machine is held as by a program: control only', () => {
    const { controller } = setup();
    controller.command('probe:start', { method: 'z' });

    expect(controller.clientRefusal('jogStart')).toBe('program-running');
    expect(controller.clientRefusal('probe:start')).toBe('program-running');
    expect(controller.clientRefusal('reset')).toBeNull();
    expect(controller.clientRefusal('feedhold')).toBeNull();
  });

  test('its answers are not the feeder\'s', () => {
    const { controller } = setup();
    const next = jest.spyOn(controller.feeder, 'next');
    controller.command('probe:start', { method: 'z' });
    controller.runner.parse('[PRB:0,0,-7:1]');
    controller.runner.parse('ok');

    expect(next).not.toHaveBeenCalled();
  });

  test.each([
    ['alarm', { method: 'z' }, (controller) => {
      controller.runner.state.status.activeState = GRBL_ACTIVE_STATE_ALARM;
    }],
    ['bad-method', { method: 'laser' }, () => {}],
    ['bad-corner', { method: 'corner', options: { corner: 'middle' } }, () => {}],
    ['not-idle', { method: 'z' }, (controller) => {
      controller.runner.state.status.activeState = 'Hold';
    }],
    ['jogging', { method: 'z' }, (controller) => {
      controller.jogging.dir = { z: -1 };
    }],
    // The clip already on the tool: Grbl would alarm the moment the line arrived.
    ['probe-triggered', { method: 'z' }, (controller) => {
      controller.runner.state.status.pinState = 'P';
    }],
  ])('refuses with %s, and nothing goes out', (reason, request, arrange) => {
    const { controller, sent, refusals } = setup();
    arrange(controller);

    controller.command('probe:start', request);

    expect(sent()).toEqual([]);
    expect(refusals.map(({ reason: said }) => said)).toEqual([reason]);
  });

  test('the paper needs no probe input, so a lit one does not stop it', () => {
    const { controller, sent, refusals, probeStates } = setup();
    controller.runner.state.status.pinState = 'P';

    controller.command('probe:start', { method: 'paper', options: { edge: 'z' } });
    controller.runner.parse('ok');
    controller.runner.parse('ok');

    expect(refusals).toEqual([]);
    // Off the top by the paper's lift, then the modes put back.
    expect(sent()).toEqual(['G90 G21 G53 G0 Z2', 'G91 G21']);
    // Machine Z0 less a tenth of paper, against G54's -30: the zero moves up 29.9.
    expect(probeStates().pop().result.shift.z).toBeCloseTo(29.9, 6);
  });

  test('not in a pause, for now', () => {
    expect(programRefusal('probe:start', { workflow: 'paused', firmware: 'Idle' })).toBe('program-running');
    expect(programRefusal('probe:apply', { workflow: 'paused', firmware: 'Idle' })).toBe('program-running');
  });
});

describe('the runner', () => {
  const steps = [
    { kind: 'touch', phase: 'z', feed: 50, keep: 'z', to: (here) => ({ z: here.z - 10 }) },
    { kind: 'move', phase: 'up', to: (here) => ({ z: here.z + 2 }) },
  ];
  const running = () => {
    const lines = [];
    const done = jest.fn();
    const run = createProbeRun({ steps, start: { x: 0, y: 0, z: 0 }, wco: { x: 0, y: 0, z: 0 }, restore: 'G90 G20', write: (line) => lines.push(line), done });
    run.start();
    return { run, lines, done };
  };

  test('an error ends it, and still puts the modes back', () => {
    const { run, lines, done } = running();

    run.error('error:9');
    expect(lines.pop()).toBe('G90 G20');
    run.ok();

    expect(done).toHaveBeenCalledWith({ failure: 'error:9', phase: 'z' });
  });

  test('goes on from where the touch was, not where it was sent', () => {
    const { run, lines } = running();

    run.prb({ x: 0, y: 0, z: -4, result: 1 });
    run.ok();

    expect(lines).toEqual(['G90 G21 G38.2 Z-10 F50', 'G90 G21 G53 G0 Z-2']);
  });

  test('joins rapids in a row along one axis the same way, and nothing else', () => {
    const lines = [];
    const run = createProbeRun({
      steps: [
        { kind: 'move', phase: 'off', to: (here) => ({ x: here.x + 2 }) },
        { kind: 'move', phase: 'centre', to: () => ({ x: 10 }) },
        // Back the other way: a move of its own.
        { kind: 'move', phase: 'back', to: (here) => ({ x: here.x - 1 }) },
        // Another axis: a move of its own.
        { kind: 'move', phase: 'up', to: (here) => ({ z: here.z + 5 }) },
        // A touch after a rapid the same way: never joined.
        { kind: 'touch', phase: 'z', feed: 50, to: (here) => ({ z: here.z + 1 }) },
      ],
      start: { x: 0, y: 0, z: 0 }, wco: { x: 0, y: 0, z: 0 }, restore: 'G90', write: (line) => lines.push(line), done: () => {},
    });
    run.start();
    run.ok();
    run.ok();
    run.ok();
    expect(lines).toEqual(['G90 G21 G53 G0 X10', 'G90 G21 G53 G0 X9', 'G90 G21 G53 G0 Z5', 'G90 G21 G38.2 Z6 F50']);
  });
});

describe('the offset it writes', () => {
  test('takes G92 and the tool length off, as Grbl adds them on', () => {
    expect(offsetFor({ x: 10, z: -50 }, { g92: { x: 2, z: 1 }, tlo: 3 })).toEqual({ x: 8, z: -54 });
  });

  test('is written in millimetres whatever the modes', () => {
    expect(offsetLine(2, { x: 1.23456, y: -4 })).toBe('G21 G10 L2 P2 X1.235 Y-4');
  });
});

describe('probe:stage', () => {
  const stages = (controller) => controller.__events.filter(({ event }) => event === 'probe:stage').map(({ args }) => args[0]);

  const watched = () => {
    const made = setup();
    const events = [];
    made.controller.sockets.watching = { emit: (event, ...args) => events.push({ event, args }) };
    made.controller.__events = events;
    return made;
  };
  const as = (controller, id) => {
    controller.commandSocket = { id, device: id, emit: () => {} };
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  test('where the wizard waits is said to every device with whose it is, and a measurement starting ends it', () => {
    const { controller } = watched();

    as(controller, 'pc');
    controller.command('probe:stage', { method: 'paper', options: { edge: 'x-left' }, step: 'measure', own: true });
    expect(controller.probeStage).toEqual({
      method: 'paper', options: { edge: 'x-left' }, step: 'measure', owner: { device: 'pc', name: null },
    });

    controller.command('probe:start', { method: 'z' });
    expect(controller.probeStage).toBeNull();
    expect(stages(controller).pop()).toBeNull();
  });

  test('a device that joined moves the step on; the wizard stays with its owner', () => {
    const { controller } = watched();

    as(controller, 'pc');
    controller.command('probe:stage', { method: 'paper', step: 'position', own: true });
    as(controller, 'phone');
    controller.command('probe:stage', { method: 'paper', step: 'measure' });

    expect(controller.probeStage).toMatchObject({ step: 'measure', owner: { device: 'pc' } });
  });

  test('one at a time: a device reaching the step with a wizard of its own takes it over', () => {
    const { controller } = watched();

    as(controller, 'pc');
    controller.command('probe:stage', { method: 'z', step: 'position', own: true });
    as(controller, 'phone');
    controller.command('probe:stage', { method: 'corner', options: { corner: 'back-left' }, step: 'position', own: true });

    expect(controller.probeStage).toMatchObject({ method: 'corner', owner: { device: 'phone' } });
    // The one taken over from leaving is not the owner's leaving.
    controller.removeConnection({ id: 'pc' });
    expect(controller.probeStage.owner).toEqual({ device: 'phone', name: null });
  });

  test('the owner going lets it go: a device in it takes it on, or after a while it ends', () => {
    jest.useFakeTimers();
    const { controller } = watched();

    as(controller, 'pc');
    controller.command('probe:stage', { method: 'z', step: 'position', own: true });
    controller.removeConnection({ id: 'pc' });
    expect(controller.probeStage).toMatchObject({ method: 'z', owner: null });

    as(controller, 'phone');
    controller.command('probe:stage', { method: 'z', step: 'position', own: true });
    jest.advanceTimersByTime(10000);
    expect(controller.probeStage.owner).toEqual({ device: 'phone', name: null });

    // Let go on purpose, and nobody takes it on.
    controller.command('probe:stage', { release: true });
    expect(controller.probeStage.owner).toBeNull();
    jest.advanceTimersByTime(10000);
    expect(controller.probeStage).toBeNull();
  });

  test('only the owner lets it go', () => {
    const { controller } = watched();

    as(controller, 'pc');
    controller.command('probe:stage', { method: 'z', step: 'position', own: true });
    as(controller, 'phone');
    controller.command('probe:stage', { release: true });

    expect(controller.probeStage.owner).toEqual({ device: 'pc', name: null });
  });

  test('a stage that is not one ends it', () => {
    const { controller } = watched();

    as(controller, 'pc');
    controller.command('probe:stage', { method: 'z', step: 'position', own: true });
    controller.command('probe:stage', { method: 'nope', step: 'position' });
    expect(controller.probeStage).toBeNull();
  });

  test('is said while a program runs: it reaches no machine', () => {
    expect(programRefusal('probe:stage', { workflow: 'running', firmware: 'Run' })).toBeNull();
  });
});

describe('the height map', () => {
  beforeEach(() => {
    heightMap.open(null);
  });

  // Every touch of a 2×2 map answered, the board flat but for the last point, 0.2 mm up.
  const answerAll = (controller, sent) => {
    const tops = [-7, -7, -7, -6.8];
    // Each line answered as Grbl would: a touch with its report, everything with an ok.
    for (let k = 0; k < 200 && controller.probe?.run; k++) {
      if (sent().at(-1).includes('G38.2')) {
        controller.runner.parse(`[PRB:0,0,${tops[controller.probe.marks.length - 1]}:1]`);
      }
      controller.runner.parse('ok');
    }
  };

  test('its area is read in the units it was given in', () => {
    const { controller, sent } = setup();
    controller.command('probe:start', { method: 'height-map', options: { x: [0, 1], y: [0, 1], nx: 2, ny: 2 }, units: 'inch' });
    // Over the first point first, at the height the tool stands.
    expect(sent()[0]).toBe('G90 G21 G53 G0 X0 Y0');
    expect(controller.probe.options).toEqual({
      x: [0, 25.4], y: [0, 25.4], nx: 2, ny: 2, tool: 'board',
    });
  });

  test('an area that is no grid is refused, and nothing moves', () => {
    const { controller, sent, refusals } = setup();
    controller.command('probe:start', { method: 'height-map', options: { x: [0, 0], y: [0, 10], nx: 2, ny: 2 } });
    expect(sent()).toEqual([]);
    expect(refusals.pop()).toMatchObject({ cmd: 'probe:start', reason: 'bad-area' });
  });

  test('measured, it is a map to keep, not a zero: confirmed, the server keeps it and says so', () => {
    const { controller, sent } = setup();
    const events = [];
    controller.sockets.watching.emit = (event, ...args) => events.push({ event, args });
    controller.command('probe:start', { method: 'height-map', options: { x: [0, 10], y: [0, 10], nx: 2, ny: 2 } });
    answerAll(controller, sent);

    const result = controller.probe.result;
    expect(result.map.dz[1][0]).toBeCloseTo(0.2, 6);
    // Each point once, in the order it was gone to: the second row backwards.
    // The heights as they came in, from the first point's: the last 0.2 mm up.
    expect(controller.probeReport().partial).toMatchObject({ low: 0, high: expect.closeTo(0.2, 6) });
    expect(controller.probeReport().partial.heights).toHaveLength(4);
    expect(controller.probeReport().marks).toEqual([{ n: 0, i: 0, j: 0 }, { n: 1, i: 1, j: 0 }, { n: 2, i: 1, j: 1 }, { n: 3, i: 0, j: 1 }]);
    expect(heightMap.current()).toBeNull();

    controller.command('probe:apply');
    expect(sent().some((line) => line.includes('G10'))).toBe(false);
    expect(heightMap.current()).toMatchObject({ xs: [0, 10], ys: [0, 10] });
    expect(events.find(({ event }) => event === 'height-map:state').args[0]).toMatchObject({ xs: [0, 10] });
  });
});
