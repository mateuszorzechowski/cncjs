import { consoleLine, createConsole, recall, remember } from '../mdi';

describe('which lines the console shows', () => {
  test('a line written, as written', () => {
    expect(consoleLine('out', 'G0 X10\n')).toEqual({ direction: 'out', kind: 'sent', text: 'G0 X10' });
    expect(consoleLine('out', '$$\n')).toMatchObject({ kind: 'sent', text: '$$' });
  });

  test.each(['?', '!', '~', '\x18', '\x85', '\x91', '$J=G91 G21 X1 F1000\n', '', '\n'])('not %p', (raw) => {
    // Ten a second while a key is held, or a byte nobody reads as a line.
    expect(consoleLine('out', raw)).toBeNull();
  });

  test('ok, and the rest of an answer as it came', () => {
    expect(consoleLine('in', 'ok')).toEqual({ direction: 'in', kind: 'ok', text: 'ok' });
    expect(consoleLine('in', '[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]')).toMatchObject({ kind: 'reply' });
  });

  test('an error by its number, without the server\'s English', () => {
    expect(consoleLine('in', 'error:9 (G-code locked out during alarm or jog state)'))
      .toEqual({ direction: 'in', kind: 'error', text: 'error:9', key: 'grbl.error.9' });
    expect(consoleLine('in', 'ALARM:1 (Hard limit)')).toMatchObject({ kind: 'alarm', text: 'ALARM:1', key: 'grbl.alarm.1' });
  });

  test('a code newer than the panel keeps its number and has no meaning to show', () => {
    expect(consoleLine('in', 'error:99')).toMatchObject({ kind: 'error', text: 'error:99', key: null });
  });

  test('not a status report', () => {
    expect(consoleLine('in', '<Idle|MPos:0.000,0.000,0.000|FS:0,0>')).toBeNull();
  });
});

describe('the console kept', () => {
  test('in order, bounded, and each line with its own id', () => {
    const lines = createConsole(3);
    ['G0 X1', 'ok', 'G0 X2', 'ok'].forEach((text, i) => lines.add(i % 2 ? 'in' : 'out', text));

    expect(lines.lines().map(({ text }) => text)).toEqual(['ok', 'G0 X2', 'ok']);
    expect(new Set(lines.lines().map(({ id }) => id)).size).toBe(3);
  });

  test('attaches to the controller once, however often it is asked', () => {
    const controller = { addListener: jest.fn() };
    const lines = createConsole();
    lines.listen(controller);
    lines.listen(controller);

    expect(controller.addListener.mock.calls.map(([event]) => event)).toEqual(['serialport:write', 'serialport:read', 'command:refused']);
  });

  test('a refused line stays in the console with the reason', () => {
    const lines = createConsole();
    lines.sending('G0 X1');
    lines.refused({ cmd: 'gcode', reason: 'alarm' });

    expect(lines.lines()).toEqual([expect.objectContaining({
      kind: 'refused', text: 'G0 X1', refusal: { key: 'refusal.alarm', values: { cmd: 'gcode' } },
    })]);
  });

  test('a refusal of something else, or of a line already written, is not this one', () => {
    const lines = createConsole();
    lines.sending('G0 X1');
    lines.refused({ cmd: 'zero', reason: 'alarm' });
    lines.add('out', 'G0 X1');
    lines.refused({ cmd: 'gcode', reason: 'alarm' });

    expect(lines.lines().map(({ kind }) => kind)).toEqual(['sent']);
  });

  test('tells the screen when it changes', () => {
    const lines = createConsole();
    const seen = jest.fn();
    lines.subscribe(seen);
    lines.add('out', '?');
    lines.add('out', 'G0 X1');
    lines.clear();

    // The status query changed nothing, so nothing was said about it.
    expect(seen).toHaveBeenCalledTimes(2);
  });
});

describe('what was sent before', () => {
  test('up goes back, down comes forward to an empty line, and neither runs off the end', () => {
    const history = ['G0 X1', 'G0 X2'];
    expect(recall(history, 2, -1)).toBe(1);
    expect(recall(history, 0, -1)).toBe(0);
    expect(recall(history, 1, 1)).toBe(2);
    expect(recall(history, 2, 1)).toBe(2);
  });

  test('the same line twice is remembered once', () => {
    expect(remember(['G0 X1'], 'G0 X1')).toEqual(['G0 X1']);
    expect(remember(['G0 X1'], 'G0 X2')).toEqual(['G0 X1', 'G0 X2']);
    expect(remember(['a', 'b'], 'c', 2)).toEqual(['b', 'c']);
  });
});
