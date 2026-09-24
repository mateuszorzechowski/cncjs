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

  test('but it is by a running program, because it would land in the middle of one', () => {
    // A `G10 L20` between two lines of a job moves every cut still to come.
    expect(pendant({ workflow: 'running' }).canZero).toBe(false);
    // And it is still not an alarm: the advice and the go-to note read this.
    expect(pendant({ workflow: 'running' }).canSendGcode).toBe(true);
  });
});
