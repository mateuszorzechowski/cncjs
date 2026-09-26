import { StateChip, PanelRoot, DeviceFrame } from 'cncjs';

export const Tones = () => (
  // Telefon / tablet / PC: one line on a phone (dot, word, a rule, chevron, 42px tall); from 48rem a column in the rail, dot and word centred, the chevron under them, 72px tall.
  // What state the machine is in, in its four tones: moving (green), ready and
  // holding (amber), will not move (red), nothing to say (grey). The word is
  // Grbl's own, or the panel's when there is no machine to ask.
  <div className="flex flex-wrap gap-2">
    <StateChip tone="running" label="Stan maszyny">Run</StateChip>
    <StateChip tone="ready" label="Stan maszyny">Idle</StateChip>
    <StateChip tone="stopped" label="Stan maszyny">Alarm</StateChip>
    <StateChip tone="inactive" label="Stan maszyny">Brak portu</StateChip>
  </div>
);

export const HoldJogDoor = () => (
  // A feed hold is one command from moving again, so amber; a jog is moving;
  // an open door is a refusal arriving from outside.
  <div className="flex flex-wrap gap-2">
    <StateChip tone="ready" label="Stan maszyny">Hold</StateChip>
    <StateChip tone="running" label="Stan maszyny">Jog</StateChip>
    <StateChip tone="stopped" label="Stan maszyny">Door</StateChip>
  </div>
);

export const NotConnected = () => (
  // Before a machine answers: the panel's own words, all grey.
  <div className="flex flex-wrap gap-2">
    <StateChip tone="inactive" label="Stan maszyny">Brak serwera</StateChip>
    <StateChip tone="inactive" label="Stan maszyny">Łączenie</StateChip>
  </div>
);

export const OnPhone = () => (
  // On a phone the chip is one line — dot, word, a rule and the chevron —
  // as tall as the STOP beside it. A 360px shell is a phone.
  <PanelRoot className="w-[360px]">
    <div className="flex flex-wrap gap-2">
      <StateChip tone="running" label="Stan maszyny">Run</StateChip>
      <StateChip tone="ready" label="Stan maszyny">Idle</StateChip>
      <StateChip tone="stopped" label="Stan maszyny">Alarm</StateChip>
      <StateChip tone="inactive" label="Stan maszyny">Brak portu</StateChip>
    </div>
  </PanelRoot>
);

export const Phone = () => (
  // Telefon (shell < 48rem): one line, `h-chiph` (42px): dot, the word, a short
  // rule in the chip's tone and a chevron; at least `min-w-chip` wide, growing
  // with the word.
  <DeviceFrame device="phone">
    <div className="flex flex-wrap gap-2 p-pad">
      <StateChip tone="running" label="Stan maszyny">Run</StateChip>
      <StateChip tone="ready" label="Stan maszyny">Idle</StateChip>
      <StateChip tone="stopped" label="Stan maszyny">Alarm</StateChip>
      <StateChip tone="inactive" label="Stan maszyny">Brak serwera</StateChip>
    </div>
  </DeviceFrame>
);

export const Tablet = () => (
  // Tablet (from 48rem): a column `w-railInset` wide and `h-btnh` (72px) tall:
  // dot and word centred on top, no rule, the chevron at the bottom. A word that
  // does not fit one line breaks into two, the dot hanging off its left.
  <DeviceFrame device="tablet">
    <div className="flex flex-wrap gap-2 p-pad">
      <StateChip tone="running" label="Stan maszyny">Run</StateChip>
      <StateChip tone="ready" label="Stan maszyny">Idle</StateChip>
      <StateChip tone="stopped" label="Stan maszyny">Alarm</StateChip>
      <StateChip tone="inactive" label="Stan maszyny">Brak serwera</StateChip>
    </div>
  </DeviceFrame>
);

export const PC = () => (
  // PC (1920): the tablet's column form; the chip's width is the rail's, not
  // the screen's, so it stays the same size.
  <DeviceFrame device="pc">
    <div className="flex flex-wrap gap-2 p-pad">
      <StateChip tone="running" label="Stan maszyny">Run</StateChip>
      <StateChip tone="ready" label="Stan maszyny">Idle</StateChip>
      <StateChip tone="stopped" label="Stan maszyny">Alarm</StateChip>
      <StateChip tone="inactive" label="Stan maszyny">Brak serwera</StateChip>
    </div>
  </DeviceFrame>
);
