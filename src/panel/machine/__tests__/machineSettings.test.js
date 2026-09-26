import {
  changesOf, decoded, fieldText, filterRows, groupRows, groupsIn, isBad, isDirty, isInactive,
  pendingCounts, pendingRows, rowTitle, settingText, valueText, withBit, bitOf,
} from '../machineSettings';
import { grblUnit, settingFigure, settingInGrbl } from '../units';
import { NO_READING } from '../readings';
import i18next from '../../i18n';

const MM = { name: 'mm', factor: 1, digits: { position: 3, size: 1, feed: 0 } };
const INCH = { name: 'inch', factor: 1 / 25.4, digits: { position: 4, size: 2, feed: 1 } };

// Rows as the server sends them (`describeSettings`), trimmed.
const ROWS = [
  { name: '$3', group: 'axes', kind: 'mask', max: 7, bits: 'axes', value: 2, raw: '2' },
  { name: '$100', group: 'axes', kind: 'float', unit: 'perLength', min: 0, positive: true, axis: 'x', value: 800, raw: '800.000' },
  { name: '$110', group: 'axes', kind: 'float', unit: 'feed', min: 0, positive: true, axis: 'x', value: 3000, raw: '3000.000' },
  { name: '$22', group: 'homing', kind: 'bool', value: 1, raw: '1' },
  { name: '$20', group: 'limits', kind: 'bool', needs: '$22', value: 1, raw: '1' },
  { name: '$0', group: 'signals', kind: 'int', unit: 'us', min: 3, max: 255, value: 10, raw: '10' },
  { name: '$10', group: 'motion', kind: 'mask', max: 3, bits: 'report', value: 1, raw: '1' },
  { name: '$13', group: 'motion', kind: 'bool', locked: 'units', required: 0, value: 0, raw: '0', wrong: false },
];
const row = (name) => ROWS.find((r) => r.name === name);

beforeAll(() => i18next.changeLanguage('pl'));

describe('units for settings', () => {
  test('a figure there and back: steps divide, the rest multiply', () => {
    expect(settingFigure(800, 'perLength', INCH).value).toBe('20320.0000');
    expect(settingInGrbl('20320', 'perLength', INCH)).toBeCloseTo(800);
    expect(settingInGrbl('20', 'feed', INCH)).toBeCloseTo(508);
    expect(settingInGrbl('3,5', 'feed', MM)).toBe(3.5);
    expect(settingInGrbl('', 'feed', MM)).toBeNaN();
    expect(settingInGrbl('x', undefined, MM)).toBeNaN();
  });

  test('no rule: a dash for what converts, what Grbl has for the rest', () => {
    expect(settingFigure(420, 'length', null)).toEqual({ value: NO_READING, unit: '' });
    expect(settingFigure(10, 'us', null)).toEqual({ value: '10', unit: 'µs' });
  });

  test('Grbl\'s own unit, for the raw view, whatever the server shows', () => {
    expect(grblUnit('feed')).toBe('mm/min');
    expect(grblUnit('perLength')).toBe('kroków/mm');
    expect(grblUnit('ms')).toBe('ms');
    expect(grblUnit(undefined)).toBe('');
  });
});

