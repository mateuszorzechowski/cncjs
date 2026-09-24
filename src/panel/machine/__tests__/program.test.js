import { programControls, pressPause, startProgram } from '../program';

const machine = (extra) => ({
  connected: true,
  canMove: true,
  workflow: 'idle',
  job: { name: 'part.nc', total: 10 },
  ...extra,
});

describe('what the job buttons offer', () => {
  test('a loaded program on an idle machine can be started, not paused', () => {
    expect(programControls(machine())).toEqual({ canStart: true, canPause: false, paused: false });
  });

  test('nothing to start without a program', () => {
    expect(programControls(machine({ job: null })).canStart).toBe(false);
  });

  test('nothing to start on a machine this panel may not move', () => {
    // Alarm, or another device holding movement: the same keys the jog pad
    // goes dark for, because starting a program is a move like any other.
    expect(programControls(machine({ canMove: false })).canStart).toBe(false);
  });

  test('nothing at all while disconnected', () => {
    expect(programControls(machine({ connected: false, workflow: 'running' })))
      .toEqual({ canStart: false, canPause: false, paused: false });
  });

  test('a running program can be paused, not started again', () => {
    // `canMove` is false while it runs — the program holds the machine — and
    // pausing is exactly what that must not take away.
    expect(programControls(machine({ workflow: 'running', canMove: false })))
      .toEqual({ canStart: false, canPause: true, paused: false });
  });

  test('a tool-change pause leaves the machine movable and still offers no Start', () => {
    // Paused with Grbl idle, the jog pad is live (`canMove`), but a second
    // program over the paused one is what the server refuses.
    expect(programControls(machine({ workflow: 'paused', canMove: true })).canStart).toBe(false);
  });

  test('a paused program is resumed by the same button', () => {
    expect(programControls(machine({ workflow: 'paused', canMove: false })))
      .toEqual({ canStart: false, canPause: true, paused: true });
  });
});

describe('what the buttons send', () => {
  const controller = () => ({ command: jest.fn() });

  test('start', () => {
    const c = controller();
    startProgram(c);
    expect(c.command).toHaveBeenCalledWith('gcode:start');
  });

  test('pause while running, resume while paused', () => {
    const c = controller();
    pressPause(c, false);
    pressPause(c, true);
    expect(c.command.mock.calls).toEqual([['gcode:pause'], ['gcode:resume']]);
  });
});
