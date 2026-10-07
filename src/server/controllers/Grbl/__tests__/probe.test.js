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
  // The operator's own modes before a measurement: relative feeds at 500 — put back after it.
  state.parserstate.modal = {
    ...state.parserstate.modal, motion: 'G1', feedrate: 'G94', wcs: 'G54', distance: 'G91', units: 'G21',
  };
  state.parserstate.feedrate = '500';
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
    expect(sent()).toEqual(['G90 G21 G94 G38.2 Z15 F100']);

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
      'G90 G21 G94 G38.2 Z21 F25',
      // Off the touch and up clear of the plate, so it can come out from under the tool: two rapids the same
      // way, one move.
      'G90 G21 G53 G0 Z2.9',
      // The modes it found, put back: the motion mode, the feed's and its rate too (audit I2).
      'G1 G94 G91 G21 F500',
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
    for (const line of ['[PRB:0,0,-7:1]', 'ok', 'ok', 'ok', '[PRB:0,0,-7:1]', 'ok', 'ok', 'ok']) {
      controller.runner.parse(line);
    }

    expect(sent().some((line) => line.includes('G10'))).toBe(false);

    controller.command('probe:apply');
    expect(sent().pop()).toBe('G21 G10 L2 P1 Z-17');
    expect(controller.probe).toBeNull();
  });

  test('the offset is worked out again when written, from G92 and the tool length as they are then (audit K3)', () => {
    const { controller, sent } = setup();
    controller.command('probe:start', { method: 'z' });
    for (const line of ['[PRB:0,0,-7:1]', 'ok', 'ok', 'ok', '[PRB:0,0,-7:1]', 'ok', 'ok', 'ok']) {
      controller.runner.parse(line);
    }
    // A tool length offset set since — the old application's tool change, a G43.1 typed in.
    controller.runner.settings.parameters.TLO = '4.000';

    controller.command('probe:apply');
    expect(sent().pop()).toBe('G21 G10 L2 P1 Z-21');
  });

  test('after a reset the offsets are asked again before a zero is written: G92 and the tool length are gone with it', () => {
    const { controller, sent } = setup();
    Object.assign(controller, { ready: true, initialized: true });
    controller.runner.settings.parameters.G92 = { x: '0.000', y: '0.000', z: '5.000' };
    controller.command('probe:start', { method: 'z' });
    for (const line of ['[PRB:0,0,-7:1]', 'ok', 'ok', 'ok', '[PRB:0,0,-7:1]', 'ok', 'ok', 'ok']) {
      controller.runner.parse(line);
    }
    controller.runner.parse(BANNER);
    const before = sent().length;

    controller.command('probe:apply');
    expect(sent()).toHaveLength(before);
    expect(controller.offsetsStale).toBe(true);

    // `$#` answered: G92 cleared by the reset.
    controller.runner.settings.parameters.G92 = { x: '0.000', y: '0.000', z: '0.000' };
    controller.offsetsStale = false;
    controller.runner.parse('<Idle|MPos:0.000,0.000,0.000|FS:0,0|WCO:0.000,0.000,-30.000>');
    expect(sent().pop()).toBe('G21 G10 L2 P1 Z-17');
  });

  test.each([
    ['a limit alarm', (controller) => controller.runner.parse('ALARM:1')],
    ['a homing cycle', (controller) => {
      controller.homing.pending = true;
      controller.runner.parse('ok');
    }],
  ])('a zero waiting for Zapisz is void after %s: the machine\'s coordinates may have moved (audit K12)', (_why, happen) => {
    const { controller, sent, probeStates, refusals } = setup();
    controller.command('probe:start', { method: 'z' });
    for (const line of ['[PRB:0,0,-7:1]', 'ok', 'ok', 'ok', '[PRB:0,0,-7:1]', 'ok', 'ok', 'ok']) {
      controller.runner.parse(line);
    }
    const before = sent().length;

    happen(controller);
    expect(probeStates().pop()).toMatchObject({ state: 'failed', failure: { code: 'position-lost' }, result: null });

    controller.command('probe:apply');
    expect(refusals.map(({ reason }) => reason)).toContain('no-result');
    expect(sent()).toHaveLength(before);
  });

  test('a probe that ended in an alarm puts the modes back once the alarm is cleared, not before (audit K10)', () => {
    const { controller, sent } = setup();
    Object.assign(controller, { ready: true, initialized: true });
    controller.command('probe:start', { method: 'z' });
    controller.runner.parse('ALARM:5');
    controller.runner.parse('[PRB:0.000,0.000,-3.000:0]');
    controller.runner.parse('ok');
    controller.runner.parse('<Alarm|MPos:0.000,0.000,-15.000|FS:0,0|WCO:0.000,0.000,-30.000>');
    // In alarm nothing more goes: the G90 the probe's lines set stands for now.
    expect(sent()).toEqual(['G90 G21 G94 G38.2 Z15 F100']);

    // `$X` from anywhere — the wizard's Spróbuj ponownie, the alarm's own button, a console.
    controller.runner.parse('<Idle|MPos:0.000,0.000,-15.000|FS:0,0|WCO:0.000,0.000,-30.000>');
    expect(sent().pop()).toBe('G1 G94 G91 G21 F500');
    expect(controller.modesOwed).toBeNull();
  });

  test('a reset owes nothing: Grbl puts its own defaults back', () => {
    const { controller } = setup();
    controller.command('probe:start', { method: 'z' });
    controller.runner.parse('ALARM:5');
    expect(controller.modesOwed).toBe('G1 G94 G91 G21 F500');
    controller.runner.parse(BANNER);
    expect(controller.modesOwed).toBeNull();
  });

  test('figures the operator confirmed and since changed on another device are refused, named; the same ones go (audit K8)', () => {
    const { controller, sent, refusals } = setup();
    probeSettings.set({ plateThickness: 5 });

    controller.command('probe:start', { method: 'z', figures: { plateThickness: 10, maxZ: 15 } });
    expect(refusals).toEqual([expect.objectContaining({ reason: 'figures-changed', name: 'plateThickness' })]);
    expect(sent()).toEqual([]);

    // Another method's figure is not this one's business.
    controller.command('probe:start', { method: 'z', figures: { plateThickness: 5, maxZ: 15, wallX: 99 } });
    expect(sent()).toEqual(['G90 G21 G94 G38.2 Z15 F100']);
  });

  test('an answer lost on the cable is given up after a while standing Idle, not waited for until STOP (audit I1)', () => {
    let now = 1000000;
    const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
    try {
      const { controller, sent, probeStates } = setup();
      Object.assign(controller, { ready: true, initialized: true });
      controller.command('probe:start', { method: 'z' });
      const idle = '<Idle|MPos:0.000,0.000,0.000|FS:0,0|WCO:0.000,0.000,-30.000>';
      controller.runner.parse(idle);
      // Moving is not silence: the count starts again.
      now += 6000;
      controller.runner.parse('<Run|MPos:0.000,0.000,-3.000|FS:100,0|WCO:0.000,0.000,-30.000>');
      now += 1000;
      controller.runner.parse(idle);
      now += 7000;
      controller.runner.parse(idle);
      expect(sent()).toHaveLength(1);

      now += 1000;
      controller.runner.parse(idle);
      // Given up: the modes put back, as after any error.
      expect(sent().pop()).toBe('G1 G94 G91 G21 F500');
      controller.runner.parse('ok');
      expect(probeStates().pop()).toMatchObject({ state: 'failed', failure: { code: 'no-answer' } });
    } finally {
      clock.mockRestore();
    }
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
    // A program left without M5, or an M3 typed in: Grbl says it in the status report (audit K1)…
    ['spindle-on', { method: 'z' }, (controller) => {
      controller.runner.state.status.accessoryState = 'SF';
    }],
    // …and the other way round, in the parser state, which can be the first to know.
    ['spindle-on', { method: 'z' }, (controller) => {
      controller.runner.state.parserstate.modal.spindle = 'M4';
    }],
    // A touch faster than it was set (K13).
    ['feed-override', { method: 'z' }, (controller) => {
      controller.runner.state.status.ov = [150, 100, 100];
    }],
  ])('refuses with %s, and nothing goes out', (reason, request, arrange) => {
    const { controller, sent, refusals } = setup();
    arrange(controller);

    controller.command('probe:start', request);

    expect(sent()).toEqual([]);
    expect(refusals.map(({ reason: said }) => said)).toEqual([reason]);
  });

  test('the paper is felt for by hand: refused with the spindle on, not for an override it never uses', () => {
    const { controller, sent, refusals } = setup();
    controller.runner.state.status.ov = [150, 100, 100];
    controller.command('probe:start', { method: 'paper', options: { edge: 'z' } });
    expect(refusals).toEqual([]);
    expect(sent()).toEqual(['G90 G21 G53 G0 Z2']);

    const other = setup();
    other.controller.runner.state.status.accessoryState = 'S';
    other.controller.command('probe:start', { method: 'paper', options: { edge: 'z' } });
    expect(other.refusals.map(({ reason }) => reason)).toEqual(['spindle-on']);
    expect(other.sent()).toEqual([]);
  });

  test('a slower override is a slower touch, and goes', () => {
    const { controller, sent, refusals } = setup();
    controller.runner.state.status.ov = [50, 100, 100];
    controller.command('probe:start', { method: 'z' });
    expect(refusals).toEqual([]);
    expect(sent()).toEqual(['G90 G21 G94 G38.2 Z15 F100']);
  });

  test('the paper needs no probe input, so a lit one does not stop it', () => {
    const { controller, sent, refusals, probeStates } = setup();
    controller.runner.state.status.pinState = 'P';

    controller.command('probe:start', { method: 'paper', options: { edge: 'z' } });
    controller.runner.parse('ok');
    controller.runner.parse('ok');

    expect(refusals).toEqual([]);
    // Off the top by the paper's lift, then the modes put back.
    expect(sent()).toEqual(['G90 G21 G53 G0 Z2', 'G1 G94 G91 G21 F500']);
    // Machine Z0 less a tenth of paper, against G54's -30: the zero moves up 29.9.
    expect(probeStates().pop().result.shift.z).toBeCloseTo(29.9, 6);
  });

  test('a line still unanswered — a jog step tapped just before — is waited for, and a report after it, before the start reads where the tool is (audit K11)', () => {
    const { controller, sent } = setup();
    // Up and running: a report does not set the port's first questions going.
    Object.assign(controller, { ready: true, initialized: true });
    controller.command('gcode', 'G91 G0 Z-0.1');
    controller.command('probe:start', { method: 'z' });
    // Its `ok` is still to come: it would be taken for the touch's.
    expect(sent()).toEqual(['G91 G0 Z-0.1']);

    controller.runner.parse('ok');
    // Answered, but no report has seen the step yet.
    expect(sent()).toHaveLength(1);
    // The step under way: it waits on.
    controller.runner.parse('<Jog|MPos:0.000,0.000,-0.050|FS:100,0|WCO:0.000,0.000,-30.000>');
    expect(sent()).toHaveLength(1);

    controller.runner.parse('<Idle|MPos:0.000,0.000,-0.100|FS:0,0|WCO:0.000,0.000,-30.000>');
    // From where the step left it: machine -0.1 less 15, in work coordinates.
    expect(sent().slice(1)).toEqual(['G90 G21 G94 G38.2 Z14.9 F100']);
    expect(controller.probe.start.z).toBeCloseTo(-0.1, 6);
  });

  test('a second start while one waits is refused, and one never answered is said to be busy', () => {
    const { controller, sent, refusals } = setup();
    Object.assign(controller, { ready: true, initialized: true });
    controller.command('gcode', 'G4 P5');
    controller.command('probe:start', { method: 'z' });
    controller.command('probe:start', { method: 'z' });
    expect(refusals.map(({ reason }) => reason)).toEqual(['probing']);

    // A dwell reports Idle while it waits, and its `ok` has not come: still not the probe's.
    controller.runner.parse('<Idle|MPos:0.000,0.000,0.000|FS:0,0|WCO:0.000,0.000,-30.000>');
    expect(sent()).toEqual(['G4 P5']);
    controller.settleProbe(true);
    expect(refusals.map(({ reason }) => reason)).toEqual(['probing', 'busy']);
    expect(sent()).toEqual(['G4 P5']);
    expect(controller.probeDeferred).toBeNull();
  });

  test('a zero waiting for the operator is not overwritten by another start — a second tap, another device', () => {
    const { controller, sent, refusals } = setup();
    controller.command('probe:start', { method: 'paper', options: { edge: 'z' } });
    controller.runner.parse('ok');
    controller.runner.parse('ok');
    expect(controller.probe.result.offset).toBeDefined();

    controller.command('probe:start', { method: 'paper', options: { edge: 'z' } });
    expect(refusals.map(({ reason }) => reason)).toEqual(['result-waiting']);
    expect(sent()).toHaveLength(2);

    // Put away, a new one goes.
    controller.command('probe:discard');
    controller.command('probe:start', { method: 'paper', options: { edge: 'z' } });
    expect(sent()).toHaveLength(3);
  });

  test('a failure is only read: a start goes over it', () => {
    const { controller, sent, refusals } = setup();
    Object.assign(controller, { ready: true, initialized: true });
    controller.command('probe:start', { method: 'z' });
    controller.runner.parse('ALARM:5');
    controller.runner.parse('[PRB:0.000,0.000,-3.000:0]');
    // The miss's `ok` comes after the run has ended, and falls through: a report is waited for after it.
    controller.runner.parse('ok');
    controller.runner.parse('<Idle|MPos:0.000,0.000,0.000|FS:0,0|WCO:0.000,0.000,-30.000>');

    controller.command('probe:start', { method: 'z' });
    expect(refusals).toEqual([]);
    expect(sent()).toHaveLength(2);
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

    expect(lines).toEqual(['G90 G21 G94 G38.2 Z-10 F50', 'G90 G21 G53 G0 Z-2']);
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
    expect(lines).toEqual(['G90 G21 G53 G0 X10', 'G90 G21 G53 G0 X9', 'G90 G21 G53 G0 Z5', 'G90 G21 G94 G38.2 Z6 F50']);
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

describe('a size', () => {
  /** Answer every line until the run is done: a probe touches X ±`half` from the machine's X0, anything else is ok. */
  const across = (controller, sent, half) => {
    let answered = 0;
    while (answered < sent().length) {
      const line = sent()[answered];
      answered += 1;
      const x = Number(line.match(/G38\.2 X(-?[\d.]+)/)?.[1]);
      if (!Number.isNaN(x)) {
        controller.runner.parse(`[PRB:${x > 0 ? half : -half},0.000,0.000:1]`);
      }
      controller.runner.parse('ok');
    }
  };

  test('is shown and journalled, the zero not written unless asked: closed, nothing sent', () => {
    const { controller, sent, refusals, probeStates } = setup();
    probeSettings.set({ ballDiameter: 2, holePasses: 1 });
    const recorded = jest.spyOn(controller, 'note');

    controller.command('probe:start', { method: 'measure', options: { shape: 'groove-x' } });
    across(controller, sent, 9);

    // The middle in the system measured in: the machine's X0 less the work offset.
    const centre = { x: 0 - controller.probe.wco.x };
    expect(probeStates().pop()).toMatchObject({ state: 'measured', result: { size: { size: { x: 20 }, spread: null, centre } } });
    expect(recorded).toHaveBeenCalledWith(expect.objectContaining({
      event: 'probe', code: 'size', data: expect.objectContaining({ method: 'measure', shape: 'groove-x', size: { x: 20 }, spread: null, centre, passes: 1, ball: 2 }),
    }));
    controller.command('probe:discard');
    expect(sent().some((line) => line.includes('G10'))).toBe(false);
    expect(controller.probe).toBeNull();
    expect(refusals).toHaveLength(0);
  });

  test('asked, its middle is the zero — one axis only for a width (Mateusz, 2026-10-05: the centres are in Pomiar)', () => {
    const { controller, sent } = setup();
    probeSettings.set({ ballDiameter: 2, holePasses: 1 });

    controller.command('probe:start', { method: 'measure', options: { shape: 'groove-x' } });
    across(controller, sent, 9);
    controller.command('probe:apply');

    const written = sent().find((line) => line.includes('G10'));
    expect(written).toMatch(/G10 L2 P\d X-?0(\.0+)?$/);
    expect(controller.probe).toBeNull();
  });

  test('no shape is refused before anything moves', () => {
    const { controller, sent, refusals } = setup();

    controller.command('probe:start', { method: 'measure', options: {} });
    expect(refusals.pop()).toMatchObject({ reason: 'bad-shape' });
    expect(sent()).toHaveLength(0);
  });
});

describe('a distance', () => {
  /** Answer every line until the run stops: a probe touches X and Y ±`half` from the machine's origin, anything else is ok. */
  const round = (controller, sent, half, from = 0) => {
    let answered = from;
    while (answered < sent().length) {
      const line = sent()[answered];
      answered += 1;
      const [, axis, value] = line.match(/G38\.2 ([XY])(-?[\d.]+)/) ?? [];
      if (axis) {
        const at = Number(value) > 0 ? half : -half;
        controller.runner.parse(axis === 'X' ? `[PRB:${at},0.000,0.000:1]` : `[PRB:0.000,${at},0.000:1]`);
      }
      controller.runner.parse('ok');
    }
    return answered;
  };

  test('the first feature kept while the operator jogs, the second on probe:next; no zero to write', () => {
    const {
      controller, sent, refusals, probeStates,
    } = setup();
    probeSettings.set({ ballDiameter: 2, holePasses: 1 });
    const recorded = jest.spyOn(controller, 'note');

    controller.command('probe:next');
    expect(refusals.pop()).toMatchObject({ reason: 'not-between' });

    controller.command('probe:start', { method: 'measure', options: { shape: 'distance', a: 'circle-inside', b: 'circle-inside' } });
    const done = round(controller, sent, 9);

    expect(probeStates().pop()).toMatchObject({ state: 'between', part: 'b', first: { kind: 'circle', size: { d: 20 } } });
    expect(recorded).toHaveBeenCalledWith(expect.objectContaining({ event: 'probe', code: 'first' }));
    // Between the two the machine is the operator's: nothing runs.
    expect(controller.probe.run).toBeNull();

    controller.command('probe:next');
    round(controller, sent, 11, done);

    const last = probeStates().pop();
    expect(last).toMatchObject({ state: 'measured', result: { size: { kind: 'distance', size: { dist: 0 }, parts: [{ size: { d: 20 } }, { size: { d: 24 } }] } } });
    expect(last.result.offset).toBeUndefined();
    controller.command('probe:apply');
    expect(refusals.pop()).toMatchObject({ reason: 'no-result' });
    expect(sent().some((line) => line.includes('G10'))).toBe(false);
  });

  test('the second feature is measured with the figures the first was, whatever was changed between (audit K8)', () => {
    const { controller, sent } = setup();
    probeSettings.set({ ballDiameter: 2, holePasses: 1 });
    controller.command('probe:start', { method: 'measure', options: { shape: 'distance', a: 'circle-inside', b: 'circle-inside' } });
    const done = round(controller, sent, 9);

    // Another device, between the two.
    probeSettings.set({ fast: 300 });
    controller.command('probe:next');
    expect(sent()[done]).toMatch(/G38\.2 .* F100$/);
  });

  test('the Z of a surface is shown in the system measured in, with no zero to write', () => {
    const { controller, sent, probeStates } = setup();
    controller.command('probe:start', { method: 'measure', options: { shape: 'surface' } });
    for (let answered = 0; answered < sent().length; answered++) {
      if (sent()[answered].includes('G38.2')) {
        controller.runner.parse('[PRB:0.000,0.000,-30.000:1]');
      }
      controller.runner.parse('ok');
    }

    const last = probeStates().pop();
    expect(last).toMatchObject({ state: 'measured', result: { size: { kind: 'surface', centre: { z: -30 - controller.probe.wco.z } } } });
    expect(last.result.offset).toBeUndefined();
    expect(last.result.size.zero).toBeUndefined();
  });

  test('two edges square to each other are refused before anything moves', () => {
    const { controller, sent, refusals } = setup();

    controller.command('probe:start', { method: 'measure', options: { shape: 'distance', a: 'edge-front', b: 'edge-left' } });
    expect(refusals.pop()).toMatchObject({ reason: 'edges-crossing' });
    expect(sent()).toHaveLength(0);
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

  test('with the Z plate it stands over each point until told the plate is there; any device may say so, even as a program would be held', () => {
    const { controller, sent, refusals } = setup();
    controller.command('probe:start', { method: 'height-map', options: { x: [0, 10], y: [0, 10], nx: 2, ny: 2, tool: 'plate' } });
    expect(sent()).toEqual(['G90 G21 G53 G0 X0 Y0']);
    controller.runner.parse('ok');
    expect(sent()).toHaveLength(1);
    expect(controller.probeReport()).toMatchObject({ state: 'running', step: { phase: 'p0-place', waits: true } });
    expect(programRefusal('probe:resume', { workflow: 'running', firmware: 'Idle' })).toBeNull();

    // The wire lit: the touch would alarm at once.
    controller.runner.state.status.pinState = 'P';
    controller.command('probe:resume');
    expect(refusals.pop()).toMatchObject({ cmd: 'probe:resume', reason: 'probe-triggered' });
    controller.runner.state.status.pinState = '';

    controller.command('probe:resume');
    expect(sent().at(-1)).toMatch(/^G90 G21 G94 G38\.2 Z/);
    // Only while it stands.
    controller.command('probe:resume');
    expect(refusals.pop()).toMatchObject({ cmd: 'probe:resume', reason: 'not-waiting' });
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
