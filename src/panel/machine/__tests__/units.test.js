import { feedLabel, figure, lengthLabel } from '../units';
import { NO_READING } from '../readings';
import i18next from '../../i18n';

// The server's two rules, as `GET /api/units` sends them — the parts read here.
const MM = { name: 'mm', factor: 1, digits: { position: 3, size: 1, feed: 0 } };
const INCH = { name: 'inch', factor: 1 / 25.4, digits: { position: 4, size: 2, feed: 1 } };

describe('a length as an operator reads it', () => {
  test('keeps its digits, so they do not move as the figure changes', () => {
    expect(figure(12.5, MM)).toBe('12.500');
    expect(figure(0, MM)).toBe('0.000');
    expect(figure(-3, MM)).toBe('-3.000');
  });

  test('is in inches when the server says inches, to the ten-thousandth', () => {
    // −26.4 mm is the bench's measured G20 move, one inch and a millimetre.
    expect(figure(-26.4, INCH)).toBe('-1.0394');
    expect(figure(25.4, INCH)).toBe('1.0000');
  });

  test('carries the digits its kind is worth', () => {
    expect(figure(1500, MM, 'feed')).toBe('1500');
    expect(figure(1524, INCH, 'feed')).toBe('60.0');
  });

  test('a size is written the way the language of the panel writes a number', async () => {
    // Read once, in a sentence: one measured length keeps its digits, a size
    // among others drops its spare zeros — and a reading, unlike either,
    // keeps its point and its width.
    const was = i18next.language;
    await i18next.changeLanguage('pl');
    expect(figure(123.456, MM, 'size')).toBe('123,5');
    expect(figure(-6, MM, 'size')).toBe('-6,0');
    expect(figure(420, MM, 'extent')).toBe('420');
    expect(figure(50, INCH, 'extent')).toBe('1,97');
    expect(figure(-26.4, INCH)).toBe('-1.0394');
    await i18next.changeLanguage('en');
    expect(figure(50, INCH, 'extent')).toBe('1.97');
    await i18next.changeLanguage(was);
  });

  test('is a dash where there is no reading, and never a zero', () => {
    // On an unhomed machine "0.000" and "we have not been told" are very
    // different statements, and only one of them is safe to act on.
    expect(figure(null, MM)).toBe(NO_READING);
    expect(figure(NaN, MM)).toBe(NO_READING);
    expect(figure(undefined, MM)).toBe(NO_READING);
  });

  test('is a dash before the server has said its units — not millimetres by default', () => {
    expect(figure(12.5, null)).toBe(NO_READING);
    expect(lengthLabel(null)).toBe(NO_READING);
  });

  test('names its unit', () => {
    expect(lengthLabel(MM)).toBe('mm');
    expect(feedLabel(MM)).toBe('mm/min');
    expect(lengthLabel(INCH)).toBe('in');
    expect(feedLabel(INCH)).toBe('in/min');
  });
});
