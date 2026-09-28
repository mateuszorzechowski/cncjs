import { TextField } from 'cncjs';
import { useState } from 'react';

export const Search = () => {
  // The journal's search, the panel's first field to type into.
  // Telefon / tablet / PC: same look on every device; the journal's search sits on its own line beside a Filtry button on a phone and inside the filter bar on a tablet/PC, and every other use (settings, jog steps sheet, device name) is the same at every width.
  const [q, setQ] = useState('');
  return (
    <div className="flex w-[360px]">
      <TextField type="search" label="Szukaj w dzienniku" placeholder="Szukaj w dzienniku" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
    </div>
  );
};

export const Figures = () => (
  // Figures with their units inside the frame, digits under digits.
  <div className="flex w-[360px] flex-col gap-2">
    <TextField label="Kroki silnika X" inputMode="decimal" unit="kroków/mm" defaultValue="800.000" />
    <TextField label="Maks. prędkość X" inputMode="decimal" unit="mm/min" defaultValue="3000.000" />
    <TextField label="Przyspieszenie X" inputMode="decimal" unit="mm/s²" defaultValue="250.000" />
  </div>
);

export const States = () => (
  // Not saved yet: amber with what it replaces struck through; red when the
  // controller would refuse it; an untouched one below for comparison.
  <div className="flex w-[360px] flex-col gap-2">
    <TextField label="Odjazd od krańcówki" inputMode="decimal" unit="mm" defaultValue="2" was="1.000" state="changed" />
    <TextField label="Posuw szukania" inputMode="decimal" unit="mm/min" defaultValue="-500" was="500.000" state="bad" />
    <TextField label="Posuw dokładny" inputMode="decimal" unit="mm/min" defaultValue="25.000" />
  </div>
);

export const DeviceName = () => {
  // Plain text: how this device is named in the journal, the detected name
  // as its placeholder.
  const [name, setName] = useState('');
  return (
    <div className="flex w-[360px]">
      <TextField label="Nazwa tego urządzenia" placeholder="Tablet w warsztacie" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
    </div>
  );
};
