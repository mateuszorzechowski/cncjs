import { DateRangeField } from 'cncjs';
import { useState } from 'react';

export const JournalWindow = () => {
  // The journal's window of time as one field: the panel's field face, and
  // one calendar with a clock face behind it in a sheet (tap the field).
  // Telefon / tablet / PC: the same field and the same calendar on every device (no system pickers); the sheet is a bottom sheet on a phone and a centred dialog on a tablet/PC.
  const [range, setRange] = useState({ from: '2026-09-26T08:00', to: '2026-09-26T23:59' });
  return (
    <div className="w-full max-w-sm">
      <DateRangeField label="Czas" from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
    </div>
  );
};

export const Open = () => {
  // Nothing picked yet: the window is open at both ends.
  const [range, setRange] = useState({ from: '', to: '' });
  return (
    <div className="w-full max-w-sm">
      <DateRangeField label="Czas" from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
    </div>
  );
};
