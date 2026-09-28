import { useState } from 'react';
import Button from './Button';
import ClockDial from './ClockDial';
import { t } from '../i18n';

const pad = (n) => String(n).padStart(2, '0');

/** `YYYY-MM-DDTHH:mm`, local time — the same text a `datetime-local` holds. */
export const toLocalText = (date) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
);

export const parseLocal = (text) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text || '');
  return match ? new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]) : null;
};

const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const dayName = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

// Monday first; 2024-01-01 was a Monday.
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => dayName.format(new Date(2024, 0, 1 + i)));

// Where a picked day lands: a window starts at midnight and ends a minute before the next.
const START = { hours: 0, minutes: 0 };
const END = { hours: 23, minutes: 59 };

const dayOf = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const on = (day, time) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.hours, time.minutes);
const timeOf = (date, fallback) => (date ? { hours: date.getHours(), minutes: date.getMinutes() } : fallback);

/**
 * A window of time on one calendar (review note, 2026-09-28: *"czy można
 * zrobić jedną kontrolkę na range?"*): the first day pressed is where it
 * starts, the second where it ends, the days between lit — and a third press
 * starts again. A second day before the first swaps them. Above it, "Dni",
 * "Od" and "Do": the days, or the clock face (`ClockDial`) for either end's
 * hour — one or the other in the same place, as a phone's picker turns from
 * the date to the time, because both at once did not fit a tablet's sheet.
 * Picking the second day turns to its hour.
 *
 * Today is ringed, whatever is chosen (review note: *"zaznaczaj dzisiejszą
 * datę"*) — in the accent it only coloured the digit, and a day picked beside
 * it took the eye first.
 *
 * `from` and `to` carry `YYYY-MM-DDTHH:mm`, or `''` for open;
 * `onChange(from, to)`.
 */
const DateRangePicker = ({ from, to, onChange }) => {
  const start = parseLocal(from);
  const end = parseLocal(to);
  const [shown, setShown] = useState(() => {
    const anchor = start || new Date();
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });
  // What is shown: the days, or the hour of one end.
  const [view, setView] = useState('days');

  const today = dayOf(new Date());
  const lead = (shown.getDay() + 6) % 7;
  const days = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const dateOf = (day) => new Date(shown.getFullYear(), shown.getMonth(), day);
  const same = (a, b) => Boolean(a && b) && a.getTime() === b.getTime();

  const pick = (day) => {
    const date = dateOf(day);
    if (!start || end) {
      onChange(toLocalText(on(date, timeOf(start, START))), '');
      return;
    }
    const first = dayOf(start);
    if (date < first) {
      onChange(toLocalText(on(date, timeOf(start, START))), toLocalText(on(first, END)));
    } else {
      onChange(from, toLocalText(on(date, END)));
    }
    setView('to');
  };

  const turn = (months) => setShown(new Date(shown.getFullYear(), shown.getMonth() + months, 1));

  const edited = view === 'from' ? start : end;
  const setTime = (hours, minutes) => {
    if (!edited) {
      return;
    }
    const next = toLocalText(on(edited, { hours, minutes }));
    if (view === 'from') {
      onChange(next, to);
    } else {
      onChange(from, next);
    }
  };

  const tab = (which, label, disabled = false) => (
    <Button
      tone={view === which ? 'primary' : 'outline'}
      aria-pressed={view === which}
      disabled={disabled}
      className="h-ctl flex-1 font-num"
      onClick={() => setView(which)}
    >
      {label}
    </Button>
  );
  const hourOf = (date) => (date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '–');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {tab('days', t('picker.days'))}
        {tab('from', `${t('journal.filter.from')} ${hourOf(start)}`, !start)}
        {tab('to', `${t('journal.filter.to')} ${hourOf(end)}`, !end)}
      </div>

      {view === 'days' ? (
        <>
      <div className="flex items-center gap-2">
        <Button compact className="h-chiph w-11" aria-label={t('picker.previous')} onClick={() => turn(-1)}>&lsaquo;</Button>
        <span className="flex-1 text-center text-base font-semibold text-ink">{monthName.format(shown)}</span>
        <Button compact className="h-chiph w-11" aria-label={t('picker.next')} onClick={() => turn(1)}>&rsaquo;</Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((name) => (
          <span key={name} className="text-center text-cap font-semibold uppercase tracking-[0.08em] text-mut">{name}</span>
        ))}
        {cells.map((day, index) => {
          if (day === null) {
            // eslint-disable-next-line react/no-array-index-key
            return <span key={`lead-${index}`} />;
          }
          const date = dateOf(day);
          const edge = same(date, start && dayOf(start)) || same(date, end && dayOf(end));
          const between = start && end && date > dayOf(start) && date < dayOf(end);
          return (
            <Button
              key={day}
              compact
              tone={edge ? 'primary' : 'outline'}
              aria-pressed={edge || Boolean(between)}
              aria-current={same(date, today) ? 'date' : undefined}
              className={[
                'h-chiph font-num',
                between ? '!border-acc !bg-accS' : '',
                same(date, today) ? 'ring-2 ring-inset ring-acc' : '',
              ].join(' ')}
              onClick={() => pick(day)}
            >
              {day}
            </Button>
          );
        })}
      </div>

        </>
      ) : null}
      {view !== 'days' && edited ? (
        <ClockDial key={view} hours={edited.getHours()} minutes={edited.getMinutes()} onChange={setTime} />
      ) : null}

      <Button className="h-ctl" disabled={!start && !end} onClick={() => onChange('', '')}>
        {t('picker.clear')}
      </Button>
    </div>
  );
};

export default DateRangePicker;
