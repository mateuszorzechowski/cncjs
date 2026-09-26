import Card from '../ui/Card';
import JobButtons from '../ui/JobButtons';
import { useIsPhone } from '../ui/shell';
import Meter from '../ui/Meter';
import { NO_READING } from '../machine/readings';
import { useUnits } from '../ui/units';
import { jobError, jobTime } from '../ui/jobWords';
import { t } from '../i18n';

const reading = (value) => (value === null || value === undefined ? NO_READING : value);

/**
 * How far through the job the machine is.
 *
 * Driven by the line the server says is being cut, not by lines received or
 * sent: both run ahead of the tool while Grbl's planner drains — sixteen lines
 * and more — and a bar driven by them reaches the end with the job still
 * cutting. See `progress.js` on the server.
 *
 * With nothing loaded it says so in words. The bar below still sits at zero,
 * which the status bar avoids by drawing nothing at all — a difference worth
 * closing when this card stops being temporary.
 *
 * A finished job reads as finished rather than as one that has not begun. The
 * sender is rewound when a program ends, so its counters afterwards are the
 * counters of a program nobody has started; the decision comes off
 * `finishTime` instead. See `readJob` in `machine/readings`.
 *
 * Start and Pause are the status bar's two, for a phone that has no status
 * bar — the same component; see `ui/JobButtons`.
 *
 * This card yields height to the readout beside it. The dashboard's right
 * column is full at 768 and something has to; the position is what the
 * screen is for, and a percentage that reads `0` for most of a job does not
 * need the size of a coordinate.
 */
const JobWidget = ({ machine, label = t('job.title'), className = '' }) => {
  const phone = useIsPhone();
  const units = useUnits();
  const { job, tool } = machine;
  // On a phone this card is where a program paused on an error says why.
  const stopped = jobError(job);

  return (
    <Card label={label} className={`@container min-h-0 ${className}`} bodyClassName="justify-between gap-2">
      {/* Assembled the way the status bar assembles it, out of the same key
        * and the two figures. It used to hand `job.line` a received and a
        * total, and that key carried the word "line" as well as the numbers —
        * so beside the prefix it came out as "% · line line 0/31". The other
        * branch was worse: with nothing loaded the card read "0 % · line no
        * job", a prefix welded to a sentence that does not take one. */}
      <div className="flex items-baseline gap-2">
        {job ? (
          <span className="font-num text-head font-medium tabular-nums text-ink">{job.percent}</span>
        ) : null}
        {stopped ? (
          <span className="min-w-0 font-num text-note text-red">{stopped}</span>
        ) : (
          <span className="min-w-0 truncate font-num text-note text-mut">
            {job ? t('job.percentLine') : t('job.none')}
            {job ? `${job.line}/${job.total}` : null}
          </span>
        )}
      </div>

      <Meter percent={job ? job.percent : 0} label={label} tone="bg-grn" />

      {/* Two columns wherever they fit. In one column these four facts are
        * four lines, and the 34px that costs comes straight out of the
        * readout above — which is the reading the screen is for. */}
      <div className="grid shrink-0 grid-cols-1 gap-x-gap gap-y-1 font-num text-note text-mut @xs:grid-cols-2">
        <span className="truncate">{t('job.feed')} {units.figure(tool.feedrate, 'feed')} {units.feed}</span>
        <span className="truncate">{t('job.spindle')} {reading(tool.spindle)} {t('units.rpm')}</span>
        <span className="truncate">{t('job.file')} {job ? job.name : NO_READING}</span>
        {/* What is left, until there is nothing left — at which point the
          * same cell says so, because "0 min" is equally true before a run
          * and after one. See `readJob`. */}
        <span className="truncate">
          {job ? jobTime(job) : NO_READING}
        </span>
      </div>

      {/* Only where there is no status bar to carry them. At the panel the
        * job lives along the bottom, and two Starts on one screen is one
        * too many. */}
      {phone ? (
        <div className="flex gap-3">
          <JobButtons machine={machine} className="h-chiph min-w-0" grow />
        </div>
      ) : null}
    </Card>
  );
};

export default JobWidget;
