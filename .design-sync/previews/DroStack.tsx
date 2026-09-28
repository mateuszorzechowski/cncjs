import { DroStack, Card, WcsBadge, DeviceFrame } from 'cncjs';

export const WorkPosition = () => (
  // Telefon / tablet / PC: three axis rows everywhere; a row prefers 72px on a phone and 52px from 48rem, never taller than 72px.
  // The position as what the screen is for: one axis a line, figures as large
  // as the panel goes, the machine reading under each — the dashboard's
  // Pozycja robocza card.
  <div className="w-side">
    <Card label="Pozycja robocza" aside={<WcsBadge wcs="G54" />} bodyClassName="gap-0">
      <DroStack position={{ x: 112.4, y: 48.25, z: 5 }} machinePosition={{ x: -287.6, y: -251.75, z: -35 }} />
    </Card>
  </div>
);

export const AfterZeroing = () => (
  // On Zerowanie, after X and Y were zeroed at the corner of the part.
  <div className="w-side">
    <Card label="Zerowanie" aside={<WcsBadge wcs="G55" />} bodyClassName="gap-0">
      <DroStack position={{ x: 0, y: 0, z: 12.7 }} machinePosition={{ x: -395.2, y: -281.05, z: -27.3 }} />
    </Card>
  </div>
);

export const AfterHoming = () => (
  // Right after homing, nothing zeroed yet: work and machine readings agree.
  <div className="w-side">
    <Card label="Pozycja robocza" aside={<WcsBadge wcs="G54" />} bodyClassName="gap-0">
      <DroStack position={{ x: -2, y: -2, z: -2 }} machinePosition={{ x: -2, y: -2, z: -2 }} />
    </Card>
  </div>
);

export const Phone = () => (
  // Telefon (shell < 48rem): one row per axis, each preferring 72px (`basis-btnh`)
  // because the column is the whole screen; the axis letter left, the work
  // figure with `mm` and the machine figure under it, right-aligned.
  <DeviceFrame device="phone">
    <Card label="Zerowanie" aside={<WcsBadge wcs="G54" />} className="w-full" bodyClassName="gap-0">
      <DroStack position={{ x: 112.4, y: 48.25, z: 5 }} machinePosition={{ x: -287.6, y: -251.75, z: -35 }} />
    </Card>
  </DeviceFrame>
);

export const Tablet = () => (
  // Tablet (from 48rem): the same rows preferring 52px (`basis-ctl`), so the
  // three stack tighter; figures the same size, still at the right edge.
  <DeviceFrame device="tablet">
    <Card label="Zerowanie" aside={<WcsBadge wcs="G54" />} className="w-full" bodyClassName="gap-0">
      <DroStack position={{ x: 112.4, y: 48.25, z: 5 }} machinePosition={{ x: -287.6, y: -251.75, z: -35 }} />
    </Card>
  </DeviceFrame>
);

export const PC = () => (
  // PC (1920): the tablet's 52px rows; the rows are wider, so more room between
  // the axis letter and the right-aligned figures.
  <DeviceFrame device="pc">
    <Card label="Zerowanie" aside={<WcsBadge wcs="G54" />} className="w-full" bodyClassName="gap-0">
      <DroStack position={{ x: 112.4, y: 48.25, z: 5 }} machinePosition={{ x: -287.6, y: -251.75, z: -35 }} />
    </Card>
  </DeviceFrame>
);
