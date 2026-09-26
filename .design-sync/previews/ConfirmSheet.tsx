import { ConfirmSheet, PanelRoot, DeviceFrame } from 'cncjs';

// Telefon / tablet / PC: a sheet up from the bottom edge on a phone, a centred 520px dialog from 48rem; Cancel and the action split its foot everywhere.
// A sheet is fixed inside the panel's shell and takes at most 85% of its
// height, so the shell needs one: the whole screen in the app, 32rem here (a class the panel ships).

export const EepromWrite = () => (
  // A question before an action that cannot be taken back — on a wide screen a
  // dialog, on a phone a sheet from the bottom. Cancel and the action share
  // its foot; the action takes the tone of what it does.
  <PanelRoot className="h-[32rem]">
  <ConfirmSheet
    title="Zapisać w sterowniku: 2?"
    note="Te wartości trafią do sterownika w tej kolejności. Pierwsza odrzucona zatrzymuje resztę."
    warning="Zapis do EEPROM sterownika. Zmiana działa od razu i zostaje po wyłączeniu zasilania."
    confirmLabel="Zapisz w sterowniku"
    tone="primary"
    onConfirm={() => {}}
    onClose={() => {}}
  >
    <ul className="m-0 list-none p-0 text-note">
      <li className="flex gap-2 border-b border-line py-2"><span className="font-num font-semibold">$110</span> Maks. prędkość X <span className="font-num text-mut">3000.000 → 3500 mm/min</span></li>
      <li className="flex gap-2 py-2"><span className="font-num font-semibold">$22</span> Bazowanie <span className="font-num text-mut">Wł. → Wył.</span></li>
    </ul>
  </ConfirmSheet>
  </PanelRoot>
);

export const StopCheck = () => (
  <PanelRoot className="h-[32rem]">
  <ConfirmSheet
    title="Sprawdzić plik na sterowniku?"
    note="Grbl przejdzie w tryb sprawdzania ($C) i przeczyta cały plik bez ruchu."
    warning="Na końcu sterownik zrobi reset."
    confirmLabel="Sprawdź"
    onConfirm={() => {}}
    onClose={() => {}}
  />
  </PanelRoot>
);

export const Phone = () => (
  // Telefon (shell < 48rem): a sheet — full width, pinned to the bottom edge,
  // rounded top corners and a top border only, over a dimmed screen; at most
  // 85% of the shell's height. Cancel and the action share the foot, half each.
  <DeviceFrame device="phone" height={560}>
    <ConfirmSheet
      title="Zapisać w sterowniku: 2?"
      note="Te wartości trafią do sterownika w tej kolejności. Pierwsza odrzucona zatrzymuje resztę."
      warning="Zapis do EEPROM sterownika. Zmiana działa od razu i zostaje po wyłączeniu zasilania."
      confirmLabel="Zapisz w sterowniku"
      tone="primary"
      onConfirm={() => {}}
      onClose={() => {}}
    >
      <ul className="m-0 list-none p-0 text-note">
        <li className="flex gap-2 border-b border-line py-2"><span className="font-num font-semibold">$110</span> Maks. prędkość X <span className="font-num text-mut">3000.000 → 3500 mm/min</span></li>
        <li className="flex gap-2 py-2"><span className="font-num font-semibold">$22</span> Bazowanie <span className="font-num text-mut">Wł. → Wył.</span></li>
      </ul>
    </ConfirmSheet>
  </DeviceFrame>
);

export const Tablet = () => (
  // Tablet (from 48rem): a dialog in the middle of the shell — 520px wide
  // (`w-dialog`), all four corners rounded and a full border; same contents.
  <DeviceFrame device="tablet" height={768}>
    <ConfirmSheet
      title="Zapisać w sterowniku: 2?"
      note="Te wartości trafią do sterownika w tej kolejności. Pierwsza odrzucona zatrzymuje resztę."
      warning="Zapis do EEPROM sterownika. Zmiana działa od razu i zostaje po wyłączeniu zasilania."
      confirmLabel="Zapisz w sterowniku"
      tone="primary"
      onConfirm={() => {}}
      onClose={() => {}}
    >
      <ul className="m-0 list-none p-0 text-note">
        <li className="flex gap-2 border-b border-line py-2"><span className="font-num font-semibold">$110</span> Maks. prędkość X <span className="font-num text-mut">3000.000 → 3500 mm/min</span></li>
        <li className="flex gap-2 py-2"><span className="font-num font-semibold">$22</span> Bazowanie <span className="font-num text-mut">Wł. → Wył.</span></li>
      </ul>
    </ConfirmSheet>
  </DeviceFrame>
);

export const PC = () => (
  // PC (1920): the tablet's centred dialog, still 520px — only the dimmed
  // screen around it grows.
  <DeviceFrame device="pc" height={1080}>
    <ConfirmSheet
      title="Zapisać w sterowniku: 2?"
      note="Te wartości trafią do sterownika w tej kolejności. Pierwsza odrzucona zatrzymuje resztę."
      warning="Zapis do EEPROM sterownika. Zmiana działa od razu i zostaje po wyłączeniu zasilania."
      confirmLabel="Zapisz w sterowniku"
      tone="primary"
      onConfirm={() => {}}
      onClose={() => {}}
    >
      <ul className="m-0 list-none p-0 text-note">
        <li className="flex gap-2 border-b border-line py-2"><span className="font-num font-semibold">$110</span> Maks. prędkość X <span className="font-num text-mut">3000.000 → 3500 mm/min</span></li>
        <li className="flex gap-2 py-2"><span className="font-num font-semibold">$22</span> Bazowanie <span className="font-num text-mut">Wł. → Wył.</span></li>
      </ul>
    </ConfirmSheet>
  </DeviceFrame>
);
