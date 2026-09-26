import { geometryChecks, geometrySummary, homingTable, machineGeometry } from '../geometry';

// The bench's Grbl: 1000 × 700 × 150, homing on, soft and hard limits on.
const BENCH = {
  $3: '0', $20: '1', $21: '1', $22: '1', $23: '0', $24: '25.000', $25: '500.000', $27: '1.000',
  $130: '1000.000', $131: '700.000', $132: '150.000',
};

describe('the homing table', () => {
  test('every axis in [-travel, 0], standing a pull-off below the switch at the top', () => {
    expect(homingTable(BENCH)).toEqual([
      { axis: 'x', side: '+', range: { min: -1000, max: 0 }, after: -1, switchAt: 0 },
      { axis: 'y', side: '+', range: { min: -700, max: 0 }, after: -1, switchAt: 0 },
      { axis: 'z', side: '+', range: { min: -150, max: 0 }, after: -1, switchAt: 0 },
    ]);
  });

  test('with a bit in $23 the switch is at the bottom, and the range does not move', () => {
    const [x, y] = homingTable({ ...BENCH, $23: '1' });
    expect(x).toEqual({ axis: 'x', side: '-', range: { min: -1000, max: 0 }, after: -999, switchAt: -1000 });
    expect(y.side).toBe('+');
  });

  test('homing off: nowhere to stand after `$H`', () => {
    expect(homingTable({ ...BENCH, $22: '0' }).map(({ after }) => after)).toEqual([null, null, null]);
  });

  test('an axis without its travel has no range', () => {
    expect(homingTable({ ...BENCH, $132: undefined })[2]).toEqual({ axis: 'z', side: '+', range: null, after: null, switchAt: null });
  });
});

describe('the checks', () => {
  test('none on the bench', () => {
    expect(geometryChecks(BENCH)).toEqual([]);
  });

  test('soft limits without homing: Grbl will not use them', () => {
    expect(geometryChecks({ ...BENCH, $22: '0' })).toEqual([
      { level: 'error', code: 'soft-without-homing', name: '$22', group: 'homing' },
    ]);
  });

  test('a pull-off beyond a tenth of the shortest axis', () => {
    expect(geometryChecks({ ...BENCH, $27: '20' })).toEqual([
      { level: 'warn', code: 'pull-off-long', name: '$27', group: 'homing', value: 20 },
    ]);
  });

  test('seeking slower than locating', () => {
    expect(geometryChecks({ ...BENCH, $25: '10' })[0]).toEqual({ level: 'warn', code: 'seek-slower', name: '$25', group: 'homing' });
  });

  test('hard limits off, and never more than three', () => {
    expect(geometryChecks({ ...BENCH, $21: '0' })).toEqual([{ level: 'info', code: 'hard-off', name: '$21', group: 'limits' }]);
    expect(geometryChecks({ ...BENCH, $21: '0', $27: '50', $25: '1' })).toHaveLength(3);
  });
});

describe('the summary', () => {
  test('what, from which settings, in which group', () => {
    expect(geometrySummary({ ...BENCH, $3: '2', $23: '5' })).toEqual([
      { id: 'travel', names: ['$130', '$131', '$132'], group: 'axes', value: { x: 1000, y: 700, z: 150 } },
      { id: 'direction', names: ['$3'], group: 'axes', value: ['y'] },
      { id: 'homingSide', names: ['$23'], group: 'axes', value: { x: '-', y: '+', z: '-' } },
      { id: 'homing', names: ['$22', '$27'], group: 'homing', value: { on: true, pullOff: 1 } },
      { id: 'softLimits', names: ['$20'], group: 'limits', value: 'on' },
      { id: 'hardLimits', names: ['$21'], group: 'limits', value: true },
    ]);
  });

  test('soft limits on without homing are inactive, not on', () => {
    expect(geometrySummary({ ...BENCH, $22: '0' })[4].value).toBe('inactive');
    expect(geometrySummary({ ...BENCH, $20: '0' })[4].value).toBe('off');
  });

  test('nothing before `$$`', () => {
    expect(machineGeometry(undefined)).toBeNull();
    expect(machineGeometry({})).toBeNull();
    expect(machineGeometry(BENCH)).toEqual(expect.objectContaining({ checks: [] }));
  });
});
