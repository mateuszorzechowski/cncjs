import { readMachine, statesOf } from '../readings';

const grbl = (activeState, wpos) => ({
  connection: 'open',
  error: null,
  port: 'COM3',
  type: 'Grbl',
  attached: true,
  state: { status: { activeState, wpos } },
});

describe('readMachine, before there is a machine', () => {
  test('says which kind of nothing it is', () => {
    // Three different absences, and an operator acts differently on each:
    // the server is unreachable, the page is still starting, or there is
    // simply no port open. One word for all three would be a shrug.
    // Named, not worded: these three are the panel's own states and the word
    // for each belongs to whichever language is being read.
    expect(readMachine({ connection: 'connecting' }).status.key).toBe('status.connecting');
    expect(readMachine({ connection: 'failed', error: 'x' }).status.key).toBe('status.noServer');
    expect(readMachine({ connection: 'open', port: '' }).status.key).toBe('status.noPort');
  });

  test('a failed server is coloured like a stopped machine', () => {
    // Because that is what it is, from where the operator is standing.
    expect(readMachine({ connection: 'failed' }).status.tone).toBe('stopped');
  });

  test('a port that is open but not yet attached is still connecting', () => {
    // The gap that made a jog key look pressable and do nothing:
    // `Controller.command()` begins `if (!this.port) return` and fails in
    // silence, so knowing which port is open is not the same as being able to
    // send to it. Until the socket has attached, the panel says so and its
    // controls stay disabled.
    const read = readMachine({
      connection: 'open', port: 'COM3', type: 'Grbl', attached: false,
      state: { status: { activeState: 'Idle' } },
    });
    expect(read.status.key).toBe('status.attaching');
    expect(read.connected).toBe(false);
  });

  test('tells a reachable server with no machine from no server at all', () => {
    // The distinction only the connection screen cares about, and the one it
    // cannot work without: with a server there is a list of ports to offer
    // and something to press, and without one there is neither. Reporting the
    // second as "no ports found" blames the wrong computer.
    expect(readMachine({ connection: 'open', port: '' }).linked).toBe(true);
    expect(readMachine({ connection: 'failed' }).linked).toBe(false);
    expect(readMachine({ connection: 'connecting' }).linked).toBe(false);

    // And it is not merely `connected` under another name: a server answering
    // with nothing plugged in is the ordinary state of this screen.
    expect(readMachine({ connection: 'open', port: '' }).connected).toBe(false);
  });
});

describe('readMachine, on a machine that will not take a line', () => {
  const attached = (activeState) => readMachine({
    connection: 'open', port: 'COM3', type: 'Grbl', attached: true,
    state: { status: { activeState } },
  });

  test('says a line would not arrive while the machine is in alarm', () => {
    // Every controller the server drives resets its feeder and drops the line
    // rather than sending it. Measured: `G10 L20 P1 Z0` went onto the socket,
    // the server logged that it had stopped, and no offset changed.
    expect(attached('Alarm').canSendGcode).toBe(false);
    expect(attached('Alarm').connected).toBe(true);
  });

  test('and that it would in every state the server does not gate', () => {
    // Door is the one that looks like alarm and is not: a hold for an open
    // guard resumes, and the server sends through it.
    for (const state of ['Idle', 'Run', 'Hold', 'Door', 'Jog', 'Check', 'Home', 'Sleep']) {
      expect([state, attached(state).canSendGcode]).toEqual([state, true]);
    }
  });

  test('and that nothing arrives with no machine at all', () => {
    expect(readMachine({ connection: 'open', port: '' }).canSendGcode).toBe(false);
  });
});

describe('readMachine, when movement belongs to somebody else', () => {
  const pendant = (extra) => readMachine({
    connection: 'open', port: 'COM3', type: 'Grbl', attached: true,
    device: 'pendant',
    settings: { $22: '1' },
    state: { status: { activeState: 'Idle' } },
    ...extra,
  });

  test('a machine this panel is driving is this panel to move', () => {
    expect(pendant({ motion: 'pendant' }).canMove).toBe(true);
    expect(pendant({ motion: 'pendant' }).held).toBeNull();
    expect(pendant({ motion: null }).canMove).toBe(true);
  });

  test('another device holding it puts every movement key out', () => {
    // Read from the server rather than predicted. The lease is the server's
    // and expires on its clock; a panel that timed it itself would be greying
    // keys by a clock that is not the one enforcing anything.
    expect(pendant({ motion: 'phone' }).canMove).toBe(false);
    expect(pendant({ motion: 'phone' }).held).toBe('held-elsewhere');
  });

  test('and so does a running program, which nothing was listening for', () => {
    // `workflow:state` has always been broadcast and this panel ignored it,
    // which left `program-running` as a refusal that could only ever arrive
    // after a press. Greying out is first here.
    expect(pendant({ workflow: 'running' }).canMove).toBe(false);
    expect(pendant({ workflow: 'running' }).held).toBe('program-running');
  });

  test('homing goes dark with them, though an alarm leaves it live', () => {
    // The one thing an alarm does not take away, because it is the way out of
    // one — so it is composed from the lease and not from `canMove`.
    expect(pendant({ state: { status: { activeState: 'Alarm' } } }).canHome).toBe(true);
    expect(pendant({ state: { status: { activeState: 'Alarm' } } }).canMove).toBe(false);
    expect(pendant({ motion: 'phone' }).canHome).toBe(false);
    expect(pendant({ workflow: 'running' }).canHome).toBe(false);
  });

  test('zeroing is not held by the lease, because it moves nothing', () => {
    // A panel that greyed the zero buttons out while somebody else jogged
    // would be inventing a restriction the machine does not have — the same
    // mistake as reading `Door` as an alarm.
    expect(pendant({ motion: 'phone' }).canZero).toBe(true);
  });
});

