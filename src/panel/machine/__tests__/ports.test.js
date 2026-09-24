import controller from '../controller';
import {
  readPorts,
  baudrateChoices,
  controllerChoices,
  preferredConnection,
  requestPorts,
  openPort,
  closePort,
  DEFAULT_BAUDRATE,
  DEFAULT_CONTROLLER,
  PORT_OPEN,
  PORT_BUSY,
  PORT_FREE,
} from '../ports';

jest.mock('../controller', () => ({
  listPorts: jest.fn(),
  openPort: jest.fn(),
  closePort: jest.fn(),
}));

describe('readPorts', () => {
  test('tells the port this panel holds from one somebody else holds', () => {
    // Both are `inuse` as far as the server is concerned. Only one of them is
    // this panel's, and only that one may be offered a Disconnect.
    const rows = readPorts([
      { port: 'COM3', manufacturer: 'Arduino LLC', inuse: true },
      { port: 'COM4', manufacturer: 'FTDI', inuse: true },
      { port: 'COM5', manufacturer: '', inuse: false },
    ], 'COM3');

    expect(rows.map((row) => row.state)).toEqual([PORT_OPEN, PORT_BUSY, PORT_FREE]);
  });

  test('holds nothing when the panel is attached to nothing', () => {
    const rows = readPorts([{ port: 'COM3', inuse: true }], '');
    expect(rows[0].state).toBe(PORT_BUSY);
  });

  test('sorts by name, so a refresh does not move a row under a finger', () => {
    // The server concatenates `config.get('ports')` onto the driver's list, so
    // what arrives is in no order at all.
    const rows = readPorts([
      { port: 'COM10' },
      { port: 'COM3' },
      { port: '/dev/ttyUSB0' },
    ]);
    expect(rows.map((row) => row.port)).toEqual(['/dev/ttyUSB0', 'COM10', 'COM3']);
  });

  test('drops a row with no port, which is a row nothing can open', () => {
    expect(readPorts([{ manufacturer: 'FTDI' }, null, { port: 'COM3' }]))
      .toHaveLength(1);
  });

  test('survives a server that has not answered yet', () => {
    expect(readPorts(undefined)).toEqual([]);
    expect(readPorts(null)).toEqual([]);
  });

  test('carries the manufacturer, and an absence of one as an empty string', () => {
    const [named, bare] = readPorts([
      { port: 'COM3', manufacturer: 'Arduino LLC' },
      { port: 'COM4' },
    ]);
    expect(named.manufacturer).toBe('Arduino LLC');
    expect(bare.manufacturer).toBe('');
  });
});

describe('baudrateChoices', () => {
  test('offers the common rates largest first', () => {
    expect(baudrateChoices()).toEqual([250000, 115200, 57600, 38400, 19200, 9600]);
  });

  test('merges what this installation configured, without repeating it', () => {
    expect(baudrateChoices([76800, 115200])).toEqual(
      [250000, 115200, 76800, 57600, 38400, 19200, 9600],
    );
  });

  test('ignores a configured rate that is not a number', () => {
    // `.cncrc` is hand-edited and its `baudrates` is whatever was typed.
    expect(baudrateChoices(['', null, 'fast'])).toEqual(baudrateChoices());
  });
});

describe('controllerChoices', () => {
  test('offers what the server says it loaded', () => {
    expect(controllerChoices(['Grbl', 'Marlin'])).toEqual(['Grbl', 'Marlin']);
  });

  test('falls back rather than offering an empty choice', () => {
    // Before `startup` arrives the client's list is empty, and a screen with
    // no controller to pick cannot be connected from at all.
    expect(controllerChoices([])).toEqual([DEFAULT_CONTROLLER]);
    expect(controllerChoices()).toEqual([DEFAULT_CONTROLLER]);
  });
});

