import { useEffect, useMemo, useRef, useState } from 'react';
import Scene from '../scene/Scene';
import Axes from '../scene/Axes';
import { composeScene } from '../scene/compose';
import { DEFAULT_VIEW } from '../scene/views';

/**
 * The machine's travel in 3D, with where homing leaves it and where its
 * switches are — the Geometria group of the controller settings (design,
 * panel v2, 2026-09-26).
 *
 * The panel's own scene, as the file preview uses it: the travel outline and
 * the floor with its figures, and HOME marked by the three-coloured axes —
 * no dot, no switch strokes and no legend to read them by (Mateusz,
 * 2026-09-26: *"dla home sam wskaznik osi trojkolorowy nie wystarczy?"*).
 * HOME is where `$H` leaves the machine, or with homing off the corner its
 * switches are in — the server's table (`geometry.js`). It turns and zooms, and after a few
 * seconds untouched glides back to the isometric view, as the file preview
 * does — only its own button moves a camera otherwise.
 */

const LAYERS = { machineArea: true };
const AT_ZERO = { x: 0, y: 0, z: 0 };
const IDLE_MS = 4000;
const GLIDE_MS = 700;

// Where the axes stand: after `$H`, or at the switches with homing off.
const homeOf = (homing) => (homing && homing.every((row) => row.range)
  ? Object.fromEntries(homing.map((row) => [row.axis, row.after ?? row.switchAt]))
  : null);

const MachinePreview = ({ envelope, homing, className = '' }) => {
  const [home, setHome] = useState(0);
  const idle = useRef(null);
  const hold = () => clearTimeout(idle.current);
  const release = () => {
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setHome((n) => n + 1), IDLE_MS);
  };
  useEffect(() => () => clearTimeout(idle.current), []);

  const scene = useMemo(() => composeScene({
    settings: null, envelope, wcs: null, offset: AT_ZERO, toolpath: null, layers: LAYERS,
  }), [envelope]);

  return (
    <div className={`relative min-h-0 overflow-hidden rounded-ctl border border-line bg-field ${className}`}>
      {envelope ? (
        <Scene
          scene={scene}
          layers={LAYERS}
          view={DEFAULT_VIEW}
          revision={home}
          memory="machine"
          fit={0}
          onFree={release}
          onGrab={hold}
          glideMs={GLIDE_MS}
        >
          {homeOf(homing) ? <Axes origin={homeOf(homing)} /> : null}
        </Scene>
      ) : null}
    </div>
  );
};

export default MachinePreview;
