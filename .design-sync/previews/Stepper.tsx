import { Stepper } from 'cncjs';
import { useState } from 'react';

const Caption = ({ children }) => (
  <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">{children}</span>
);

export const JogSpeed = () => {
  // The jog card's speed: « and » the coarse step, ‹ and › the fine one.
  // Telefon / tablet / PC: same look on every device; the jog speed stepper is inline in the jog card on a tablet/PC and in the jog group's sheet on a phone, while the settings' rates sheet and the mouse-only date picker use it the same at every width.
  const [speed, setSpeed] = useState(1500);
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Caption>Prędkość XY</Caption>
      <Stepper label="Prędkość XY" value={speed} onChange={setSpeed} fine={100} coarse={500} min={100} max={5000} unit="mm/min" />
    </div>
  );
};

export const AtMax = () => {
  // At its bound the value stops there — Z tops out at 2000 mm/min.
  const [speed, setSpeed] = useState(2000);
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Caption>Prędkość Z</Caption>
      <Stepper label="Prędkość Z" value={speed} onChange={setSpeed} fine={50} coarse={200} min={50} max={2000} unit="mm/min" />
    </div>
  );
};

export const PickerTime = () => {
  // The date picker's time: hours by 1 and 6, minutes by 1 and 10.
  const [hours, setHours] = useState(14);
  const [minutes, setMinutes] = useState(30);
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Stepper label="Godzina" unit="h" value={hours} onChange={setHours} fine={1} coarse={6} min={0} max={23} />
      <Stepper label="Minuta" unit="min" value={minutes} onChange={setMinutes} fine={1} coarse={10} min={0} max={59} />
    </div>
  );
};

export const Disabled = () => (
  // No machine connected: keys dimmed, the reading still says where it starts.
  <div className="flex w-full max-w-sm flex-col gap-2">
    <Caption>Prędkość XY</Caption>
    <Stepper label="Prędkość XY" value={1500} onChange={() => {}} fine={100} coarse={500} min={100} max={5000} unit="mm/min" disabled />
  </div>
);