describe('the three calls that reach the server', () => {
  beforeEach(() => {
    controller.listPorts.mockClear();
    controller.openPort.mockClear();
    controller.closePort.mockClear();
  });

  test('asking for the list takes no callback, because the answer is an event', () => {
    requestPorts();
    expect(controller.listPorts).toHaveBeenCalledTimes(1);
  });

  test('opening defaults to Grbl at 115200 and lets both be overridden', async () => {
    controller.openPort.mockImplementation((port, options, done) => done(null));

    await openPort('COM3');
    expect(controller.openPort).toHaveBeenCalledWith(
      'COM3',
      { controllerType: DEFAULT_CONTROLLER, baudrate: DEFAULT_BAUDRATE },
      expect.any(Function),
    );

    await openPort('COM4', { controllerType: 'Marlin', baudrate: 250000 });
    expect(controller.openPort).toHaveBeenLastCalledWith(
      'COM4',
      { controllerType: 'Marlin', baudrate: 250000 },
      expect.any(Function),
    );
  });

  test('a refusal rejects, even though it arrives empty', async () => {
    // socket.io JSON-encodes the ack arguments and an Error's `message` is not
    // enumerable, so the server's reason arrives as `{}`. Truthy is the whole
    // of what the panel can know.
    controller.openPort.mockImplementation((port, options, done) => done({}));
    await expect(openPort('COM3')).rejects.toBeDefined();
  });

  test('closing names the port, because the server holds more than one', async () => {
    controller.closePort.mockImplementation((port, done) => done(null));
    await closePort('COM3');
    expect(controller.closePort).toHaveBeenCalledWith('COM3', expect.any(Function));
  });

  test('a close that fails rejects rather than reporting success', async () => {
    controller.closePort.mockImplementation((port, done) => done({}));
    await expect(closePort('COM3')).rejects.toBeDefined();
  });
});

describe('what the connection screen offers', () => {
  // What a Windows bench lists: the onboard header first, the machine second.
  const rows = [{ port: 'COM1' }, { port: 'COM3' }];
  const offer = (over) => preferredConnection({ rows, ...over });

  test('the first port listed is the last word, not the first', () => {
    /*
     * The defect this exists for. `COM1` is an onboard header with nothing on
     * it and it sorts first; the machine is on `COM3`. Falling back to the
     * list meant every disconnect offered a port that has never been right.
     */
    expect(offer({}).port).toBe('COM1');
    expect(offer({ last: { port: 'COM3' } }).port).toBe('COM3');
  });

  test('what this panel is holding outranks what was last opened', () => {
    // Attached to a port somebody else opened: the screen is about *this*
    // connection, and Disconnect has to point at the right one.
    expect(offer({ held: 'COM1', last: { port: 'COM3' } }).port).toBe('COM1');
  });

  test('and the operator outranks everything', () => {
    expect(offer({
      choice: { picked: 'COM1' }, held: 'COM3', last: { port: 'COM3' },
    }).port).toBe('COM1');
  });

  test('a remembered port that is no longer plugged in does not win', () => {
    // Derived rather than stored, so a port can be unplugged while the screen
    // is open without leaving the button aimed at hardware that is not there.
    expect(offer({ last: { port: 'COM9' } }).port).toBe('COM1');
    expect(preferredConnection({ rows: [], last: { port: 'COM3' } }).port).toBe('');
  });

  test('the controller and the rate are remembered too', () => {
    /*
     * The half Mateusz asked for by name: connect `COM3` at Grbl/115200 on one
     * client, and the next client must not be back at the defaults. There is
     * no list to check these against, so a remembered value stands until the
     * operator says otherwise.
     */
    expect(offer({ last: { port: 'COM3', controllerType: 'Marlin', baudrate: 9600 } }))
      .toEqual({ port: 'COM3', controllerType: 'Marlin', baudrate: 9600 });

    // Carried as a string by the server's own config, and still a number here.
    expect(offer({ last: { baudrate: '250000' } }).baudrate).toBe(250000);
  });

  test('nothing remembered is the default, not an empty choice', () => {
    expect(offer({})).toEqual({
      port: 'COM1', controllerType: DEFAULT_CONTROLLER, baudrate: DEFAULT_BAUDRATE,
    });
    expect(offer({ last: null })).toMatchObject({ controllerType: DEFAULT_CONTROLLER });
  });

  test('the operator overrides the memory, one field at a time', () => {
    const last = { port: 'COM3', controllerType: 'Marlin', baudrate: 9600 };
    expect(offer({ choice: { pickedType: 'Grbl' }, last })).toEqual({
      port: 'COM3', controllerType: 'Grbl', baudrate: 9600,
    });
    expect(offer({ choice: { pickedRate: 115200 }, last })).toEqual({
      port: 'COM3', controllerType: 'Marlin', baudrate: 115200,
    });
  });
});
