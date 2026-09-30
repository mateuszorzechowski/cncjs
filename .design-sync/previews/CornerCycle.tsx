import { CornerCycle } from 'cncjs';

export const WholeLoop = () => (
  // The L plate's cycle from above (left) and from the side (right), played
  // part by part with stops; under it the acts and the tool's X, Y, Z in the
  // system, against the old zero and then the new one.
  // Telefon / tablet / PC: the two views side by side at every width; the drawing scales with its card.
  <div className="w-full max-w-lg">
    <CornerCycle
      corner="front-left"
      wcs="G54"
      texts={{ cornerThickness: '10', maxZ: '20', fast: '50', retract: '5', slow: '15', wallX: '10', toolDiameter: '6', clear: '20', depth: '5', maxXY: '15', wallY: '10', lift: '20' }}
    />
  </div>
);

export const FieldFocused = () => (
  // One figure being set: only its part plays, with its value on the drawing.
  <div className="w-full max-w-lg">
    <CornerCycle
      corner="back-right"
      field="wallX"
      wcs="G54"
      texts={{ cornerThickness: '10', maxZ: '20', fast: '50', retract: '5', slow: '15', wallX: '10', toolDiameter: '6', clear: '20', depth: '5', maxXY: '15', wallY: '10', lift: '20' }}
    />
  </div>
);

export const Measuring = () => (
  // During the measurement: the server's phase picks the part.
  <div className="w-full max-w-lg"><CornerCycle corner="front-right" phase="x-fast" words="Szybki dotyk ścianki X" /></div>
);
