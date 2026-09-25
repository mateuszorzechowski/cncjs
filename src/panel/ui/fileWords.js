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

/** The part's size, X by Y by Z, from the server's bounds. */
export const areaText = (bounds) => (bounds
  ? t('files.area', { x: bounds.max.x - bounds.min.x, y: bounds.max.y - bounds.min.y, z: bounds.max.z - bounds.min.z })
  : NO_READING);

/** The coordinate systems the file sets itself, or nothing when it takes the active one. */
export const wcsText = (wcs) => (wcs && wcs.length > 0 ? t('files.wcs', { wcs: wcs.join(', ') }) : '');

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

/** Why the controller's check cannot be asked for — `checkBlocker`'s codes. */
const BLOCKERS = {
  notConnected: 'files.check.blocked.notConnected',
  checking: 'files.check.blocked.checking',
  programRunning: 'files.check.blocked.programRunning',
  notIdle: 'files.check.blocked.notIdle',
};

export const blockerText = (blocker) => t(BLOCKERS[blocker]);

export const progressText = ({ answered, total }) => t('files.check.progress', { answered, total });

/**
 * The last `$C`, in the few words its button has room for: the result
 * itself, with the line that matters — the first error, or where it stopped.
 */
export const lastCheckText = (result) => {
  if (!result) {
    return '';
  }
  if (result.refused) {
    return t('files.check.last.refused');
  }
  if (result.errors.length > 0) {
    return t('files.check.last.error', { line: result.errors[0].line });
  }
  if (result.alarm || !result.complete) {
    return t('files.check.last.stopped', { line: result.stoppedAt });
  }
  return t('files.check.last.clean');
};

const AXES = { x: 'axis.x', y: 'axis.y', z: 'axis.z' };

/**
 * Where the program leaves the table at the current zero, and what that does
 * to `$C` — or null when it fits, or when the firmware has no soft limits and
 * so will not stop at the edge. The server's `files:fit`; the words are here.
 */
export const overrunText = (fits, name) => {
  const over = fits?.softLimits ? fits.files?.[name] : null;
  if (!over || over.length === 0) {
    return null;
  }
  const where = over.map(({ axis, by }) => t('files.check.overrun.axis', { axis: t(AXES[axis]), by })).join(', ');
  return t('files.check.overrun.note', { where });
};

/** How the controller's check ended, as a sentence. */
export const controllerSummary = (result) => {
  if (result.refused) {
    return t('files.check.controllerResult.refused', { code: result.refused });
  }
  if (result.alarm) {
    return t('files.check.controllerResult.alarm', { alarm: result.alarm, line: result.stoppedAt });
  }
  if (result.firstError) {
    return t('files.check.controllerResult.firstError', { line: result.stoppedAt });
  }
  if (!result.complete) {
    return t('files.check.controllerResult.reset', { line: result.stoppedAt });
  }
  return t(result.errors.length > 0 ? 'files.check.controllerResult.errors' : 'files.check.controllerResult.clean');
};

export const checkedAtText = (at) => t('files.check.checkedAt', { when: modified.format(new Date(at)) });
