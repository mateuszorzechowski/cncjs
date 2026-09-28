import { ToggleChips } from 'cncjs';
import { useState } from 'react';

const AXES = [
  { id: 'x', label: 'X' },
  { id: 'y', label: 'Y' },
  { id: 'z', label: 'Z' },
];

export const AxisMask = () => {
  // $3, direction invert: each axis on or off on its own — not one choice.
  // Telefon / tablet / PC: same look on every device; the panel uses it for $2 (step pulse invert) in the Sygnały settings row, which puts it under the setting's name on a phone and in the right-hand column beside the name on a tablet/PC.
  const [chips, setChips] = useState({ x: false, y: true, z: false });
  return (
    <div className="flex flex-col gap-2">
      <ToggleChips label="Kierunek ruchu" options={AXES} value={chips} onChange={setChips} />
      <span className="text-note text-mut">zaznaczone = odwrócone</span>
    </div>
  );
};

export const Changed = () => {
  // Changed before saving: an amber dot on each chip that differs from the
  // controller ($3 held Y alone; now X and Z).
  const [chips, setChips] = useState({ x: true, y: false, z: true });
  return (
    <div className="flex flex-col gap-2">
      <ToggleChips label="Kierunek ruchu" options={AXES} value={chips} was={{ x: false, y: true, z: false }} onChange={setChips} />
      <span className="text-note text-mut">zaznaczone = odwrócone</span>
    </div>
  );
};

export const Disabled = () => (
  // With the controller not answering: every chip dimmed, the row keeps its length.
  <div className="flex flex-col gap-2">
    <ToggleChips
      label="Kierunek bazowania"
      options={AXES.map((axis) => ({ ...axis, disabled: true }))}
      value={{ x: true, y: true, z: false }}
      onChange={() => {}}
    />
    <span className="text-note text-mut">zaznaczone = odwrócone</span>
  </div>
);
