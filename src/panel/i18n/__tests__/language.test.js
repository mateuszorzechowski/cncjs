import i18next, { LANGUAGES, chooseLanguage, currentLanguage, t } from '..';

describe('the language chosen in Settings', () => {
  const was = i18next.language;
  let stored;

  beforeEach(() => {
    stored = {};
    global.window = { localStorage: { setItem: (key, value) => { stored[key] = value; } } };
  });

  afterEach(async () => {
    delete global.window;
    await i18next.changeLanguage(was);
  });

  test('is offered as Polish and English', () => {
    expect(LANGUAGES).toEqual(['pl', 'en']);
  });

  test('changes what the panel says, and is kept on this device', async () => {
    await chooseLanguage('en');
    expect(currentLanguage()).toBe('en');
    expect(t('nav.settings')).toBe('Settings');
    expect(stored['panel.language']).toBe('en');

    await chooseLanguage('pl');
    expect(t('nav.settings')).toBe('Ustawienia');
    expect(stored['panel.language']).toBe('pl');
  });

  test('still changes when the device will not keep it', async () => {
    // A private window: storage throws, and the choice lasts the page.
    global.window = { localStorage: { setItem: () => { throw new Error('denied'); } } };
    await chooseLanguage('en');
    expect(currentLanguage()).toBe('en');
  });

  test('names each language in itself, whatever the panel is in', async () => {
    await chooseLanguage('en');
    expect([t('language.pl'), t('language.en')]).toEqual(['Polski', 'English']);
    await chooseLanguage('pl');
    expect([t('language.pl'), t('language.en')]).toEqual(['Polski', 'English']);
  });
});
