import DateTimeField from './DateTimeField';
import SegmentedChoice from './SegmentedChoice';
import TextField from './TextField';
import { LEVELS } from '../machine/journal';
import { LEVEL_KEYS, SOURCE_KEYS } from '../machine/journalWords';
import { RANGES } from '../machine/useJournalFilters';
import { t } from '../i18n';

const rank = (level) => LEVELS.indexOf(level);

const SOURCES = ['server', 'controller'];

const CHOICES = [...RANGES, 'custom'];

const CUSTOM = ['custom'];

// Where a first pick lands in the day: a window starts at midnight and ends
// a minute before the next.
const START_OF_DAY = { hours: 0, minutes: 0 };
const END_OF_DAY = { hours: 23, minutes: 59 };

const RANGE_KEYS = {
  m15: 'journal.range.m15',
  h1: 'journal.range.h1',
  today: 'journal.range.today',
  all: 'journal.range.all',
  custom: 'journal.range.custom',
};

const Caption = ({ children }) => (
  <span className="shrink-0 text-cap font-semibold uppercase tracking-[0.08em] text-mut">{children}</span>
);

/**
 * The journal's filters, laid out for where they are.
 *
 * From the drawings of 2026-09-24, three sizes of one bar:
 *
 * - the bar on a tablet: levels, sources and the search on one line, the time
 *   window and the count on the next;
 * - the bar on a desk (`@7xl`): the search first and everything on one line;
 * - `sheet` on a phone: the same choices as tiles, in the sheet the phone's
 *   own Filtry button opens.
 *
 * `filters` is `useJournalFilters`; `counts` is the server's per-level tally,
 * and `matched` of `kept` is what the whole filter lets through.
 */
const JournalFilters = ({ filters, counts, matched, kept, sheet = false }) => {
  const levels = {
    label: t('journal.filter.level'),
    options: LEVELS,
    counts: counts || undefined,
    isOn: (id) => rank(id) >= rank(filters.level),
    onChange: filters.setLevel,
    format: (id) => t(LEVEL_KEYS[id]),
  };
  const sources = {
    label: t('journal.filter.source'),
    options: SOURCES,
    isOn: (id) => filters.sources[id],
    onChange: filters.toggleSource,
    format: (id) => t(SOURCE_KEYS[id]),
  };
  const ranges = {
    label: t('journal.filter.time'),
    value: filters.range,
    onChange: filters.chooseRange,
    format: (id) => t(RANGE_KEYS[id]),
  };

  const custom = filters.range === 'custom'
    ? (
      <div className={sheet ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-x-4 gap-y-2'}>
        <DateTimeField native={sheet} label={t('journal.filter.from')} value={filters.from} onChange={filters.setFrom} time={START_OF_DAY} />
        <DateTimeField native={sheet} label={t('journal.filter.to')} value={filters.to} onChange={filters.setTo} time={END_OF_DAY} />
      </div>
    )
    : null;

  if (sheet) {
    return (
      <div className="flex flex-col gap-3">
        <Caption>{t('journal.filter.level')}</Caption>
        <SegmentedChoice columns={2} {...levels} />
        <Caption>{t('journal.filter.source')}</Caption>
        <SegmentedChoice columns={2} {...sources} />
        <Caption>{t('journal.filter.time')}</Caption>
        <SegmentedChoice columns={4} {...ranges} options={RANGES} />
        <SegmentedChoice columns={1} {...ranges} options={CUSTOM} />
        {custom}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <SegmentedChoice compact joined {...levels} />
      <SegmentedChoice compact joined {...sources} />
      <TextField
        type="search"
        label={t('journal.filter.search')}
        placeholder={t('journal.filter.search')}
        value={filters.q}
        onChange={(e) => filters.setQ(e.target.value)}
        className="min-w-48 flex-1 @7xl/shell:order-first @7xl/shell:w-96 @7xl/shell:flex-none"
      />
      {/* A tablet breaks the line here; a desk draws a rule instead. */}
      <span className="h-0 basis-full @7xl/shell:hidden" />
      <span className="hidden h-6 w-px bg-line @7xl/shell:block" />
      <span className="@7xl/shell:hidden"><Caption>{t('journal.filter.time')}</Caption></span>
      <SegmentedChoice compact {...ranges} options={CHOICES} />
      {custom}
      <span className="ml-auto shrink-0 font-num text-note text-mut">
        {t('journal.count', { matched, kept })}
      </span>
    </div>
  );
};

export default JournalFilters;
