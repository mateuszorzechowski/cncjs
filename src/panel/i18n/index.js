import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en/panel.json';
import pl from './pl/panel.json';

/**
 * The panel's own translations, separate from the old application's.
 *
 * `src/app` keys its resources by the sha1 of the English source text and has
 * `i18next-scanner` regenerate them on every build. That model is why nobody
 * can read a diff of `resource.json`, and it needs i18next running before any
 * module that names a string — which the panel's Jest tier, with no DOM and
 * only `.js` transformed, does not have. Here the keys are written by hand and
 * mean something, the resources are edited by hand, and no build step rewrites
 * them.
 *
 * Being its own module is also what keeps rule 6 intact: the panel still takes
 * exactly one thing from `src/app`, and that is the controller client.
 *
 * English is the source language and the fallback; Polish is a translation of
 * it. A missing Polish key therefore shows English rather than a key name.
 */
// Where this device keeps the language chosen in Settings.
const CHOICE_KEY = 'panel.language';

i18next
  .use(LanguageDetector)
  .init({
    fallbackLng: 'en',
    // 'pl-PL' from a browser has to find the 'pl' resources.
    load: 'languageOnly',
    supportedLngs: ['en', 'pl'],
    resources: {
      en: { panel: en },
      pl: { panel: pl },
    },
    ns: ['panel'],
    defaultNS: 'panel',
    detection: {
      // The querystring first so `/panel/?lng=en` can be pointed at a
      // language without touching the browser's own setting — which is how
      // the end-to-end tier checks that this is a translation and not a file
      // of constants. No caches: a language picked once for a test would
      // otherwise persist into the next session in localStorage, and the
      // panel would be answering a question nobody asked again.
      //
      // Then what the operator chose in Settings, which is written down only
      // when chosen (`chooseLanguage`), never by detection — and only then
      // the browser's own language.
      order: ['querystring', 'localStorage', 'navigator'],
      lookupLocalStorage: CHOICE_KEY,
      caches: [],
    },
    interpolation: {
      // React escapes what it renders; doing it twice turns `−` into `&#45;`.
      escapeValue: false,
    },
    // i18next 25 prints an advertisement for its authors' hosted product to
    // the console on every init. The console of a machine controller is where
    // somebody looks when a job has gone wrong.
    showSupportNotice: false,
  });

/**
 * Every displayed string in the panel comes through here.
 *
 * A thin wrapper rather than `i18next.t` directly, so that the import in every
 * component names the panel's i18n rather than the library, and so the JSX
 * reads `t('jog.home')` instead of a call through a default export.
 */
export const t = (key, options) => i18next.t(key, options);

/** The languages the panel speaks, in the order Settings offers them. */
export const LANGUAGES = ['pl', 'en'];

/** The language in force, as one of `LANGUAGES`. */
export const currentLanguage = () => i18next.resolvedLanguage || i18next.language;

/**
 * This device's choice, kept for the next time the panel opens.
 *
 * The device's and not the server's: a phone in the workshop and a laptop in
 * the house may be held by different people. Storage can refuse — a private
 * window — and then the choice lasts as long as the page, which is still the
 * choice made.
 */
export const chooseLanguage = (language) => {
  try {
    window.localStorage.setItem(CHOICE_KEY, language);
  } catch (e) {
    // Kept for this page only.
  }
  return i18next.changeLanguage(language);
};

export default i18next;
