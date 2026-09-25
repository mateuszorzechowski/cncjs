import { readMachine } from '../readings';

const grbl = (activeState, wpos) => ({
  connection: 'open',
  error: null,
  port: 'COM3',
  type: 'Grbl',
  attached: true,
  state: { status: { activeState, wpos } },
});

describe('the controller check, `$C`', () => {
  test('can be asked for with no program and the firmware standing Idle', () => {
    expect(readMachine(grbl('Idle', {})).canCheckFile).toBe(true);
  });

  test.each(['Alarm', 'Hold', 'Run', 'Jog', 'Check'])('not while the firmware says %s', (word) => {
    expect(readMachine(grbl(word, {})).canCheckFile).toBe(false);
  });

  test('not while a program is loaded and paused, nor while a check runs', () => {
    expect(readMachine({ ...grbl('Idle', {}), workflow: 'paused' }).canCheckFile).toBe(false);
    expect(readMachine({ ...grbl('Idle', {}), fileCheck: { name: 'a.nc', answered: 1, total: 9 } }).canCheckFile).toBe(false);
  });

  test('its progress and the fits are the server\'s, and go with the machine', () => {
    const fits = { softLimits: true, files: { 'a.nc': [] } };
    const fileCheck = { name: 'a.nc', answered: 1, total: 9 };

    expect(readMachine({ ...grbl('Idle', {}), fits, fileCheck })).toMatchObject({ fits, fileCheck });
    expect(readMachine({ ...grbl('Idle', {}), attached: false, fits, fileCheck })).toMatchObject({ fits: null, fileCheck: null });
  });
});
