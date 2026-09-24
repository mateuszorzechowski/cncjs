import { commandEntry } from '../commands';

describe('which commands the journal keeps', () => {
  test('the big STOP is a warning, because it is what is looked for afterwards', () => {
    expect(commandEntry('reset')).toEqual({ level: 'warn', source: 'server', event: 'command', code: 'reset' });
  });

  test('a console line, with the line', () => {
    expect(commandEntry('gcode', { line: 'G10 L20 P1 Z0' })).toMatchObject({ level: 'info', data: { line: 'G10 L20 P1 Z0' } });
  });

  test('jogging only at debug', () => {
    expect(commandEntry('jogStart').level).toBe('debug');
  });

  test.each(['statusreport', 'jogHold', 'gcode:start', 'gcode:pause'])('%s is not kept here', (cmd) => {
    // Ten a second, or recorded by what it did to the program.
    expect(commandEntry(cmd)).toBeNull();
  });
});
