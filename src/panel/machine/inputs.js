/**
 * The controller's inputs and outputs, as the diagnostics screen lists them.
 *
 * Grbl names each triggered input by a letter in `Pn:` and each running
 * output in `A:`; the server hands both over as it parsed them. This only
 * says which of a fixed list is lit, so the list stands still and a pin
 * lights in its place — a row that grew as pins triggered would move under
 * a finger testing a switch by hand.
 *
 * Each key is written out, so the resources test finds every one.
 */
export const PINS = [
  { letter: 'X', key: 'diag.pin.x' },
  { letter: 'Y', key: 'diag.pin.y' },
  { letter: 'Z', key: 'diag.pin.z' },
  { letter: 'P', key: 'diag.pin.probe' },
  { letter: 'D', key: 'diag.pin.door' },
  { letter: 'H', key: 'diag.pin.hold' },
  { letter: 'R', key: 'diag.pin.reset' },
  { letter: 'S', key: 'diag.pin.start' },
];

/**
 * Each pin, lit or not; null for all of them when the firmware did not say,
 * which is not the same as nothing triggered.
 */
export const pinsLit = (pins) => PINS.map((pin) => ({
  ...pin,
  lit: typeof pins === 'string' ? pins.includes(pin.letter) : null,
}));

/**
 * The spindle and the coolant, from `A:`: `S` clockwise, `C` counter-
 * clockwise, `F` flood, `M` mist. Null when not reported.
 */
export const accessoriesOf = (accessories) => {
  if (typeof accessories !== 'string') {
    return null;
  }
  let spindle = 'off';
  if (accessories.includes('S')) {
    spindle = 'cw';
  } else if (accessories.includes('C')) {
    spindle = 'ccw';
  }
  return { spindle, flood: accessories.includes('F'), mist: accessories.includes('M') };
};
