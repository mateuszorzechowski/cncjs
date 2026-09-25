import { durationParts, sizeParts } from '../machine/files';
import { NO_READING } from '../machine/readings';
import { t } from '../i18n';

/**
 * How the Pliki screen says a file's numbers — the parts come from
 * `machine/files`, the words and the number formats from the language.
 */

const modified = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });

// Whole keys, one per unit. And not `unit` for the option's name: i18next
// hands every option to Intl.NumberFormat, and `unit: 'MB'` stops the number
// being formatted at all.
const UNITS = {
  B: 'files.unit.B', kB: 'files.unit.kB', MB: 'files.unit.MB', GB: 'files.unit.GB', TB: 'files.unit.TB',
};

export const sizeText = (bytes) => {
  const { value, unit } = sizeParts(bytes);
  return t('files.size', { amount: value, suffix: t(UNITS[unit]) });
};

export const durationText = (seconds) => {
  if (seconds === null || seconds === undefined) {
    return NO_READING;
  }
  const { hours, minutes, seconds: rest } = durationParts(seconds);
  if (hours > 0) {
    return t('files.duration.hours', { hours, minutes });
  }
  if (minutes > 0) {
    return t('files.duration.minutes', { minutes, seconds: rest });
  }
  return t('files.duration.seconds', { seconds: rest });
};

export const modifiedText = (mtime) => modified.format(new Date(mtime));

/** The part's footprint, X by Y, from the server's bounds. */
export const areaText = (bounds) => (bounds
  ? t('files.area', { x: bounds.max.x - bounds.min.x, y: bounds.max.y - bounds.min.y })
  : NO_READING);

export const toolsText = (tools) => (tools && tools.length > 0 ? tools.map((tool) => `T${tool}`).join(', ') : NO_READING);
