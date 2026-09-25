import { CONTROLS, controlsFor, sendControl } from '../control';

const machine = (word, extra) => ({
  connected: true,
  status: { word, known: Boolean(word) },
  workflow: 'idle',
  ...extra,
});

const live = (m) => CONTROLS.filter((id) => controlsFor(m)[id]);

describe('which commands are live', () => {
  test('in alarm: unlock, and reset', () => {
    expect(live(machine('Alarm'))).toEqual(['unlock', 'reset']);
  });

  test('in alarm with a program stopped on it: not unlock, which the server refuses', () => {
    // Measured 2026-09-25: a program paused by an alarm, Unlock pressed three
    // times, three `program-running` refusals — the key was lit. The
    // program has to be stopped first; reset is the way, and it stays live.
    expect(live(machine('Alarm', { workflow: 'paused' }))).toEqual(['reset']);
    expect(live(machine('Alarm', { workflow: 'running' }))).toEqual(['reset']);
  });

  test('moving: hold, and reset', () => {
    expect(live(machine('Run'))).toEqual(['hold', 'reset']);
    expect(live(machine('Jog'))).toEqual(['hold', 'reset']);
  });

  test('held: resume, and reset', () => {
    expect(live(machine('Hold'))).toEqual(['resume', 'reset']);
    expect(live(machine('Door'))).toEqual(['resume', 'reset']);
  });

  test('standing still: only reset', () => {
    // `$X` does nothing outside an alarm, `!` nothing to a machine at rest,
    // `~` nothing without a hold. A live button that does nothing is a lie.
    expect(live(machine('Idle'))).toEqual(['reset']);
  });

  test('disconnected: nothing', () => {
    expect(live(machine('Alarm', { connected: false }))).toEqual([]);
  });
});

describe('what they send', () => {
  const send = (id, workflow) => {
    const controller = { command: jest.fn() };
    sendControl(controller, id, workflow);
    return controller.command.mock.calls[0][0];
  };

  test('the firmware commands, with no program', () => {
    expect(['unlock', 'hold', 'resume', 'reset'].map((id) => send(id, 'idle')))
      .toEqual(['unlock', 'feedhold', 'cyclestart', 'reset']);
  });

  test('hold and resume steer the program when there is one', () => {
    // A bare `!` would stop the machine and leave the sender running, and a
    // bare `~` would move the machine and leave the sender paused — the
    // status bar and the machine would then disagree about the same job.
    expect(send('hold', 'running')).toBe('gcode:pause');
    expect(send('resume', 'paused')).toBe('gcode:resume');
  });
});
