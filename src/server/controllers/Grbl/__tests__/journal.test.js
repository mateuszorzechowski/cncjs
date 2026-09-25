import GrblController from '../GrblController';
import journal from '../../../services/journal';
import library from '../../../services/library';
import { createController } from '../../__tests__/helpers/createController';

jest.mock('../../../lib/logger', () => {
  const quiet = () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), silly: jest.fn() });
  return { __esModule: true, default: () => quiet(), getLevel: jest.fn(() => 'info'), setLevel: jest.fn() };
});

const PROGRAM = ['G21 G90', 'G0 X1', 'G3 X22.5 Y-15.8 I-15.8 J22.5', 'G0 X0'].join('\n');

const controllers = [];
const setup = () => {
  const { controller } = createController(GrblController);
  clearInterval(controller.queryTimer);
  controllers.push(controller);
  return controller;
};

// What was recorded since `from`, oldest first.
const recordedSince = (from) => journal.query({}, { limit: 500 }).records
  .filter((entry) => entry.id > from)
  .reverse();
const mark = () => journal.nextId - 1;

// An error's entry waits for the server's reading of the line it was about.
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => journal.setLevel('info'));

afterEach(() => {
  while (controllers.length) {
    controllers.pop().destroy();
  }
});

describe('what the controller says', () => {
  test('an alarm is an error, with its code', () => {
    const controller = setup();
    const from = mark();

    controller.runner.parse('ALARM:3');

    expect(recordedSince(from)).toEqual([
      expect.objectContaining({ level: 'error', source: 'controller', event: 'alarm', code: 'ALARM:3', port: '/dev/null' }),
    ]);
  });

  test('an error in a program names the line that caused it, and the line itself', async () => {
    const controller = setup();
    controller.command('gcode:load', 'circle.nc', PROGRAM);
    controller.command('gcode:start');
    // The first two lines come back; the third is refused.
    controller.runner.parse('ok');
    controller.runner.parse('ok');
    const from = mark();

    controller.runner.parse('error:33');
    await settled();

    const error = recordedSince(from).find((entry) => entry.event === 'error');
    // Line 3 of the file, and its own text — not the line before it, which
    // is what the old console prints.
    expect(error).toMatchObject({
      level: 'error',
      source: 'controller',
      code: 'error:33',
      program: { name: 'circle.nc', line: 3 },
      data: { sent: 'G3 X22.5 Y-15.8 I-15.8 J22.5' },
    });
  });

  test('and says what the server sees wrong in that line, when it sees something', async () => {
    const explain = jest.spyOn(library, 'explain').mockResolvedValue([
      { code: 'arc', word: 'G3', detail: { radius: 29, reach: 42 } },
    ]);
    const controller = setup();
    controller.command('gcode:load', 'circle.nc', PROGRAM);
    controller.command('gcode:start');
    controller.runner.parse('ok');
    controller.runner.parse('ok');
    const from = mark();
    const before = Date.now();

    controller.runner.parse('error:33');
    await settled();

    expect(explain).toHaveBeenCalledWith({ name: 'circle.nc', line: 3, sent: 'G3 X22.5 Y-15.8 I-15.8 J22.5' });
    const error = recordedSince(from).find((entry) => entry.event === 'error');
    expect(error.data).toEqual({
      sent: 'G3 X22.5 Y-15.8 I-15.8 J22.5',
      found: [{ code: 'arc', word: 'G3', detail: { radius: 29, reach: 42 } }],
    });
    // Stamped with the moment of the error, not of the answer.
    expect(Date.parse(error.time)).toBeGreaterThanOrEqual(before - 1);
    explain.mockRestore();
  });

  test('an error from the console names the line the console sent', async () => {
    const controller = setup();
    controller.command('gcode', 'G7');
    const from = mark();

    controller.runner.parse('error:20');
    await settled();

    const error = recordedSince(from).find((entry) => entry.event === 'error');
    expect(error).toMatchObject({ code: 'error:20', data: { sent: 'G7', found: [{ code: 'unsupported', word: 'G7' }] } });
  });

  test('and the pause that follows says it was an error', () => {
    const controller = setup();
    controller.command('gcode:load', 'circle.nc', PROGRAM);
    controller.command('gcode:start');
    const from = mark();

    controller.runner.parse('error:33');

    expect(recordedSince(from).find((entry) => entry.code === 'pause')).toMatchObject({
      level: 'warn', source: 'server', event: 'program', data: { reason: 'error' },
    });
  });

  test('a message is kept as it came', () => {
    const controller = setup();
    const from = mark();

    controller.runner.parse('[MSG:Caution: Unlocked]');

    expect(recordedSince(from)).toEqual([
      expect.objectContaining({ level: 'info', source: 'controller', event: 'message', data: { text: '[MSG:Caution: Unlocked]' } }),
    ]);
  });
});

