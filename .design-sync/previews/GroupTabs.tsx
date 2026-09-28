import { GroupTabs, Card } from 'cncjs';
import { useState } from 'react';

const GROUPS = ['axes', 'homing', 'limits', 'spindle', 'signals', 'motion', 'other', 'geo', 'history'];
const NAMES = {
  axes: 'Osie',
  homing: 'Bazowanie',
  limits: 'Limity',
  spindle: 'Wrzeciono i laser',
  signals: 'Silniki i sygnały',
  motion: 'Ruch i raporty',
  other: 'Pozostałe',
  geo: 'Geometria',
  history: 'Historia zmian',
};

export const ControllerGroups = () => {
  // The controller settings' groups across the card, with an amber count
  // where changes wait to be saved.
  // Telefon / tablet / PC: same one row on every device; on a phone the row overflows and scrolls sideways (fade and a thumb on the divider), and on a phone or tablet the controller settings add a Geometria tab that a PC (shell ≥1800px) leaves out because it shows the geometry beside the axes table.
  const [group, setGroup] = useState('homing');
  return (
    <Card className="w-full">
      <GroupTabs label="Grupy ustawień" options={GROUPS} value={group} onChange={setGroup} format={(id) => NAMES[id]} counts={{ axes: 1, homing: 2 }} />
    </Card>
  );
};

export const Overflow = () => {
  // On a phone the row scrolls sideways: no bar, a fade at the edge with more
  // behind it, and a thumb on the divider.
  const [group, setGroup] = useState('axes');
  return (
    <Card className="w-[360px]">
      <GroupTabs label="Grupy ustawień" options={GROUPS} value={group} onChange={setGroup} format={(id) => NAMES[id]} counts={{ limits: 1 }} />
    </Card>
  );
};

export const Clean = () => {
  // Nothing pending: no badges, only the chosen group underlined.
  const [group, setGroup] = useState('axes');
  return (
    <Card className="w-[360px]">
      <GroupTabs label="Grupy ustawień" options={['axes', 'homing', 'history']} value={group} onChange={setGroup} format={(id) => NAMES[id]} />
    </Card>
  );
};