describe('a draft', () => {
  test('shows as typed in its own view, converted in the other', () => {
    const draft = { text: '20', raw: false };
    expect(fieldText(row('$110'), draft, false, INCH)).toBe('20');
    expect(fieldText(row('$110'), draft, true, INCH)).toBe('508');
    const raw = { text: '508', raw: true };
    expect(fieldText(row('$110'), raw, false, INCH)).toBe('20.0000');
  });

  test('no draft: the controller\'s value, Grbl\'s text in the raw view', () => {
    expect(fieldText(row('$110'), undefined, true, INCH)).toBe('3000.000');
    expect(fieldText(row('$110'), undefined, false, MM)).toBe('3000.000');
  });

  test('is a change only when it changes what Grbl keeps', () => {
    expect(isDirty(row('$110'), { text: '3000', raw: false }, MM)).toBe(false);
    expect(isDirty(row('$110'), { text: '3000.0001', raw: false }, MM)).toBe(false);
    expect(isDirty(row('$110'), { text: '3500', raw: false }, MM)).toBe(true);
    expect(isDirty(row('$110'), undefined, MM)).toBe(false);
  });

  test('is bad outside the server\'s bounds', () => {
    expect(isBad(row('$110'), { text: '0' }, MM)).toBe(true);
    expect(isBad(row('$110'), { text: '-1' }, MM)).toBe(true);
    expect(isBad(row('$110'), { text: 'abc' }, MM)).toBe(true);
    expect(isBad(row('$0'), { text: '2' }, MM)).toBe(true);
    expect(isBad(row('$0'), { text: '5.5' }, MM)).toBe(true);
    expect(isBad(row('$22'), { text: '2' }, MM)).toBe(true);
    expect(isBad(row('$0'), { text: '5' }, MM)).toBe(false);
  });
});

describe('what the save bar holds', () => {
  const drafts = {
    $110: { text: '3500', raw: false },
    $0: { text: '10', raw: false },
    $22: { text: '0', raw: false },
  };

  test('only the drafts that change something, counted by group', () => {
    const pending = pendingRows(ROWS, drafts, MM);
    expect(pending.map(({ name }) => name)).toEqual(['$110', '$22']);
    expect(pendingCounts(pending)).toEqual({ axes: 1, homing: 1 });
  });

  test('sent as typed, with the units a figure was shown in', () => {
    const pending = pendingRows(ROWS, drafts, INCH);
    expect(changesOf(pending, drafts, INCH)).toEqual([
      { name: '$110', value: '3500', units: 'inch' },
      { name: '$22', value: '0', units: undefined },
    ]);
  });

  test('a switch or a mask by what it means', () => {
    expect(valueText(row('$22'), { text: '0' }, false, MM)).toBe('Wył.');
    expect(valueText(row('$3'), { text: '3' }, false, MM)).toBe('X · Y');
    expect(rowTitle(row('$110'))).toBe('Maks. prędkość X');
    expect(rowTitle(row('$0'))).toBe('Impuls kroku');
  });
});

describe('the layout', () => {
  test('groups with anything in them, rows outside the axes table', () => {
    expect(groupsIn(ROWS).map(({ id }) => id)).toEqual(['axes', 'homing', 'limits', 'signals', 'motion']);
    expect(groupRows(ROWS, 'axes')).toEqual([]);
    expect(groupRows(ROWS, 'motion').map(({ name }) => name)).toEqual(['$10', '$13']);
  });

  test('`$20` does nothing while `$22` is off, draft or not', () => {
    expect(isInactive(row('$20'), ROWS, {}, MM)).toBe(false);
    expect(isInactive(row('$20'), ROWS, { $22: { text: '0' } }, MM)).toBe(true);
    expect(isInactive(row('$0'), ROWS, {}, MM)).toBe(false);
  });

  test('the raw filter by `$`, name or group', () => {
    expect(filterRows(ROWS, '$1').map(({ name }) => name)).toEqual(['$100', '$110', '$10', '$13']);
    expect(filterRows(ROWS, 'bazow').map(({ name }) => name)).toEqual(['$22']);
    expect(filterRows(ROWS, ' ').length).toBe(ROWS.length);
  });

  test('what a value means', () => {
    expect(decoded(row('$10'))).toBe('MPos');
    expect(decoded({ ...row('$3'), value: 0 })).toBe('brak');
    expect(decoded(row('$0'))).toBe('');
    expect(settingText({ name: '$400' })).toEqual({ title: '$400', note: '' });
  });

  test('a mask\'s bits', () => {
    expect(bitOf(5, 2)).toBe(1);
    expect(withBit(5, 0, false)).toBe(4);
    expect(withBit(0, 1, true)).toBe(2);
  });
});
