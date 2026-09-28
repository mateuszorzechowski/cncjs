import { useState } from 'react';
import DateRangePicker, { parseLocal } from './DateRangePicker';
import Sheet from './Sheet';
import TextField from './TextField';
import { t } from '../i18n';

const shown = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });

const Caption = ({ children }) => (
  <span className="shrink-0 text-cap font-semibold uppercase tracking-[0.08em] text-mut">{children}</span>
);

/**
 * A window of time to fill in, as one field (review note, 2026-09-28: *"czy
 * można zrobić jedną kontrolkę na range?"*): the panel's own field face, and
 * one calendar behind it in a sheet (`DateRangePicker`) — in place of the
 * browser's `datetime-local`, whose field and calendar were nobody's design
 * here (*"nasze inputy i nasz picker"*, 2026-09-24).
 *
 * **Under a finger, the device's own pickers**, one for each end — a system
 * picker has no range (*"na telefonie użyj wbudowanych pickerów"*,
 * 2026-09-24). Decided by the pointer, not the width. To be swapped for this
 * one if it proves itself (Mateusz, 2026-09-28: *"jeśli kontrolka będzie
 * fajna, to na mobilnych też podmienimy"*).
 *
 * `from` and `to` carry `YYYY-MM-DDTHH:mm`, or `''` for open.
 */
const touch = () => Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

const DateRangeField = ({ label, from, to, onChange }) => {
  const [open, setOpen] = useState(false);

  if (touch()) {
    return (
      <div className="flex flex-col gap-2">
        {[['from', from, t('journal.filter.from')], ['to', to, t('journal.filter.to')]].map(([end, value, name]) => (
          <div key={end} className="flex h-chiph min-w-0 items-center gap-2">
            <Caption>{name}</Caption>
            <TextField
              type="datetime-local"
              label={name}
              value={value}
              onChange={(e) => (end === 'from' ? onChange(e.target.value, to) : onChange(from, e.target.value))}
              className="flex-1"
            />
          </div>
        ))}
      </div>
    );
  }

  const start = parseLocal(from);
  const end = parseLocal(to);
  const text = start || end
    ? `${start ? shown.format(start) : t('picker.none')} – ${end ? shown.format(end) : t('picker.none')}`
    : t('picker.none');

  return (
    // No caption of its own: the row it stands in already says "Czas".
    <div className="flex h-chiph min-w-0 items-center gap-2">
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={[
          'flex h-full min-w-72 flex-1 items-center rounded-ctl border border-line bg-field px-3 text-left font-num text-note',
          'hover:border-acc',
          start || end ? 'text-ink' : 'text-mut',
        ].join(' ')}
      >
        {text}
      </button>
      {/* A portal, so where it is written does not place it. */}
      {open ? (
        <Sheet title={label} onClose={() => setOpen(false)}>
          <DateRangePicker from={from} to={to} onChange={onChange} />
        </Sheet>
      ) : null}
    </div>
  );
};

export default DateRangeField;
