import { DateTimeField } from 'cncjs';
import { useState } from 'react';

export const JournalRange = () => {
  // The journal's own window: Od and Do, each opening the panel's picker in a
  // sheet (under a mouse; under a finger the device's own).
  // Telefon / tablet / PC: same field face on every device; the picker is chosen by pointer, not width — under a finger (phone, tablet) the device's own datetime picker, under a mouse the panel's picker in a Sheet (bottom sheet on a narrow shell, centred dialog on a tablet/PC); on a phone the two fields stack in the journal's Filtry sheet, on a tablet/PC they sit side by side in the journal's filter bar.
  const [from, setFrom] = useState('2026-09-26T08:00');
  const [to, setTo] = useState('2026-09-26T23:59');
  return (
    <div className="flex w-[360px] flex-col gap-2">
      <DateTimeField label="Od" value={from} onChange={setFrom} time={{ hours: 0, minutes: 0 }} />
      <DateTimeField label="Do" value={to} onChange={setTo} time={{ hours: 23, minutes: 59 }} />
    </div>
  );
};

export const Empty = () => {
  // Nothing picked yet: the field says "dowolnie", muted.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return (
    <div className="flex w-[360px] flex-col gap-2">
      <DateTimeField label="Od" value={from} onChange={setFrom} time={{ hours: 0, minutes: 0 }} />
      <DateTimeField label="Do" value={to} onChange={setTo} time={{ hours: 23, minutes: 59 }} />
    </div>
  );
};
