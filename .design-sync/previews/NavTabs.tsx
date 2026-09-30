import { NavTabs } from 'cncjs';

// The phone's menu: one grid of which the bottom row shows, the rest one
// pull of the handle away. The row is the drawing's five.
const ITEMS = [
  { id: 'dashboard', label: 'Pulpit', ready: true },
  { id: 'jog', label: 'Jog', ready: true },
  { id: 'zero', label: 'Zero', ready: true },
  { id: 'files', label: 'Pliki', ready: true },
  { id: 'journal', label: 'Dziennik', ready: true },
];
const REST = [
  { id: 'path', label: 'Ścieżka', ready: true },
  { id: 'probe', label: 'Sonda', ready: false },
  { id: 'diag', label: 'Diag', ready: false },
  { id: 'homing', label: 'Bazowanie', ready: false },
  { id: 'mdi', label: 'MDI', ready: false },
  { id: 'settings', label: 'Ustawienia', ready: true },
];

// At the foot of a phone screen; the rows below its edge stay hidden.
const Phone = ({ current }) => (
  <div className="flex h-60 w-full max-w-sm flex-col overflow-hidden bg-bg">
    <div className="flex-1" />
    <NavTabs items={ITEMS} rest={REST} current={current} onSelect={() => {}} />
  </div>
);

export const OnDashboard = () => (
  // Telefon / tablet / PC: the bottom bar of the panel on a phone only (five destinations, the rest one pull of the handle away); on a tablet and a PC App.jsx draws NavRail (the left rail) instead, never both.
  <Phone current="dashboard" />
);
export const OnJog = () => <Phone current="jog" />;
export const OnJournal = () => <Phone current="journal" />;
