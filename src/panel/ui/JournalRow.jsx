import { EVENT_KEYS, LEVEL_KEYS, SOURCE_KEYS, describeEntry } from '../machine/journalWords';
import { rowTitle, settingValueText } from '../machine/machineSettings';
import { issueText } from './fileWords';
import { probeDetails, probeLine } from './probeJournal';
import { useUnits } from './units';
import { t } from '../i18n';
import { dateFormat } from './dates';

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
const clock = dateFormat({
  hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hour12: false,
});
const day = dateFormat({ dateStyle: 'medium', timeStyle: 'medium' });

const said = (entry) => {
  const words = describeEntry(entry);
  return words.key ? t(words.key, words.params) : words.text;
};

/*
 * A change to one of Grbl's `$` settings, in the settings screen's words —
 * what it is and what it went from and to — with the controller's own text
 * in the details (review notes, 2026-09-28). Only for a setting this machine
 * has; for any other the line stays the code and the figures.
 */
const settingLine = (entry, rows, rule) => {
  const row = entry.event === 'setting' && rows?.find(({ name }) => name === entry.code);
  if (!row) {
    return null;
  }
  return t('journal.setting.described', {
    title: rowTitle(row),
    from: settingValueText(row, entry.data?.from, rule),
    to: settingValueText(row, entry.data?.to, rule),
  });
};

// `prose` for a sentence — a meaning, a finding — which reads in the text
// face and breaks between words; everything else is a value.
const Detail = ({ label, value, prose = false }) => (
  <div className="flex gap-3">
    <dt className="w-28 shrink-0 text-mut">{label}</dt>
    <dd className={`m-0 min-w-0 text-ink ${prose ? '' : 'break-all font-num'}`}>{value}</dd>
  </div>
);

/*
 * What the server's own check sees in the refused line, in the file card's
 * words — and for an arc, by how much: the start's and the end's distance
 * from the centre, which Grbl allows to differ by 0.005 mm.
 */
const foundText = (finding, units) => {
  const said = issueText(finding);
  const { radius, reach } = finding.detail || {};
  if (finding.code !== 'arc' || !Number.isFinite(radius) || !Number.isFinite(reach)) {
    return said;
  }
  return t('journal.detail.arcBy', {
    said,
    radius: units.figure(radius, 'size'),
    reach: units.figure(reach, 'size'),
    unit: units.length,
  });
};

// A controller's refusal or alarm: the code on its own line, and its meaning.
const REFUSALS = new Set(['error', 'alarm']);

/**
 * One entry: a line of columns, and its fields underneath when opened.
 *
 * Columns rather than a sentence, as asked — *"wpis w dzienniku ma miec
 * strukture a nie sciane tekstu"* (2026-09-24). The line is a button so the
 * whole of it is the target, and it says whether it is open.
 */
/*
 * `device` is what the server knows of the entry's device (`services/devices`):
 * its name on the row, and its address, system and browser in the details —
 * who did it, without an id (Mateusz, 2026-09-26). An id the server has no
 * name for — a script, an entry older than the names — is shown as it is.
 */
const JournalRow = ({ entry, device, settings, open, onToggle }) => {
  const units = useUnits();
  const data = Object.entries(entry.data || {}).filter(([key]) => DETAILS[key]);
  const found = entry.data?.found || [];
  const refusal = REFUSALS.has(entry.event) && entry.code;

  return (
    <li className="@container/row border-b border-line last:border-b-0">
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
        <span className="min-w-0 flex-1 basis-60 text-ink">{settingLine(entry, settings, units.rule) ?? probeLine(entry, units) ?? said(entry)}</span>
        {/*
          * Only where the whole line has room for it; on a narrower list it
          * fell to a line of its own, and the details below already name the
          * device (review note, 2026-09-28: *"jak się nie mieści, widoczne
          * tylko w podglądzie"*).
          */}
        {device?.name ? <span className="hidden shrink-0 truncate text-mut @[60rem]/row:inline">{device.name}</span> : null}
      </button>

      {open ? (
        <dl className="m-0 flex flex-col gap-1 pb-3 text-note">
          <Detail label={t('journal.detail.time')} value={day.format(new Date(entry.time))} />
          {entry.event === 'setting' ? (
            <Detail
              label={t('journal.detail.controller')}
              value={`${entry.code}=${entry.data?.from ?? ''} → ${entry.code}=${entry.data?.to ?? ''}`}
            />
          ) : null}
          {entry.port ? <Detail label={t('journal.detail.port')} value={entry.port} /> : null}
          {entry.device ? <Detail label={t('journal.detail.device')} value={device?.name || entry.device} /> : null}
          {device?.ip ? <Detail label={t('journal.detail.address')} value={device.ip} /> : null}
          {device?.system ? <Detail label={t('journal.detail.system')} value={[device.system, device.model].filter(Boolean).join(' · ')} /> : null}
          {device?.browser ? <Detail label={t('journal.detail.browser')} value={device.browser} /> : null}
          {entry.program?.name ? <Detail label={t('journal.detail.program')} value={entry.program.name} /> : null}
          {entry.program?.line ? (
            <Detail
              label={t('journal.detail.programLine')}
              value={entry.program.total ? t('journal.detail.lineOf', entry.program) : entry.program.line}
            />
          ) : null}
          {refusal ? <Detail label={t('journal.detail.code')} value={entry.code} /> : null}
          {refusal ? <Detail label={t('journal.detail.meaning')} value={said(entry)} prose /> : null}
          {data.map(([key, value]) => <Detail key={key} label={t(DETAILS[key])} value={String(value)} />)}
          {probeDetails(entry, units).map(([label, value]) => <Detail key={label} label={label} value={value} />)}
          {found.map((finding, index) => (
            <Detail
              key={`${finding.code} ${finding.word}`}
              label={index === 0 ? t('journal.detail.found') : ''}
              value={foundText(finding, units)}
              prose
            />
          ))}
          <Detail label={t('journal.detail.id')} value={entry.id} />
        </dl>
      ) : null}
    </li>
  );
};

export default JournalRow;
