import { ProbeWire } from 'cncjs';

export const Waiting = () => (
  // The wire test: the clip on the tool, the plate apart from it and touching
  // it, the probe pin's state under each. Open, waiting for a touch.
  // Telefon / tablet / PC: one drawing, as wide as a small card (max-w-sm), centred.
  <div className="w-full max-w-sm"><ProbeWire lit={false} plate="flat" /></div>
);

export const Touching = () => (
  // The plate touches the tool: the closed half lit, the open one faded.
  <div className="w-full max-w-sm"><ProbeWire lit plate="flat" /></div>
);

export const LPlate = () => (
  // The corner's L plate, side-on.
  <div className="w-full max-w-sm"><ProbeWire lit={false} plate="l" /></div>
);
