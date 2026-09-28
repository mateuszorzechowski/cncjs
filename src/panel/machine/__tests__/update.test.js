import { isNewer } from '../update';

const MINE = { label: 'panel-2026.09.28', id: '3da6acb' };

describe('isNewer', () => {
  test('the same build on the server is no update', () => {
    expect(isNewer(MINE, { ...MINE })).toBe(false);
  });

  test('another build on the server is one, whatever its label', () => {
    expect(isNewer(MINE, { label: 'panel-2026.09.28 · 0158f10', id: '0158f10' })).toBe(true);
  });

  test('not asked yet, or an answer without an id, is no update', () => {
    expect(isNewer(MINE, null)).toBe(false);
    expect(isNewer(MINE, {})).toBe(false);
  });

  test('a panel that does not know its own build never claims one', () => {
    expect(isNewer(null, MINE)).toBe(false);
  });
});
