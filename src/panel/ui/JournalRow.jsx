import { EVENT_KEYS, LEVEL_KEYS, SOURCE_KEYS, describeEntry } from '../machine/journalWords';
import { t } from '../i18n';

/** Error red, warning amber, info ink, debug quiet — the panel's own tones. */
const TONE = {
  error: 'text-red',
  warn: 'text-amb',
  info: 'text-ink',
  debug: 'text-mut',
};

// What the entry's own fields are called when it is opened. Anything else in
// `data` is left out rather than shown under an English field name.
const DETAILS = {
  sent: 'journal.detail.sent',
  line: 'journal.detail.line',
  text: 'journal.detail.text',
  cmd: 'journal.detail.cmd',
  controllerType: 'journal.detail.controller',
  baudrate: 'journal.detail.baudrate',
  message: 'journal.detail.message',
  name: 'journal.detail.name',
};

// The time of day only: the day is the heading above its entries
// (`JournalDay`), as in the drawing of 2026-09-24.
const clock = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hour12: false,
});
const day = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' });

const said = (entry) => {
  const words = describeEntry(entry);
  return words.key ? t(words.key, words.params) : words.text;
};

const Detail = ({ label, value }) => (
  <div className="flex gap-3">
    <dt className="w-28 shrink-0 text-mut">{label}</dt>
    <dd className="m-0 min-w-0 break-all font-num text-ink">{value}</dd>
  </div>
);

/**
 * One entry: a line of columns, and its fields underneath when opened.
 *
 * Columns rather than a sentence, as asked — *"wpis w dzienniku ma miec
 * strukture a nie sciane tekstu"* (2026-09-24). The line is a button so the
 * whole of it is the target, and it says whether it is open.
 */
const JournalRow = ({ entry, open, onToggle }) => {
  const data = Object.entries(entry.data || {}).filter(([key]) => DETAILS[key]);

  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-left text-note"
      >
        <span className="shrink-0 font-num tabular-nums text-mut">{clock.format(new Date(entry.time))}</span>
        <span className={`w-16 shrink-0 font-semibold uppercase tracking-[0.06em] ${TONE[entry.level] || TONE.info}`}>
          {t(LEVEL_KEYS[entry.level] || LEVEL_KEYS.info)}
        </span>
        <span className="w-20 shrink-0 text-mut">{t(SOURCE_KEYS[entry.source] || SOURCE_KEYS.server)}</span>
        {/* The code beside what happened, and the message after both in a
          * column of its own, so every message starts at the same place —
          * *"osobna kolumna oprocz wiadomosci"* (2026-09-24). */}
        <span className="w-48 shrink-0 truncate">
          <span className="font-semibold text-ink">
            {EVENT_KEYS[entry.event] ? t(EVENT_KEYS[entry.event]) : entry.event}
          </span>
          {entry.code ? <span className="ml-1.5 font-num text-cap text-mut">{entry.code}</span> : null}
        </span>
        <span className="min-w-0 flex-1 basis-60 text-ink">{said(entry)}</span>
      </button>

      {open ? (
        <dl className="m-0 flex flex-col gap-1 pb-3 text-note">
          <Detail label={t('journal.detail.time')} value={day.format(new Date(entry.time))} />
          {entry.port ? <Detail label={t('journal.detail.port')} value={entry.port} /> : null}
          {entry.device ? <Detail label={t('journal.detail.device')} value={entry.device} /> : null}
          {entry.program?.name ? <Detail label={t('journal.detail.program')} value={entry.program.name} /> : null}
          {entry.program?.line ? (
            <Detail
              label={t('journal.detail.programLine')}
              value={entry.program.total ? t('journal.detail.lineOf', entry.program) : entry.program.line}
            />
          ) : null}
          {data.map(([key, value]) => <Detail key={key} label={t(DETAILS[key])} value={String(value)} />)}
          <Detail label={t('journal.detail.id')} value={entry.id} />
        </dl>
      ) : null}
    </li>
  );
};

export default JournalRow;
