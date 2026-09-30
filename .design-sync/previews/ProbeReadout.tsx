import { ProbeReadout } from 'cncjs';

export const Before = () => (
  // The tool's place in the coordinate system under a probing drawing: muted
  // against the old zero.
  // Telefon / tablet / PC: one centred row; the axes wrap under the caption when narrow.
  <div className="w-side rounded-ctl border border-line bg-panel">
    <ProbeReadout wcs="G54" after={false} axes={[['z', 39.537]]} />
  </div>
);

export const After = () => (
  // In the accent once the new zero is written.
  <div className="w-side rounded-ctl border border-line bg-panel">
    <ProbeReadout wcs="G54" after axes={[['z', 20]]} />
  </div>
);

export const ThreeAxes = () => (
  // The corner's: X, Y and Z at once.
  <div className="w-side rounded-ctl border border-line bg-panel">
    <ProbeReadout wcs="G55" after={false} axes={[['x', 158.456], ['y', 123.9], ['z', 67.482]]} />
  </div>
);
