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

/**
 * The server's check, in words. Whole keys, one per code, so every one can
 * be found by a search and the resources test sees each asked for.
 */
const VERDICTS = {
  ok: 'files.check.verdict.ok',
  warnings: 'files.check.verdict.warnings',
  incompatible: 'files.check.verdict.incompatible',
};

const VERDICT_NOTES = {
  ok: 'files.check.note.ok',
  warnings: 'files.check.note.warnings',
  incompatible: 'files.check.note.incompatible',
};

const ISSUES = {
  'unsupported': 'files.check.issue.unsupported',
  'bad-word': 'files.check.issue.badWord',
  'too-long': 'files.check.issue.tooLong',
  'arc': 'files.check.issue.arc',
  'undeclared': 'files.check.issue.undeclared',
  'tool-change': 'files.check.issue.toolChange',
  'mist': 'files.check.issue.mist',
};

/** A verdict as the tile says it, and the tone the tile says it in. */
export const verdictText = (check) => (check ? t(VERDICTS[check.verdict]) : t('files.check.none'));

export const verdictTone = (check) => ({ warnings: 'warn', incompatible: 'bad' }[check?.verdict]);

export const verdictNote = (check) => t(VERDICT_NOTES[check.verdict]);

export const issueText = (issue) => t(ISSUES[issue.code], { word: issue.word });

export const issueWhere = (issue) => (issue.count > 1
  ? t('files.check.where.many', { line: issue.line, count: issue.count })
  : t('files.check.where.one', { line: issue.line }));
