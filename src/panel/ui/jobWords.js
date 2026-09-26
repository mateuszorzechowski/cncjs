import { GRBL_ERROR_KEYS } from '../machine/journalWords';
import { t } from '../i18n';

/**
 * The job's two sentences, for the status bar and the job card alike.
 *
 * How long is left comes from the server in seconds (`progress.js`); under a
 * minute it is said in seconds, because "0 min left" is true of a program
 * with 50 seconds to go and of one that has ended.
 */
export const jobTime = (job) => {
  if (job.finished) {
    return t('job.finished');
  }
  return job.remaining < 60
    ? t('job.remainingSeconds', { seconds: job.remaining })
    : t('job.remaining', { minutes: Math.round(job.remaining / 60) });
};

/**
 * What stopped a program paused on an error — "line 624: error:33 — …" —
 * or null. The meaning is Grbl's own table, the journal's words.
 */
export const jobError = (job) => {
  if (!job?.error) {
    return null;
  }
  const { code, line } = job.error;
  const key = GRBL_ERROR_KEYS[code];
  return key
    ? t('job.errorAt', { line, code, meaning: t(key) })
    : t('job.errorAtBare', { line, code });
};
