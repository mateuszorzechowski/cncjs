import { currentLanguage } from '../i18n';

/**
 * A date or a time in the panel's language, not the browser's.
 *
 * Every formatter here was `new Intl.DateTimeFormat(undefined, …)` built when
 * its file loaded: the browser's language, fixed for the life of the page. A
 * panel switched to Polish in Settings went on writing dates the way an
 * English browser does. The language is now read at each call, and a
 * formatter kept per language, so switching needs no reload.
 *
 * `format` only — the one method the panel uses.
 */
export const dateFormat = (options) => {
  const kept = new Map();
  return {
    format: (value) => {
      const language = currentLanguage();
      if (!kept.has(language)) {
        kept.set(language, new Intl.DateTimeFormat(language, options));
      }
      return kept.get(language).format(value);
    },
  };
};

// A moment as the operator reads it: the time alone today, the day with it before.
const today = dateFormat({ timeStyle: 'short' });
const earlier = dateFormat({ dateStyle: 'short', timeStyle: 'short' });
export const when = (at) => {
  const day = new Date(at);
  return day.toDateString() === new Date().toDateString() ? today.format(day) : earlier.format(day);
};

export default dateFormat;
