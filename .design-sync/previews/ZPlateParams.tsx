import { ZPlateParams } from 'cncjs';
import { useState } from 'react';

export const Setup = () => {
  // The Z plate's Setup step: the animated drawing on the left (whole cycle
  // with stops, dimensions, the act bar and the G54 readout), the figures on
  // the right in the drawing's three stages; a stage opens in the list's
  // place with Wróć, and the drawing plays that stage.
  // Telefon / tablet / PC: two columns from the tablet up; on a phone one column, and a stage opens as a sheet.
  const [texts, setTexts] = useState({ maxZ: '20', fast: '50', retract: '5', slow: '15', plateThickness: '20', lift: '20' });
  return (
    <ZPlateParams
      fields={['maxZ', 'fast', 'retract', 'slow', 'plateThickness', 'lift']}
      texts={texts}
      onText={(name, text) => setTexts((now) => ({ ...now, [name]: text }))}
      bad={null}
      wcs="G54"
      intro={<p className="m-0 text-base text-ink">Połóż płytkę płasko na materiale, pod frezem. Przypnij krokodylek do frezu.</p>}
    />
  );
};