describe('readMachine, with a controller answering', () => {
  test.each([
    ['Run', 'running'],
    ['Jog', 'running'],
    ['Home', 'running'],
    ['Idle', 'ready'],
    ['Hold', 'ready'],
    ['Alarm', 'stopped'],
    ['Door', 'stopped'],
    ['Check', 'inactive'],
    ['Sleep', 'inactive'],
  ])('shows %s as %s', (word, tone) => {
    const read = readMachine(grbl(word, {}));
    // No key: this word is the firmware's own and is shown as it says it.
    expect(read.status).toEqual({ word, key: null, tone, known: true });
  });

  test('a state nobody planned for gets no colour rather than the last one', () => {
    expect(readMachine(grbl('Reconfiguring', {})).status.tone).toBe('inactive');
  });

  test('an open port that has not reported yet is connected, not idle', () => {
    // Between opening a port and the first status report there is genuinely
    // nothing to say, and "Idle" there would be a claim the controller has
    // not made.
    const read = readMachine({ connection: 'open', port: 'COM3', type: 'Grbl', attached: true, state: {} });
    expect(read.status).toEqual({
      word: null, key: 'status.noReading', tone: 'inactive', known: false,
    });
  });

  test('Smoothie is read with Grbl\'s vocabulary, because it is the same one', () => {
    const read = readMachine({ ...grbl('Run', {}), type: 'Smoothie' });
    expect(read.status.word).toBe('Run');
  });

  test('TinyG is translated out of its numbering', () => {
    const tinyg = (machineState) => readMachine({
      connection: 'open', port: 'COM3', type: 'TinyG', attached: true, state: { sr: { machineState } },
    });
    expect(tinyg(5).status).toEqual({ word: 'Run', key: null, tone: 'running', known: true });
    expect(tinyg(2).status).toEqual({ word: 'Alarm', key: null, tone: 'stopped', known: true });
    // The trap: state 0 is a state, and it is falsy. A lookup guarded with
    // `||` would report it as unknown.
    expect(tinyg(0).status).toEqual({
      word: 'Initializing', key: null, tone: 'inactive', known: true,
    });
  });

  test('a firmware with no machine state says only what it knows', () => {
    // Marlin has none. Inventing one would be worse than admitting it.
    const read = readMachine({ connection: 'open', port: 'COM3', type: 'Marlin', attached: true, state: {} });
    expect(read.status).toEqual({
      word: null, key: 'status.noReading', tone: 'inactive', known: false,
    });
  });

  test('reads the work position, and nothing where there is none', () => {
    const read = readMachine(grbl('Idle', { x: '12.5', y: '0.000' }));
    expect(read.position).toEqual({ x: 12.5, y: 0, z: null });
  });
});

describe('the rate the port is running at', () => {
  const open = {
    connection: 'open', attached: true, port: 'COM3', type: 'Grbl', state: {},
  };

  it('is carried through while a port is open', () => {
    expect(readMachine({ ...open, baudrate: 115200 }).baudrate).toBe(115200);
  });

  it('is null when nothing is open, whatever was left over', () => {
    // The field survives in the snapshot across a close, and a rate shown
    // beside a dead port is a rate somebody will read as a live one.
    expect(readMachine({ ...open, port: '', baudrate: 115200 }).baudrate).toBeNull();
  });

  it('is null rather than undefined when the server did not say', () => {
    expect(readMachine(open).baudrate).toBeNull();
  });
});

