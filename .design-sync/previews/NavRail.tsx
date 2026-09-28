import { NavRail } from 'cncjs';

// Every destination the panel draws, in the rail's order; the ones not built
// yet are shown and disabled so nothing moves under the hand.
const DESTINATIONS = [
  { id: 'dashboard', label: 'Pulpit', ready: true },
  { id: 'jog', label: 'Jog', ready: true },
  { id: 'zero', label: 'Zerowanie', ready: true },
  { id: 'files', label: 'Pliki', ready: true },
  { id: 'path', label: 'Ścieżka', ready: true },
  { id: 'probe', label: 'Sonda', ready: false },
  { id: 'diag', label: 'Diagnostyka', ready: false },
  { id: 'journal', label: 'Dziennik', ready: true },
  { id: 'homing', label: 'Bazowanie', ready: false },
  { id: 'mdi', label: 'MDI', ready: false },
  { id: 'settings', label: 'Ustawienia', ready: true },
];

export const OnDashboard = () => (
  // Telefon / tablet / PC: the left rail of the panel on a tablet and a PC only, with every destination; on a phone App.jsx draws NavTabs (the bottom bar) instead, never both.
  <div className="flex h-[32rem]">
    <NavRail items={DESTINATIONS} current="dashboard" onSelect={() => {}} />
  </div>
);

export const OnFiles = () => (
  <div className="flex h-[32rem]">
    <NavRail items={DESTINATIONS} current="files" onSelect={() => {}} />
  </div>
);

export const OnSettings = () => (
  <div className="flex h-[32rem]">
    <NavRail items={DESTINATIONS} current="settings" onSelect={() => {}} />
  </div>
);
