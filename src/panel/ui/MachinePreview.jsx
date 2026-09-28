import { useEffect, useMemo, useRef, useState } from 'react';
import Scene from '../scene/Scene';
import Axes from '../scene/Axes';
import HomeMarker from '../scene/HomeMarker';
import { useSceneColors } from '../scene/colors';
import { composeScene } from '../scene/compose';
import { DEFAULT_VIEW } from '../scene/views';
import { t } from '../i18n';

/**
 * The machine's travel in 3D, with where homing leaves it and where its
 * switches are — the Geometria group of the controller settings (design,
 * panel v2, 2026-09-26).
 *
 * The panel's own scene, as the file preview uses it: the travel outline and
 * the floor with its figures, machine zero by the three-coloured axes, and
 * HOME by a mark of its own (`HomeMarker`) — they are two places, and the
 * axes had stood for HOME until it was pointed out (Mateusz, 2026-09-28:
 * *"MPos to osie kolorowe, pozycję HOME zaznacz czymś innym"*). HOME is where
 * `$H` leaves the machine — the server's table (`geometry.js`); with homing
 * off it has no place and is not drawn. It turns and zooms, and after a few
 * seconds untouched glides back to the isometric view, as the file preview
 * does — only its own button moves a camera otherwise.
 */

const LAYERS = { machineArea: true };
const AT_ZERO = { x: 0, y: 0, z: 0 };
const IDLE_MS = 4000;
const GLIDE_MS = 700;

// Where `$H` leaves the machine; none with homing off (the server gives no range then).
const homeOf = (homing) => (homing && homing.every((row) => row.range)
  ? Object.fromEntries(homing.map((row) => [row.axis, row.after ?? row.switchAt]))
  : null);

// Machine zero by the coloured axes, where homing leaves it by its own mark (`HomeMarker`).
const Marks = ({ home }) => {
  const colors = useSceneColors();
  return (
    <>
      <Axes origin={AT_ZERO} />
      {home ? <HomeMarker at={home} color={colors.work} /> : null}
    </>
  );
};

const MachinePreview = ({ envelope, homing, className = '' }) => {
  // Not homed: the box is a size without a place — dashed in `Scene`, and said here.
  const unplaced = envelope?.placed === false;
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
    <>
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
            <Marks home={homeOf(homing)} />
          </Scene>
        ) : null}
      </div>
      {/* Under the drawing, not over it: laid over the canvas it took the top of the scene with it. */}
      {unplaced ? <p className="m-0 text-note text-mut">{t('machine.geo.unplaced')}</p> : null}
    </>
  );
};

export default MachinePreview;