describe('the chip names which layer is missing', () => {
  // Three things stand between an operator and a machine, and the chip used
  // to answer for all three in words that overlapped. Each of these was
  // ambiguous before: `connecting` meant two different failures, and
  // `connected` was not about a connection.
  it('says no server when the link is down', () => {
    expect(readMachine({ connection: 'failed' }).status.key).toBe('status.noServer');
  });

  it('says no port when the server is fine and nothing is open', () => {
    expect(readMachine({ connection: 'open', port: '' }).status.key).toBe('status.noPort');
  });

  it('tells attaching apart from connecting', () => {
    expect(readMachine({ connection: 'connecting' }).status.key).toBe('status.connecting');
    expect(readMachine({ connection: 'open', port: 'COM3', attached: false }).status.key)
      .toBe('status.attaching');
  });

  it('says no reading while the machine has not reported', () => {
    expect(readMachine({ connection: 'open', port: 'COM3', attached: true, state: {} }).status.key)
      .toBe('status.noReading');
  });

  it('shows the firmware word once there is one, and no key of its own', () => {
    const read = readMachine({
      connection: 'open', port: 'COM3', attached: true, type: 'Grbl',
      state: { status: { activeState: 'Alarm' } },
    });
    expect(read.status.key).toBeNull();
    expect(read.status.word).toBe('Alarm');
  });
});

describe('statesOf', () => {
  it('lists what Grbl and Smoothie can say', () => {
    const words = statesOf('Grbl').map((s) => s.word);
    expect(words).toContain('Idle');
    expect(words).toContain('Alarm');
    expect(words).toContain('Door');
    expect(statesOf('Smoothie')).toEqual(statesOf('Grbl'));
  });

  it('lists the words TinyG sends as numbers', () => {
    const words = statesOf('TinyG').map((s) => s.word);
    expect(words).toContain('Panic');
    expect(words).toContain('Interlock');
  });

  // Not an oversight: Marlin reports no machine state, so a panel on one
  // never leaves `noReading`. The help sheet says so rather than showing an
  // empty list.
  it('is empty for Marlin and for nothing connected', () => {
    expect(statesOf('Marlin')).toEqual([]);
    expect(statesOf('')).toEqual([]);
  });

  it('agrees with the chip about every word it lists', () => {
    statesOf('Grbl').forEach(({ word, tone }) => {
      const read = readMachine({
        connection: 'open', port: 'COM3', attached: true, type: 'Grbl',
        state: { status: { activeState: word } },
      });
      expect(read.status.word).toBe(word);
      expect(read.status.tone).toBe(tone);
    });
  });
});

describe('a job, and whether it has finished', () => {
  // The shape the server sends: `sender.toJSON()`, whole.
  const sender = (overrides) => ({
    name: 'part.nc', total: 31, sent: 0, received: 0,
    startTime: 0, finishTime: 0, elapsedTime: 0, remainingTime: 0,
    ...overrides,
  });
  const read = (job) => readMachine({
    connection: 'open', port: 'COM3', type: 'Grbl', attached: true, state: {}, settings: {}, job,
  }).job;

  test('nothing loaded is not a job', () => {
    // The sender reports zeroes continuously when there is nothing to send,
    // and a panel that read that as a job would offer Start for a file that
    // does not exist.
    expect(read(sender({ name: '', total: 0 }))).toBeNull();
    expect(read(null)).toBeNull();
  });

  test('part way through, the bar is what has come back', () => {
    // Received, not sent: sent counts what the controller has been handed,
    // which runs seconds ahead of the tool while the planner drains.
    expect(read(sender({ sent: 30, received: 12 }))).toMatchObject({
      received: 12, percent: 39, finished: false,
    });
  });

  test('finished reads as finished, not as never started', () => {
    /*
     * The defect this exists for, measured on the machine 2026-09-24: at
     * t+3.6s the sender says `31/31, 100%`; at t+4.0s `workflow.stop()` has
     * rewound it and it says `0/31, 0%`. On screen that was a file name, an
     * empty bar and a live Start — a program that had just run to its last
     * line, reading exactly like one nobody had started.
     */
    const afterTheRun = sender({ sent: 0, received: 0, finishTime: 1700000003568, elapsedTime: 3568 });

    expect(read(afterTheRun)).toMatchObject({
      finished: true,
      received: 31,
      percent: 100,
    });
  });

  test('a program stopped half way is not finished', () => {
    /*
     * And this is why the decision is read from `finishTime` rather than
     * guessed at from idleness: the sender sets it only on the path where the
     * last line came back, so an abandoned run leaves it at nought — and the
     * counters of an abandoned run are rewound exactly like the counters of a
     * completed one.
     */
    expect(read(sender({ sent: 0, received: 0, startTime: 1700000000000 }))).toMatchObject({
      finished: false,
      received: 0,
      percent: 0,
    });
  });

  test('the same program started again is not finished any more', () => {
    // `Sender.next()` clears `finishTime` when a run begins, so a second run
    // cannot inherit the first one's answer.
    expect(read(sender({ sent: 4, received: 1, finishTime: 0 }))).toMatchObject({
      finished: false, percent: 3,
    });
  });
});
