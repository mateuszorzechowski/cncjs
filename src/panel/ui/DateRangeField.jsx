import { useState } from 'react';
import DateRangePicker, { parseLocal } from './DateRangePicker';
import Sheet from './Sheet';
import { t } from '../i18n';

const shown = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });

/**
 * A window of time to fill in, as one field (review note, 2026-09-28: *"czy
 * można zrobić jedną kontrolkę na range?"*): the panel's own field face, and
 * one calendar behind it in a sheet (`DateRangePicker`) — in place of the
 * browser's `datetime-local`, whose field and calendar were nobody's design
 * here (*"nasze inputy i nasz picker"*, 2026-09-24).
 *
 * The same on a phone and a tablet (Mateusz, 2026-09-28: *"dodaj też
 * kalendarz na telefon i tablet"*), in place of the device's own pickers one
 * for each end, which a window of time had to be split into — a system
 * picker has no range.
 *
 * `from` and `to` carry `YYYY-MM-DDTHH:mm`, or `''` for open.
 */
const DateRangeField = ({ label, from, to, onChange }) => {
  const [open, setOpen] = useState(false);

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
