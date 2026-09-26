import { Sheet, PanelRoot, Stepper, Button, DeviceFrame } from 'cncjs';
import { useState } from 'react';

// Telefon / tablet / PC: a sheet from the bottom edge on a phone (dragged down it closes), a centred 520px dialog from 48rem; at most 85% of the shell's height, the contents scroll under a fixed header.
// A sheet is fixed inside the panel's shell and takes at most 85% of its
// height, so it gets its own shell: 32rem, a class the panel ships.

// `onHelp` puts a `?` beside Done — the machine state sheet, in alarm.
const Layer = ({ label, value, ok, tone = 'text-ink' }) => (
  <div className="flex items-baseline gap-3">
    <span className="w-20 shrink-0 text-cap uppercase tracking-[0.08em] text-mut">{label}</span>
    <span className={`min-w-0 flex-1 truncate font-num text-note ${tone}`}>{value}</span>
    <span className={`w-3 shrink-0 text-note ${ok ? 'text-grn' : 'text-mut'}`}>{ok === undefined ? '' : (ok ? '✓' : '✗')}</span>
  </div>
);

export const ZeroHelp = () => (
  // The zeroing screen's `?`: an explanation behind a question mark.
  <PanelRoot className="h-[32rem]">
    <Sheet title="Zerowanie" onClose={() => {}}>
      <p className="m-0 text-base text-ink">Zero robocze to punkt, od którego liczy się program. Zerowanie ustawia je tam, gdzie stoi narzędzie — zwykle po dojechaniu na róg materiału.</p>
      <p className="m-0 text-base text-ink">Maszyna przy tym nie jedzie. Zmienia się tylko odczyt roboczy; pozycja maszynowa zostaje ta sama.</p>
      <p className="m-0 text-base text-ink">Panel wysyła G10 L20 P&lt;n&gt;, gdzie &lt;n&gt; to numer czynnego układu: G54 to 1, G59 to 6. Panel nie zgaduje tego numeru — wyzerowanie nie tego układu nie daje żadnego znaku, a wychodzi dopiero wtedy, gdy narzędzie pojedzie w złe miejsce pod napięciem.</p>
      <p className="m-0 text-base text-ink">Przyciski bywają wygaszone z dwóch powodów: sterownik nie podał układu współrzędnych albo maszyna jest w alarmie — w alarmie serwer odrzuca każdą linię G-code, zanim trafi na kabel.</p>
    </Sheet>
  </PanelRoot>
);

export const JogRates = () => {
  // A decision taken and finished: the jog feeds, with Save in its foot.
  const [xy, setXy] = useState(1500);
  const [z, setZ] = useState(300);
  return (
    <PanelRoot className="h-[32rem]">
      <Sheet title="Posuwy jogu" onClose={() => {}}>
        <p className="m-0 text-note text-mut">Na karcie jogu dalej można go zmienić; tu jest punkt startu.</p>
        <div className="flex flex-col gap-2">
          <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">XY</span>
          <Stepper value={xy} onChange={setXy} fine={100} coarse={1000} min={100} max={5000} label="Posuw jogu XY" unit="mm/min" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">Z</span>
          <Stepper value={z} onChange={setZ} fine={50} coarse={500} min={50} max={1500} label="Posuw jogu Z" unit="mm/min" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button tone="primary" className="h-ctl flex-1">Zapisz</Button>
          <Button className="h-ctl flex-1">Przywróć domyślne</Button>
        </div>
      </Sheet>
    </PanelRoot>
  );
};

export const WithHelp = () => (
  <PanelRoot className="h-[32rem]">
    <Sheet title="Stan maszyny" onHelp={() => {}} onClose={() => {}}>
      <div className="flex min-w-0 flex-col gap-1 border-b border-line py-3">
        <span className="text-lead font-semibold text-red">Alarm</span>
        <span className="text-note text-mut">Zbazuj maszynę albo ją odblokuj, zanim cokolwiek ruszy. Do tego czasu serwer nie wysyła niczego.</span>
      </div>
      <div className="flex flex-col gap-2 border-b border-line pb-3">
        <Layer label="Serwer" value="cnc.lan:8000" ok />
        <Layer label="Port" value="COM3  Grbl  115200" ok />
        <Layer label="Maszyna" value="Alarm" tone="text-red" />
        <Button tone="end" className="mt-1 h-ctl w-full">Rozłącz</Button>
      </div>
    </Sheet>
  </PanelRoot>
);

export const Phone = () => (
  // Telefon (shell < 48rem): full width, pinned to the bottom edge, rounded top
  // corners and a top border only, over a dimmed screen. Title, a rule and
  // Gotowe in the header; at most 85% of the shell's height.
  <DeviceFrame device="phone" height={560}>
    <Sheet title="Zerowanie" onClose={() => {}}>
      <p className="m-0 text-base text-ink">Zero robocze to punkt, od którego liczy się program. Zerowanie ustawia je tam, gdzie stoi narzędzie — zwykle po dojechaniu na róg materiału.</p>
      <p className="m-0 text-base text-ink">Maszyna przy tym nie jedzie. Zmienia się tylko odczyt roboczy; pozycja maszynowa zostaje ta sama.</p>
      <p className="m-0 text-base text-ink">Panel wysyła G10 L20 P&lt;n&gt;, gdzie &lt;n&gt; to numer czynnego układu: G54 to 1, G59 to 6.</p>
    </Sheet>
  </DeviceFrame>
);

export const Tablet = () => (
  // Tablet (from 48rem): a dialog centred in the shell, 520px wide (`w-dialog`),
  // all corners rounded and a full border; the same header and contents.
  <DeviceFrame device="tablet" height={768}>
    <Sheet title="Zerowanie" onClose={() => {}}>
      <p className="m-0 text-base text-ink">Zero robocze to punkt, od którego liczy się program. Zerowanie ustawia je tam, gdzie stoi narzędzie — zwykle po dojechaniu na róg materiału.</p>
      <p className="m-0 text-base text-ink">Maszyna przy tym nie jedzie. Zmienia się tylko odczyt roboczy; pozycja maszynowa zostaje ta sama.</p>
      <p className="m-0 text-base text-ink">Panel wysyła G10 L20 P&lt;n&gt;, gdzie &lt;n&gt; to numer czynnego układu: G54 to 1, G59 to 6.</p>
    </Sheet>
  </DeviceFrame>
);

export const PC = () => (
  // PC (1920): the tablet's centred dialog at the same 520px — only the dimmed
  // screen around it grows.
  <DeviceFrame device="pc" height={1080}>
    <Sheet title="Zerowanie" onClose={() => {}}>
      <p className="m-0 text-base text-ink">Zero robocze to punkt, od którego liczy się program. Zerowanie ustawia je tam, gdzie stoi narzędzie — zwykle po dojechaniu na róg materiału.</p>
      <p className="m-0 text-base text-ink">Maszyna przy tym nie jedzie. Zmienia się tylko odczyt roboczy; pozycja maszynowa zostaje ta sama.</p>
      <p className="m-0 text-base text-ink">Panel wysyła G10 L20 P&lt;n&gt;, gdzie &lt;n&gt; to numer czynnego układu: G54 to 1, G59 to 6.</p>
    </Sheet>
  </DeviceFrame>
);
