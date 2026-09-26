import JobButtons from './JobButtons';
import Meter from './Meter';
import { jobError, jobTime } from './jobWords';
import { t } from '../i18n';

/**
 * What the status bar says when no screen has anything better to say.
 *
 * The job: what is loaded, how far through it is, how long is left, and the
 * two buttons that change it. This is the default contributor to the bar
 * rather than a fixed part of it — a screen that fills the slot replaces all
 * of this, because half a job line beside somebody else's facts is two
 * subjects on one strip.
 *
 * Start is the only green on the panel and sits at the opposite end from the
 * stop, which is the whole of the arrangement: the two things that change what
 * the machine is doing are as far apart as the frame allows.
 *
 * Failures are said here too, in red, rather than in a banner above the
 * screen. A banner is a band of height that appears and disappears, and every
 * card on every screen is then laid out against a frame that changes size when
 * something goes wrong — which is the moment an operator can least afford the
 * controls to move.
 */
const JobStatusLine = ({ machine, job, error }) => {
  // A program paused on an error says why at once, in place of its name and
  // progress: the line, Grbl's code and what it means, beside Resume / Abort.
  const stopped = jobError(job);
  const failure = error || stopped;

  return (
    <>
      <span className={`min-w-0 truncate font-num text-base ${failure ? 'text-red' : 'text-mut'}`}>
        {failure || (job ? job.name : t('job.noFile'))}
      </span>

      {/* Only once there is something to be through. A bar at zero beside a file
        * that has not been started is a claim that it has, and stalled. */}
      {job && !failure ? (
        <>
          <span className="shrink-0 font-num text-base text-mut">
            <span className="text-ink">{job.percent}</span>
            {t('job.percentLine')}
            <span className="text-ink">{job.line}</span>
            /{job.total}
          </span>
          <span className="min-w-0 flex-1">
            <Meter percent={job.percent} label={t('job.title')} tone="bg-grn" />
          </span>
          {/* Nothing rather than a dash. A lone `–` on an otherwise empty strip
            * is a reading whose subject nobody can name.
            *
            * One translated sentence rather than a word, a figure and a unit
            * assembled in this order: English puts the number first and the word
            * last, so the order belongs to the language. The cost is the minute
            * count no longer being picked out in ink.
            *
            * A job that has finished says so instead. "0 min left" is true of a
            * program that has just ended and of one that has not begun, and the
            * counters beside it say the same thing — so without this word the
            * strip a second after a run reads exactly like the strip before
            * one. See `readJob`. */}
          <span className="shrink-0 font-num text-base text-mut">
            {jobTime(job)}
          </span>
        </>
      ) : <span className="flex-1" />}

      <JobButtons machine={machine} className="h-9" />
    </>
  );
};

export default JobStatusLine;
