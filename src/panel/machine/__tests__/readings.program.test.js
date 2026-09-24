import { readMachine } from '../readings';

/**
 * What a program under way leaves to this panel — the server's rule in
 * `program-gate.js`, read here so a key is dark before it is pressed.
 */
describe('readMachine, while a program is under way', () => {
  const pendant = (extra) => readMachine({
    connection: 'open', port: 'COM3', type: 'Grbl', attached: true,
    device: 'pendant',
    settings: { $22: '1' },
    state: { status: { activeState: 'Idle' } },
    ...extra,
  });

  test('a pause is a tool change when the firmware stands still, and a stop when it holds', () => {
    // The server's rule, read before the press. An `M0` or a feed hold leaves
    // Grbl in Hold, which refuses a jog itself; an `M6` stopped in the sender
    // leaves it Idle, and the operator has to jog to the plate.
    const hold = { workflow: 'paused', state: { status: { activeState: 'Hold' } } };
    expect(pendant(hold).canMove).toBe(false);
    expect(pendant(hold).held).toBe('program-running');
    expect(pendant(hold).canZero).toBe(false);

    const toolChange = { workflow: 'paused' };
    expect(pendant(toolChange).canMove).toBe(true);
    expect(pendant(toolChange).held).toBeNull();
    expect(pendant(toolChange).canZero).toBe(true);
  });

  test('a pause the sender made says Pauza, not the Idle the firmware reports', () => {
    // An `M6`, an error in the file or the Pause button: the program is
    // stopped and Grbl has nothing left to do, so it says Idle — and a chip
    // reading IDLE over a job that is half done reads as a job that is over.
    const paused = pendant({ workflow: 'paused' });
    expect(paused.status).toMatchObject({ key: 'status.paused', word: null, tone: 'ready' });
    // The firmware's word wins whenever it has one worth saying.
    expect(pendant({ workflow: 'paused', state: { status: { activeState: 'Hold' } } }).status.word).toBe('Hold');
    expect(pendant({ workflow: 'paused', state: { status: { activeState: 'Jog' } } }).status.word).toBe('Jog');
    expect(pendant({ workflow: 'idle' }).status.word).toBe('Idle');
  });

  test('an alarm is read with its number, and only while the machine says Alarm', () => {
    const alarm = { state: { status: { activeState: 'Alarm' } } };
    expect(pendant({ ...alarm, alarm: 3 })).toMatchObject({ alarmed: true, alarm: 3 });
    // The homing lock has no number, and is still an alarm.
    expect(pendant({ ...alarm, alarm: null })).toMatchObject({ alarmed: true, alarm: null });
    // A number the server has not cleared yet, over a machine that is Idle.
    expect(pendant({ alarm: 3 })).toMatchObject({ alarmed: false, alarm: null });
  });

  test('and the pad stays live while that jog is moving', () => {
    // Grbl reports `Jog` the instant the key goes down. A pad that went dark
    // then would let go of the key under the operator's finger.
    const jogging = { workflow: 'paused', state: { status: { activeState: 'Jog' } } };
    expect(pendant(jogging).canMove).toBe(true);
    expect(pendant(jogging).held).toBeNull();
  });

  test('but it is by a running program, because it would land in the middle of one', () => {
    // A `G10 L20` between two lines of a job moves every cut still to come.
    expect(pendant({ workflow: 'running' }).canZero).toBe(false);
    // And it is still not an alarm: the advice and the go-to note read this.
    expect(pendant({ workflow: 'running' }).canSendGcode).toBe(true);
  });
});
