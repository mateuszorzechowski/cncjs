import { CornerParams } from 'cncjs';
import { useState } from 'react';

export const Setup = () => {
  // The L plate's Setup step: the two views animated on the left, the
  // figures in stages Z, X and Y on the right; a stage opens in place.
  // Telefon / tablet / PC: two columns from the tablet up; on a phone one column, and a stage opens as a sheet.
  const [texts, setTexts] = useState({ cornerThickness: '10', maxZ: '20', fast: '50', retract: '5', slow: '15', wallX: '10', toolDiameter: '6', clear: '20', depth: '5', maxXY: '15', wallY: '10', lift: '20' });
  return (
    <CornerParams
      fields={['cornerThickness', 'maxZ', 'fast', 'retract', 'slow', 'wallX', 'toolDiameter', 'clear', 'depth', 'maxXY', 'wallY', 'lift']}
      texts={texts}
      onText={(name, text) => setTexts((now) => ({ ...now, [name]: text }))}
      bad={null}
      corner="front-left"
      wcs="G54"
      intro={<p className="m-0 text-base text-ink">Załóż płytkę L na wybrany narożnik, ściankami do obu krawędzi materiału. Przypnij krokodylek do frezu.</p>}
    />
  );
};
