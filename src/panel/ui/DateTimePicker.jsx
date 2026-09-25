import { useState } from 'react';
import Button from './Button';
import Stepper from './Stepper';
import { t } from '../i18n';

const pad = (n) => String(n).padStart(2, '0');

/** `YYYY-MM-DDTHH:mm`, local time — the same text a `datetime-local` holds. */
export const toLocalText = (date) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
);

const parse = (text) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text || '');
  return match ? new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]) : null;
};

const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const dayName = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

// Monday first; 2024-01-01 was a Monday.
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => dayName.format(new Date(2024, 0, 1 + i)));

/**
 * A day and a time, on the panel's own controls.
 *
 * *"Nasze inputy i nasz picker"* (Mateusz, 2026-09-24): the browser's own
 * calendar looked like somebody else's program inside this one, and differs
 * from one phone to the next. This one is the panel's buttons in a grid for
 * the day and its steppers for the hour and minute.
 *
 * `value` and `onChange` carry `YYYY-MM-DDTHH:mm`, or `''` for none.
 * `time` is where a first pick lands in the day — midnight for the start of
 * a window, one minute to for its end.
 */
const DateTimePicker = ({ value, onChange, time = { hours: 0, minutes: 0 } }) => {
  const chosen = parse(value);
  const [shown, setShown] = useState(() => {
    const at = chosen || new Date();
    return new Date(at.getFullYear(), at.getMonth(), 1);
  });

  const today = new Date();
  const lead = (shown.getDay() + 6) % 7;
  const days = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  const same = (a, day) => a && a.getFullYear() === shown.getFullYear() && a.getMonth() === shown.getMonth() && a.getDate() === day;

  const pick = (day) => {
    const hours = chosen ? chosen.getHours() : time.hours;
    const minutes = chosen ? chosen.getMinutes() : time.minutes;
    onChange(toLocalText(new Date(shown.getFullYear(), shown.getMonth(), day, hours, minutes)));
  };

  const setTime = (hours, minutes) => {
    const base = chosen || new Date(today.getFullYear(), today.getMonth(), today.getDate());
    onChange(toLocalText(new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes)));
  };

  const turn = (months) => setShown(new Date(shown.getFullYear(), shown.getMonth() + months, 1));

  const now = () => {
    setShown(new Date(today.getFullYear(), today.getMonth(), 1));
    onChange(toLocalText(new Date()));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button compact className="h-chiph w-11" aria-label={t('picker.previous')} onClick={() => turn(-1)}>&lsaquo;</Button>
        <span className="flex-1 text-center text-base font-semibold text-ink">{monthName.format(shown)}</span>
        <Button compact className="h-chiph w-11" aria-label={t('picker.next')} onClick={() => turn(1)}>&rsaquo;</Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((name) => (
          <span key={name} className="text-center text-cap font-semibold uppercase tracking-[0.08em] text-mut">{name}</span>
        ))}
        {cells.map((day, index) => (day === null
          // eslint-disable-next-line react/no-array-index-key
          ? <span key={`lead-${index}`} />
          : (
            <Button
              key={day}
              compact
              tone={same(chosen, day) ? 'primary' : 'outline'}
              aria-pressed={same(chosen, day)}
              aria-current={same(today, day) ? 'date' : undefined}
              className={`h-chiph font-num ${same(today, day) && !same(chosen, day) ? 'text-acc' : ''}`}
              onClick={() => pick(day)}
            >
              {day}
            </Button>
          )))}
      </div>

      <div className="flex flex-col gap-2">
        <Stepper
          label={t('picker.hour')}
          unit={t('picker.hourUnit')}
          value={chosen ? chosen.getHours() : time.hours}
          fine={1}
          coarse={6}
          min={0}
          max={23}
          onChange={(hours) => setTime(hours, chosen ? chosen.getMinutes() : time.minutes)}
        />
        <Stepper
          label={t('picker.minute')}
          unit={t('picker.minuteUnit')}
          value={chosen ? chosen.getMinutes() : time.minutes}
          fine={1}
          coarse={10}
          min={0}
          max={59}
          onChange={(minutes) => setTime(chosen ? chosen.getHours() : time.hours, minutes)}
        />
      </div>

      <div className="flex gap-2">
        <Button className="h-ctl flex-1" onClick={now}>
          {t('picker.now')}
        </Button>
        <Button className="h-ctl flex-1" disabled={!chosen} onClick={() => onChange('')}>
          {t('picker.clear')}
        </Button>
      </div>
    </div>
  );
};

export default DateTimePicker;
