import { SettingSummary } from 'cncjs';

export const JogCard = () => (
  // The jog card on a phone: step and speed for each group, folded but still
  // showing the values; tapping opens the sheet to change them.
  // Telefon / tablet / PC: same look on every device; the settings rows (Połączenie, the jog steps and rates in Ustawienia) use it at every width, but the jog card uses it on a phone only, where XY and Z fold into these lines — on a tablet/PC the card shows the axis groups open instead.
  <div className="flex w-[360px] flex-col gap-2">
    <SettingSummary title="XY" values={[{ value: '1', unit: 'mm' }, { value: '1500', unit: 'mm/min' }]} onOpen={() => {}} />
    <SettingSummary title="Z" values={[{ value: '0.1', unit: 'mm' }, { value: '600', unit: 'mm/min' }]} onOpen={() => {}} />
  </div>
);

export const Connection = () => (
  // Inside a settings row, which names it: the value at the left instead.
  <div className="flex w-[360px] flex-col gap-2">
    <SettingSummary label="Wybierz port" values={[{ value: 'COM3' }]} onOpen={() => {}} />
    <SettingSummary label="Typ sterownika" values={[{ value: 'Grbl' }]} onOpen={() => {}} />
    <SettingSummary label="Prędkość transmisji" values={[{ value: '115200', unit: 'bodów' }]} onOpen={() => {}} />
  </div>
);

export const Locked = () => (
  // Locked while the port is open: full contrast in a grey field, the word
  // where the chevron was.
  <div className="flex w-[360px] flex-col gap-2">
    <SettingSummary label="Wybierz port" values={[{ value: 'COM3' }]} locked onOpen={() => {}} />
    <SettingSummary label="Typ sterownika" values={[{ value: 'Grbl' }]} locked onOpen={() => {}} />
    <SettingSummary label="Prędkość transmisji" values={[{ value: '115200', unit: 'bodów' }]} locked onOpen={() => {}} />
  </div>
);

export const Disabled = () => (
  // Disabled — not now: the jog card with no machine connected.
  <div className="flex w-[360px] flex-col gap-2">
    <SettingSummary title="XY" values={[{ value: '1', unit: 'mm' }, { value: '1500', unit: 'mm/min' }]} disabled onOpen={() => {}} />
    <SettingSummary title="Z" values={[{ value: '0.1', unit: 'mm' }, { value: '600', unit: 'mm/min' }]} disabled onOpen={() => {}} />
  </div>
);

export const JogSettings = () => (
  // Several figures in one line: the steps and rates each jog group offers.
  <div className="flex w-side flex-col gap-2">
    <SettingSummary label="Kroki jogu" values={[{ value: 'XY 0.1 · 1 · 10 · 50', unit: 'mm' }, { value: 'Z 0.1 · 1 · 5', unit: 'mm' }]} onOpen={() => {}} />
    <SettingSummary label="Posuwy jogu" values={[{ value: 'XY 1500', unit: 'mm/min' }, { value: 'Z 600', unit: 'mm/min' }]} onOpen={() => {}} />
  </div>
);

export const ControllerGroups = () => (
  // The chevron says what a tap does on this device (settings handoff, 2026-09-28): ⌄ `opens="sheet"` — something comes up over the screen (phone); › `opens="view"` — the next view takes this one's place (tablet); `selected` and no chevron on the others (`opens={null}`) — the choice in a list that stands beside what it chose (PC).
  <div className="flex w-setcol flex-col gap-4">
    <div className="flex flex-col gap-2">
      <SettingSummary title="Osie" values={[{ value: '3500 · 3500 · 600', unit: 'mm/min' }]} opens="sheet" onOpen={() => {}} />
      <SettingSummary title="Bazowanie" values={[{ value: 'Wł.' }, { value: '500', unit: 'mm/min' }]} opens="sheet" onOpen={() => {}} />
    </div>
    <div className="flex flex-col gap-2">
      <SettingSummary title="Osie" values={[{ value: '3500 · 3500 · 600', unit: 'mm/min' }]} opens="view" onOpen={() => {}} />
      <SettingSummary title="Bazowanie" values={[{ value: 'Wł.' }, { value: '500', unit: 'mm/min' }]} opens="view" onOpen={() => {}} />
    </div>
    <div className="flex flex-col gap-2">
      <SettingSummary title="Osie" values={[{ value: '3500 · 3500 · 600', unit: 'mm/min' }]} selected onOpen={() => {}} />
      <SettingSummary title="Bazowanie" values={[{ value: 'Wł.' }, { value: '500', unit: 'mm/min' }]} opens={null} onOpen={() => {}} />
    </div>
  </div>
);
