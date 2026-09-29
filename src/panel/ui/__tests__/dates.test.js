import { currentLanguage } from '../../i18n';
import { dateFormat } from '../dates';

jest.mock('../../i18n', () => ({ currentLanguage: jest.fn() }));

describe('dates in the panel\'s language', () => {
  const day = new Date(2026, 8, 29, 7, 5);

  test('follow the language in force at each call, not the browser\'s', () => {
    const month = dateFormat({ month: 'long' });

    currentLanguage.mockReturnValue('pl');
    expect(month.format(day)).toBe('wrzesień');

    // Switched in Settings: the same formatter, no reload.
    currentLanguage.mockReturnValue('en');
    expect(month.format(day)).toBe('September');
  });
});
