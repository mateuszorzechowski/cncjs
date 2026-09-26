import { useEffect, useMemo, useRef, useState } from 'react';
import Scene from '../scene/Scene';
import HomeMarks from '../scene/HomeMarks';
import { composeScene } from '../scene/compose';
import { DEFAULT_VIEW } from '../scene/views';

/**
 * The machine's travel in 3D, with where homing leaves it and where its
 * switches are — the Geometria group of the controller settings (design,
 * panel v2, 2026-09-26).
 *
 * The panel's own scene, as the file preview uses it: the travel outline,
 * the machine's axes at MPos 0, the floor with its figures; HOME and the
 * switches over them (`HomeMarks`). It turns and zooms, and after a few
 * seconds untouched glides back to the isometric view, as the file preview
 * does — only its own button moves a camera otherwise.
 */

const LAYERS = { machineArea: true, machineAxes: true };
const AT_ZERO = { x: 0, y: 0, z: 0 };
const IDLE_MS = 4000;
const GLIDE_MS = 700;

const MachinePreview = ({ envelope, homing, homingOn, hardLimits, className = '' }) => {
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
          <HomeMarks homing={homing} homingOn={homingOn} hardLimits={hardLimits} />
        </Scene>
      ) : null}
    </div>
  );
};

export default MachinePreview;
