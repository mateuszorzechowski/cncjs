import { WcsBadge, Card, DroStack } from 'cncjs';

export const OnTheReadout = () => (
  // The coordinate system the machine works in, as a marker in a card's head.
  // Telefon / tablet / PC: same look on every device, in the header of the position card (dashboard, Jog) and of the Zerowanie card at every width.
  <div className="w-side">
    <Card label="Pozycja robocza" aside={<WcsBadge wcs="G54" />} bodyClassName="gap-0">
      <DroStack position={{ x: 112.4, y: 48.25, z: -1.5 }} machinePosition={{ x: -287.6, y: -251.75, z: -41.5 }} />
    </Card>
  </div>
);

export const AllSystems = () => (
  // G54 to G59, the six work offsets Grbl keeps.
  <div className="flex flex-wrap gap-2">
    <WcsBadge wcs="G54" />
    <WcsBadge wcs="G55" />
    <WcsBadge wcs="G56" />
    <WcsBadge wcs="G57" />
    <WcsBadge wcs="G58" />
    <WcsBadge wcs="G59" />
  </div>
);

export const NoReading = () => (
  // No modal state reported yet: the dash, not a guess at G54.
  <div className="flex">
    <WcsBadge wcs={null} />
  </div>
);
