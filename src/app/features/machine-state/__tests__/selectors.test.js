import { machineState } from '../selectors';

describe('machineState', () => {
  test('says so outright when no port is open', () => {
    // An empty chip is not an answer. "Disconnected" is the answer to "why
    // did nothing happen when I pressed that".
    expect(machineState({})).toEqual({ word: 'Disconnected', tone: 'inactive', known: false });
    expect(machineState()).toEqual({ word: 'Disconnected', tone: 'inactive', known: false });
  });

  test('reads Grbl and Smoothie from the same field, because it is the same field', () => {
    const status = { status: { activeState: 'Run' } };
    expect(machineState({ port: 'COM3', type: 'Grbl', state: status }))
      .toEqual({ word: 'Run', tone: 'running', known: true });
    expect(machineState({ port: 'COM3', type: 'Smoothie', state: status }))
      .toEqual({ word: 'Run', tone: 'running', known: true });
  });

  test('translates TinyG out of its numbering', () => {
    // TinyG answers the same question with an integer. An operator should not
    // have to know which firmware they are looking at to read the chip.
    expect(machineState({ port: 'COM3', type: 'TinyG', state: { sr: { machineState: 5 } } }))
      .toEqual({ word: 'Run', tone: 'running', known: true });
    expect(machineState({ port: 'COM3', type: 'TinyG', state: { sr: { machineState: 2 } } }))
      .toEqual({ word: 'Alarm', tone: 'stopped', known: true });
    expect(machineState({ port: 'COM3', type: 'TinyG', state: { sr: { machineState: 1 } } }))
      .toEqual({ word: 'Ready', tone: 'ready', known: true });
  });

  test('TinyG state 0 is a state, not an absence of one', () => {
    // The trap: `machineState: 0` is "initializing" and it is falsy. A lookup
    // guarded with `||` would report it as unknown.
    expect(machineState({ port: 'COM3', type: 'TinyG', state: { sr: { machineState: 0 } } }))
      .toEqual({ word: 'Initializing', tone: 'inactive', known: true });
  });

  test('says only what it knows about a firmware with no machine state', () => {
    // Marlin has none. Inventing one would be worse than admitting it.
    const marlin = machineState({ port: 'COM3', type: 'Marlin', state: { modal: {} } });
    expect(marlin).toEqual({ word: 'Connected', tone: 'inactive', known: false });
  });

  test('a port that is open but silent reads as connected, not as idle', () => {
    // Between opening the port and the first status report there is nothing to
    // say. "Idle" there would be a claim the controller has not made.
    expect(machineState({ port: 'COM3', type: 'Grbl', state: {} }))
      .toEqual({ word: 'Connected', tone: 'inactive', known: false });
  });

  test('an unrecognised firmware does not inherit somebody else\'s state', () => {
    expect(machineState({ port: 'COM3', type: 'Klipper', state: { status: { activeState: 'Run' } } }))
      .toEqual({ word: 'Connected', tone: 'inactive', known: false });
  });
});
