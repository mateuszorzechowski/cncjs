import { Button } from 'cncjs';

export const Tones = () => (
  // The panel's one button, in the tones it uses: outline for the ordinary
  // action, primary for the one the screen is for, go/hold/stop for the job's
  // own start, pause and stop, end for disconnecting.
  // Telefon / tablet / PC: same look on every device; its height is always the caller's class, so the top bar's STOP is chip-high (h-chiph) on a phone and button-high (h-btnh) on a tablet/PC, and Start/Pause sit in the job card on a phone (h-chiph) but in the bottom status bar (h-9) on a tablet/PC.
  <div className="flex flex-wrap gap-2">
    <Button className="h-ctl">Anuluj</Button>
    <Button tone="primary" className="h-ctl">Zapisz w sterowniku</Button>
    <Button tone="soft" className="h-ctl">Odśwież porty</Button>
    <Button tone="end" className="h-ctl">Rozłącz</Button>
  </div>
);

export const JobControls = () => (
  <div className="flex w-full gap-2">
    <Button tone="go" className="h-ctl flex-1 tracking-[0.12em]">Start zadania</Button>
    <Button tone="hold" className="h-ctl flex-1">Pauza</Button>
    <Button tone="stop" className="h-ctl flex-1">Stop</Button>
  </div>
);

export const Disabled = () => (
  <div className="flex gap-2">
    <Button tone="primary" disabled className="h-ctl">Wczytaj</Button>
    <Button disabled className="h-ctl">Sprawdź na sterowniku</Button>
  </div>
);

export const PairInSheet = () => (
  // Equal halves of a sheet's foot, as every confirmation lays them out.
  <div className="flex w-full max-w-sm gap-2">
    <Button className="h-ctl flex-1">Anuluj</Button>
    <Button tone="stop" className="h-ctl flex-1">Zatrzymaj</Button>
  </div>
);
