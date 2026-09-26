import { SETTINGS, describeSettings, settingWrite } from '../machine-settings';

// What `$$` says on this bench's Grbl 1.1h, trimmed to the ones used here.
const REPORTED = {
  '$0': '10', '$2': '0', '$10': '1', '$13': '0', '$20': '1', '$24': '25.000',
  '$30': '1000.000', '$100': '800.000', '$110': '500.000', '$120': '10.000', '$130': '420.000',
};

describe('describeSettings', () => {
  test('the table\'s order, only what the controller reported, values as numbers', () => {
    const rows = describeSettings(REPORTED);

    // The settings design's order: axes, homing, limits, spindle, signals, motion.
    expect(rows.map((row) => row.name)).toEqual(['$100', '$110', '$120', '$130', '$24', '$20', '$30', '$0', '$2', '$10', '$13']);
    expect(rows.find((row) => row.name === '$110')).toEqual({
      name: '$110', group: 'axes', kind: 'float', unit: 'feed', min: 0, axis: 'x', value: 500, raw: '500.000',
    });
  });

  test('a setting the table does not know is listed last, as a raw one', () => {
    const rows = describeSettings({ '$0': '10', '$400': '2', '$33': '5000' });

    expect(rows.map(({ name, group }) => [name, group])).toEqual([['$0', 'signals'], ['$33', 'other'], ['$400', 'other']]);
  });

  test('nothing reported, nothing listed', () => {
    expect(describeSettings(undefined)).toEqual([]);
  });

  test('every name in the table is Grbl\'s and appears once', () => {
    const names = SETTINGS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((name) => /^\$\d{1,3}$/.test(name))).toBe(true);
  });
});

describe('settingWrite', () => {
  test('millimetres go as they were given, to three decimals', () => {
    expect(settingWrite({ name: '$110', value: 800 }, REPORTED)).toEqual({ line: '$110=800.000', value: '800.000' });
  });

  test('a figure shown in inches is written in what Grbl keeps', () => {
    // 20 in/min is 508 mm/min; 1 in is 25.4 mm; 20320 steps/in is 800 steps/mm;
    // and 0.5 in/s² is 12.7 mm/s².
    expect(settingWrite({ name: '$110', value: 20, units: 'inch' }, REPORTED).line).toBe('$110=508.000');
    expect(settingWrite({ name: '$130', value: 1, units: 'inch' }, REPORTED).line).toBe('$130=25.400');
    expect(settingWrite({ name: '$100', value: 20320, units: 'inch' }, REPORTED).line).toBe('$100=800.000');
    expect(settingWrite({ name: '$120', value: 0.5, units: 'inch' }, REPORTED).line).toBe('$120=12.700');
  });

  test('what does not convert, does not — whatever the units', () => {
    expect(settingWrite({ name: '$30', value: 12000, units: 'inch' }, REPORTED).line).toBe('$30=12000.000');
    expect(settingWrite({ name: '$0', value: 5, units: 'inch' }, REPORTED).line).toBe('$0=5');
  });

  test('text as a person types it, a comma for the point', () => {
    expect(settingWrite({ name: '$110', value: ' 750,5 ' }, REPORTED).line).toBe('$110=750.500');
  });

  test('switches and masks as whole numbers within their bits', () => {
    expect(settingWrite({ name: '$20', value: 0 }, REPORTED).line).toBe('$20=0');
    expect(settingWrite({ name: '$10', value: 3 }, REPORTED).line).toBe('$10=3');
    expect(settingWrite({ name: '$20', value: 2 }, REPORTED)).toEqual({ refusal: 'bad-value' });
    expect(settingWrite({ name: '$2', value: 8 }, REPORTED)).toEqual({ refusal: 'bad-value' });
    expect(settingWrite({ name: '$10', value: 1.5 }, REPORTED)).toEqual({ refusal: 'bad-value' });
  });

  test('Grbl\'s own floor on a step pulse', () => {
    expect(settingWrite({ name: '$0', value: 2 }, REPORTED)).toEqual({ refusal: 'bad-value' });
  });

  test('nought steps, rate or acceleration would stop the axis for good', () => {
    expect(settingWrite({ name: '$100', value: 0 }, REPORTED)).toEqual({ refusal: 'bad-value' });
    expect(settingWrite({ name: '$110', value: 0 }, REPORTED)).toEqual({ refusal: 'bad-value' });
    expect(settingWrite({ name: '$24', value: 0 }, REPORTED)).toEqual({ refusal: 'bad-value' });
    expect(settingWrite({ name: '$110', value: -1 }, REPORTED)).toEqual({ refusal: 'bad-value' });
  });

  test('not a number is not a value', () => {
    expect(settingWrite({ name: '$110', value: 'fast' }, REPORTED)).toEqual({ refusal: 'bad-value' });
    expect(settingWrite({ name: '$110', value: '' }, REPORTED)).toEqual({ refusal: 'bad-value' });
    expect(settingWrite({ name: '$110' }, REPORTED)).toEqual({ refusal: 'bad-value' });
  });

  test('only a setting the controller reported', () => {
    expect(settingWrite({ name: '$111', value: 500 }, REPORTED)).toEqual({ refusal: 'unknown-setting' });
    expect(settingWrite({ name: '$110', value: 500 }, {})).toEqual({ refusal: 'unknown-setting' });
    expect(settingWrite(undefined, REPORTED)).toEqual({ refusal: 'unknown-setting' });
  });

  test('`$13` is read, never written: the server reads every report as millimetres', () => {
    expect(settingWrite({ name: '$13', value: 1 }, REPORTED)).toEqual({ refusal: 'setting-locked' });
  });

  test('except back to what the server needs — the fix for a controller set otherwise', () => {
    expect(settingWrite({ name: '$13', value: 0 }, { ...REPORTED, $13: '1' }).line).toBe('$13=0');
  });

  test('a locked setting holding the wrong value says so', () => {
    expect(describeSettings({ $13: '1' })[0]).toEqual(expect.objectContaining({ wrong: true, required: 0 }));
    expect(describeSettings({ $13: '0' })[0]).toEqual(expect.objectContaining({ wrong: false }));
    expect(describeSettings({ $20: '1' })[0]).not.toHaveProperty('wrong');
  });

  test('one the table does not know is written as a number', () => {
    expect(settingWrite({ name: '$400', value: 2 }, { '$400': '1' }).line).toBe('$400=2.000');
  });
});
