import { checkLines, createCheckRun } from '../check-run';
import { TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS, TOOL_CHANGE_POLICY_SEND_M6_COMMANDS } from '../../constants';

const program = (...lines) => lines.join('\n');

describe('what goes to the cable', () => {
  test('lines without comments, numbered as the sender numbers them', () => {
    expect(checkLines(program('G21 (mm)', '', '; note', 'G0 X1 ; go', '%wait', 'G1 X2'))).toEqual({
      lines: [{ number: 1, line: 'G21' }, { number: 3, line: 'G0 X1' }, { number: 5, line: 'G1 X2' }],
      total: 5,
    });
  });

  test('M6 is commented out, as the sender does, unless the policy sends it', () => {
    expect(checkLines('T2 M6', { toolChangePolicy: TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS }).lines[0].line).toBe('T2 (M6)');
    expect(checkLines('T2 M6', { toolChangePolicy: TOOL_CHANGE_POLICY_SEND_M6_COMMANDS }).lines[0].line).toBe('T2 M6');
  });

  test('an expression is filled in as it would be sent', () => {
    expect(checkLines('G0 X[a]', { translate: (line) => line.replace('[a]', '7') }).lines[0].line).toBe('G0 X7');
  });
});

/** A run against a Grbl played by the test. */
const bench = (text, options = {}) => {
  const { lines, total } = checkLines(text);
  const written = [];
  const said = { done: null, progress: [] };
  const run = createCheckRun({
    lines,
    total,
    write: (line) => written.push(line),
    done: (result) => {
      said.done = result;
    },
    progress: (p) => said.progress.push(p),
    ...options,
  });
  return { run, written, said };
};

describe('a run', () => {
  test('goes into check mode, sends the file, collects every error, and leaves', () => {
    const { run, written, said } = bench(program('G21', 'G41', 'G0 X1', 'G41'));

    run.start();
    expect(written).toEqual(['$C']);
    run.ok(); // $C
    expect(written).toEqual(['$C', 'G21', 'G41', 'G0 X1', 'G41']);
    run.ok();
    run.error('error:20');
    run.ok();
    run.error('error:20');
    expect(written[written.length - 1]).toBe('$C');
    run.ok();
    expect(said.done).toBeNull(); // the `ok` of `$C` itself: not until Grbl has reset
    run.startup();

    expect(said.done).toEqual({
      complete: true,
      total: 4,
      errors: [{ code: 'error:20', line: 2, sent: 'G41', count: 2 }],
      alarm: null,
      stoppedAt: null,
    });
    expect(run.running).toBe(false);
  });

  test('to the first error: sends no more, hears out what is in the buffer, and leaves', () => {
    const long = `G1 X${'1'.repeat(36)}`; // two fit the buffer beside G41, a third waits
    const { run, written, said } = bench(program('G41', long, long, long), { firstError: true });

    run.start();
    run.ok();
    expect(written).toEqual(['$C', 'G41', long, long]);
    run.error('error:20');
    expect(written).toHaveLength(4); // the third long line is never sent
    run.ok();
    run.error('error:33'); // already in the buffer: still heard, still kept
    expect(written[written.length - 1]).toBe('$C');
    run.ok();
    run.startup();

    expect(said.done).toMatchObject({ complete: false, firstError: true, stoppedAt: 1 });
    expect(said.done.errors.map(error => error.code)).toEqual(['error:20', 'error:33']);
  });

  test('to the first error, when it is on the last line, is every line read', () => {
    const { run, said } = bench(program('G21', 'G41'), { firstError: true });

    run.start();
    run.ok();
    run.ok();
    run.error('error:20');
    run.ok();
    run.startup();

    expect(said.done).toMatchObject({ complete: true });
    expect(said.done.firstError).toBeUndefined();
  });

  test('keeps no more than Grbl\'s buffer in flight', () => {
    const line = `G1 X${'1'.repeat(36)}`; // 40 characters, 41 with the newline
    const { run, written } = bench(program(line, line, line, line));

    run.start();
    run.ok();
    expect(written.length - 1).toBe(2); // 82 of 120; a third would be 123
    run.ok();
    expect(written.length - 1).toBe(3);
  });

  test('an alarm ends it where it stood, with the rest unread', () => {
    const { run, said } = bench(program('G21', 'G53 G0 X10', 'G0 X1'));

    run.start();
    run.ok();
    run.ok();
    run.alarm('ALARM:2');

    expect(said.done).toMatchObject({ complete: false, alarm: 'ALARM:2', stoppedAt: 2 });
    run.startup(); // the reset somebody does afterwards is not a second result
    expect(said.done.alarm).toBe('ALARM:2');
  });

  test('a reset in the middle ends it too', () => {
    const { run, said } = bench(program('G21', 'G0 X1'));

    run.start();
    run.ok();
    run.startup();

    expect(said.done).toMatchObject({ complete: false, reset: true, stoppedAt: 1 });
  });

  test('a Grbl that will not go into check mode says why', () => {
    const { run, said } = bench('G21');

    run.start();
    run.error('error:8');

    expect(said.done).toMatchObject({ complete: false, refused: 'error:8' });
  });

  test('says how far it has got', () => {
    const { run, said } = bench(Array.from({ length: 250 }, () => 'G0 X1').join('\n'));

    run.start();
    run.ok();
    for (let i = 0; i < 250; i++) {
      run.ok();
    }

    expect(said.progress).toEqual([{ answered: 100, total: 250 }, { answered: 200, total: 250 }]);
  });

  test('an empty file goes in and straight out', () => {
    const { run, written, said } = bench('(nothing)');

    run.start();
    run.ok();
    expect(written).toEqual(['$C', '$C']);
    run.ok();
    run.startup();
    expect(said.done).toMatchObject({ complete: true, errors: [] });
  });
});
