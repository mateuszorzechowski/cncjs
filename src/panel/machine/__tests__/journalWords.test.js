import { describeEntry } from '../journalWords';
import { passes } from '../journal';

jest.mock('../../i18n', () => ({ t: (key) => key }));

const entry = (fields) => ({ id: 1, time: '2026-09-24T17:45:52.118Z', level: 'info', source: 'server', ...fields });

describe('what an entry says', () => {
  test('an alarm and an error by their code, from Grbl\'s own table', () => {
    expect(describeEntry(entry({ event: 'alarm', code: 'ALARM:3' }))).toEqual({ key: 'grbl.alarm.3', params: {} });
    expect(describeEntry(entry({ event: 'error', code: 'error:33' }))).toEqual({ key: 'grbl.error.33', params: {} });
  });

  test('a pause by its reason, with where it stopped', () => {
    const paused = entry({ event: 'program', code: 'pause', data: { reason: 'M6' }, program: { name: 'part.nc', line: 412, total: 989 } });
    expect(describeEntry(paused)).toEqual({ key: 'journal.pause.m6', params: { name: 'part.nc', line: 412, total: 989 } });
  });

  test('a refusal in the same words the panel uses when it happens', () => {
    expect(describeEntry(entry({ event: 'refused', code: 'program-running' })).key).toBe('refusal.programRunning');
  });

  test('a console line, with the line', () => {
    expect(describeEntry(entry({ event: 'command', code: 'gcode', data: { line: 'G10 L20 P1 Z0' } })))
      .toEqual({ key: 'journal.command.line', params: { line: 'G10 L20 P1 Z0' } });
  });

  test('the firmware\'s own words, untranslated', () => {
    expect(describeEntry(entry({ event: 'message', data: { text: '[MSG:Caution: Unlocked]' } })))
      .toEqual({ text: '[MSG:Caution: Unlocked]' });
    expect(describeEntry(entry({ event: 'sent', data: { line: '$X' } }))).toEqual({ text: '$X' });
  });

  test('a code newer than this panel is shown as it came, not dropped', () => {
    expect(describeEntry(entry({ event: 'error', code: 'error:99' }))).toEqual({ text: 'error:99' });
    expect(describeEntry(entry({ event: 'something-new' }))).toEqual({ text: 'something-new' });
  });
});

describe('whether a live entry belongs on screen', () => {
  test('a level is a floor, as on the server', () => {
    expect(passes(entry({ level: 'error' }), { level: 'warn', source: 'all' })).toBe(true);
    expect(passes(entry({ level: 'info' }), { level: 'warn', source: 'all' })).toBe(false);
  });

  test('a source is exact, and all is all', () => {
    expect(passes(entry({ source: 'controller' }), { level: 'debug', source: 'server' })).toBe(false);
    expect(passes(entry({ source: 'controller' }), { level: 'debug', source: 'all' })).toBe(true);
  });
});
