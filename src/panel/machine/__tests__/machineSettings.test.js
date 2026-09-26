import {
  axisQuantityOf, maskNumber, maskOptions, maskValue, settingGroups, settingText, shownSetting,
} from '../machineSettings';
import { settingFigure } from '../units';
import { NO_READING } from '../readings';
import i18next from '../../i18n';

const MM = { name: 'mm', factor: 1, digits: { position: 3, size: 1, feed: 0 } };
const INCH = { name: 'inch', factor: 1 / 25.4, digits: { position: 4, size: 2, feed: 1 } };

// Rows as the server sends them (`describeSettings`), trimmed.
const row = (name, extra) => ({ name, kind: 'float', ...extra });
const ROWS = [
  row('$0', { group: 'motors', kind: 'int', unit: 'us', value: 10 }),
  row('$10', { group: 'report', kind: 'mask', bits: 'report', value: 3 }),
  row('$20', { group: 'limits', kind: 'bool', value: 1 }),
  row('$23', { group: 'homing', kind: 'mask', bits: 'axes', value: 5 }),
  row('$100', { group: 'axes', unit: 'perLength', axis: 'x', value: 800 }),
  row('$101', { group: 'axes', unit: 'perLength', axis: 'y', value: 800 }),
  row('$102', { group: 'axes', unit: 'perLength', axis: 'z', value: 400 }),
  row('$110', { group: 'axes', unit: 'feed', axis: 'x', value: 500 }),
  row('$400', { group: 'other', value: 2 }),
];

beforeAll(() => i18next.changeLanguage('pl'));

describe('settingFigure', () => {
  test('a length, a rate, an acceleration: multiplied by the factor', () => {
    expect(settingFigure(420, 'length', MM)).toEqual({ value: '420.000', unit: 'mm' });
    expect(settingFigure(25.4, 'length', INCH)).toEqual({ value: '1.0000', unit: 'in' });
    expect(settingFigure(508, 'feed', INCH)).toEqual({ value: '20.0000', unit: 'in/min' });
    expect(settingFigure(12.7, 'accel', INCH)).toEqual({ value: '0.5000', unit: 'in/s²' });
  });

  test('steps per length: divided — 800 steps/mm is 20320 steps/in', () => {
    expect(settingFigure(800, 'perLength', MM)).toEqual({ value: '800.000', unit: 'kroków/mm' });
    expect(settingFigure(800, 'perLength', INCH)).toEqual({ value: '20320.0000', unit: 'kroków/in' });
  });

  test('what does not convert is what Grbl has', () => {
    expect(settingFigure(10, 'us', INCH)).toEqual({ value: '10', unit: 'µs' });
    expect(settingFigure(12000, 'rpm', INCH)).toEqual({ value: '12000', unit: 'obr/min' });
    expect(settingFigure(2, undefined, INCH)).toEqual({ value: '2', unit: '' });
  });

  test('no rule yet: a dash, never a millimetre dressed as an inch', () => {
    expect(settingFigure(420, 'length', null)).toEqual({ value: NO_READING, unit: '' });
    expect(settingFigure(10, 'us', null)).toEqual({ value: '10', unit: 'µs' });
    expect(settingFigure(undefined, 'us', MM)).toEqual({ value: NO_READING, unit: '' });
  });
});

describe('shownSetting', () => {
  test('a switch in words', () => {
    expect(shownSetting(ROWS[2], MM)).toEqual({ value: 'Włączone', unit: '' });
    expect(shownSetting({ ...ROWS[2], value: 0 }, MM)).toEqual({ value: 'Wyłączone', unit: '' });
  });

  test('a mask as what its bits stand for', () => {
    expect(shownSetting(ROWS[3], MM).value).toBe('X · Z');
    expect(shownSetting(ROWS[1], MM).value).toBe('Pozycja maszyny · Bufor planera');
    expect(shownSetting({ ...ROWS[3], value: 0 }, MM).value).toBe('Żadna');
  });

  test('a figure in the server\'s units', () => {
    expect(shownSetting(ROWS[7], INCH)).toEqual({ value: '19.6850', unit: 'in/min' });
  });
});

describe('masks as ToggleChips hold them', () => {
  test('there and back', () => {
    expect(maskValue(5)).toEqual({ 1: true, 2: false, 4: true });
    expect(maskNumber(maskValue(5))).toBe(5);
    expect(maskNumber({ 1: false, 2: true, 4: false })).toBe(2);
  });

  test('options by what the bits are', () => {
    expect(maskOptions('axes')).toEqual([{ id: '1', label: 'X' }, { id: '2', label: 'Y' }, { id: '4', label: 'Z' }]);
    expect(maskOptions('report').map(({ id }) => id)).toEqual(['1', '2']);
    expect(maskOptions(undefined)).toEqual([]);
  });
});

describe('settingGroups', () => {
  test('the tab\'s order, the axes as quantities of three, empty groups left out', () => {
    const groups = settingGroups(ROWS);

    expect(groups.map(({ group }) => group)).toEqual(['axes', 'limits', 'homing', 'report', 'motors', 'other']);
    const [axes] = groups;
    expect(axes.rows).toEqual([]);
    expect(axes.quantities.map(({ id, rows }) => [id, rows.map(({ name }) => name)])).toEqual([
      ['steps', ['$100', '$101', '$102']],
      ['rate', ['$110']],
    ]);
  });

  test('nothing reported, nothing to group', () => {
    expect(settingGroups([])).toEqual([]);
    expect(settingGroups(undefined)).toEqual([]);
  });
});

describe('settingText', () => {
  test('a setting the panel knows is named and described', () => {
    expect(settingText(ROWS[2])).toEqual({ title: 'Miękkie limity', note: expect.stringContaining('bazowania') });
  });

  test('an axis setting by its quantity', () => {
    expect(settingText(ROWS[4], axisQuantityOf('$100')).title).toBe('Kroki silnika');
    expect(axisQuantityOf('$132').id).toBe('travel');
    expect(axisQuantityOf('$133')).toBe(null);
    expect(axisQuantityOf('$20')).toBe(null);
  });

  test('one it does not know, by its `$` alone', () => {
    expect(settingText(ROWS[8])).toEqual({ title: '$400', note: '' });
  });
});