describe('what the server did', () => {
  test('a program from start to its pause, resume and abort', () => {
    const controller = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    const from = mark();

    controller.command('gcode:start');
    controller.command('gcode:pause');
    controller.command('gcode:resume');
    controller.command('gcode:stop');

    expect(recordedSince(from).map(({ event, code, data }) => [event, code, data?.reason]))
      .toEqual([
        ['program', 'start', undefined],
        ['program', 'pause', 'request'],
        ['program', 'resume', undefined],
        ['program', 'abort', undefined],
      ]);
  });

  test('a program that ran to its last line finishes, it is not aborted', () => {
    const controller = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.command('gcode:start');
    for (let i = 0; i < controller.sender.state.total; i += 1) {
      controller.runner.parse('ok');
    }
    const from = mark();

    // The server stops the workflow itself once the machine has come to rest.
    controller.command('gcode:stop');

    expect(recordedSince(from).map(({ code }) => code)).toEqual(['finish']);
  });

  test('a program paused on an error and then stopped is aborted, even with every line sent', () => {
    const controller = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.command('gcode:start');
    controller.runner.parse('error:33');
    for (let i = 0; i < controller.sender.state.total; i += 1) {
      controller.runner.parse('ok');
    }
    const from = mark();

    controller.command('gcode:stop');

    expect(recordedSince(from).map(({ code }) => code)).toEqual(['abort']);
  });

  test('what happens inside a client\'s command carries its device', () => {
    const controller = setup();
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.commandSocket = { id: 'socket-laptop', device: 'laptop', emit: jest.fn() };
    const from = mark();

    controller.command('gcode:start');
    controller.commandSocket = null;
    controller.runner.parse('ALARM:1');

    const [start, alarm] = recordedSince(from);
    expect(start).toMatchObject({ code: 'start', device: 'laptop' });
    // The firmware's own word belongs to nobody.
    expect(alarm.device).toBeUndefined();
  });

  test('a refusal, with the device and the command it refused', () => {
    const controller = setup();
    controller.commandSocket = { id: 'socket-phone', device: 'phone', emit: jest.fn() };
    controller.command('gcode:load', 'part.nc', PROGRAM);
    controller.command('gcode:start');
    const from = mark();

    controller.refuse('zero', 'program-running');

    expect(recordedSince(from)).toEqual([
      expect.objectContaining({
        level: 'warn', source: 'server', event: 'refused', code: 'program-running', device: 'phone', data: { cmd: 'zero' },
      }),
    ]);
  });
});

describe('the wire, at debug', () => {
  test('is not kept at info', () => {
    const controller = setup();
    const from = mark();

    controller.write('$X\n');

    expect(recordedSince(from)).toEqual([]);
  });

  test('is kept at debug, except status queries', () => {
    journal.setLevel('debug');
    const controller = setup();
    const from = mark();

    controller.write('?');
    controller.write('$X\n');

    expect(recordedSince(from)).toEqual([
      expect.objectContaining({ level: 'debug', source: 'controller', event: 'sent', data: { line: '$X' } }),
    ]);
  });

  test('keeps the answers to jog segments too, which never reach the panel', () => {
    // They are consumed by the jog's own count before anything is emitted, so
    // the wire looked one-sided: twenty segments out and nothing back, and no
    // way to tell from the journal whether the count ever came right.
    journal.setLevel('debug');
    const controller = setup();
    controller.jogging.inFlight = 2;
    const from = mark();

    controller.runner.parse('ok');
    controller.runner.parse('error:15');

    expect(recordedSince(from)).toEqual([
      expect.objectContaining({ level: 'debug', source: 'controller', event: 'received', data: { line: 'ok', jog: true } }),
      expect.objectContaining({ level: 'debug', source: 'controller', event: 'received', data: { line: 'error:15', jog: true } }),
    ]);
    expect(controller.jogging.inFlight).toBe(0);
  });
});
