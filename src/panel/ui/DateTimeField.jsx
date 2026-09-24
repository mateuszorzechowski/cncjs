import { useState } from 'react';
import DateTimePicker from './DateTimePicker';
import Sheet from './Sheet';
import TextField from './TextField';
import { t } from '../i18n';

const shown = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });

const parse = (text) => (text ? new Date(text) : null);

/**
 * A date and time to fill in: the face of the panel's own field, and the
 * panel's own picker behind it in a sheet — in place of the browser's
 * `datetime-local`, whose field and calendar were nobody's design here
 * (*"nasze inputy i nasz picker"*, 2026-09-24).
 *
 * `label` is written before the field in small caps and is the sheet's title.
 *
 * **Under a finger, the device's own picker** — the same field face, with a
 * phone's or a tablet's picker behind it (*"na telefonie użyj wbudowanych
 * pickerów"*, 2026-09-24): made for a thumb, and the one its owner already
 * knows. Decided by the pointer, not the width — *"jeśli to PC wielkości
 * tabletu to nasz picker, jeśli tablet to systemowy"*: a desk's own picker is
 * a small calendar nobody designed for this panel.
 */
const touch = () => Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

const DateTimeField = ({ label, value, onChange, time }) => {
  const [open, setOpen] = useState(false);
  const native = touch();
  const at = parse(value);

  const caption = <span className="shrink-0 text-cap font-semibold uppercase tracking-[0.08em] text-mut">{label}</span>;

  if (native) {
    return (
      <div className="flex h-chiph min-w-0 items-center gap-2">
        {caption}
        <TextField type="datetime-local" label={label} value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex h-chiph min-w-0 items-center gap-2">
      {caption}
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={[
          'flex h-full min-w-44 flex-1 items-center rounded-ctl border border-line bg-field px-3 text-left font-num text-note',
          'hover:border-acc',
          at ? 'text-ink' : 'text-mut',
        ].join(' ')}
      >
        {at ? shown.format(at) : t('picker.none')}
      </button>
      {/* A portal, so where it is written does not place it. */}
      {open ? (
        <Sheet title={label} onClose={() => setOpen(false)}>
          <DateTimePicker value={value} onChange={onChange} time={time} />
        </Sheet>
      ) : null}
    </div>
  );
};

export default DateTimeField;
