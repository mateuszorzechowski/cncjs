import { useEffect, useMemo, useRef, useState } from 'react';
import Scene from '../scene/Scene';
import MapLooks from '../scene/MapLooks';
import SegmentedChoice from './SegmentedChoice';
import { useSceneColors } from '../scene/colors';
import { composeScene, toolPoint } from '../scene/compose';
import { DEFAULT_VIEW } from '../scene/views';
import { workOffset } from '../machine/envelope';
import { readToolpath } from '../machine/toolpath';
import { t } from '../i18n';

/**
 * The height map's area on the machine, in 3D (Mateusz, 2026-10-02: the
 * Ścieżka's and the jog's scene, not a drawing of its own): the travel, the
 * loaded program's path, the work zero and the tool where it stands — so a
 * corner taken by jog is seen where it is — and the area with its points at
 * Z0 (`MapArea`). It turns and zooms, and after a few seconds untouched
 * glides back to the isometric view, as the file preview does.
 */

const LAYERS = { machineArea: true, path: true, wcsAxes: true };
const NO_OFFSET = { x: 0, y: 0, z: 0 };
const IDLE_MS = 4000;
const GLIDE_MS = 700;

// Three ways to draw the area, to choose from (Mateusz, 2026-10-02) — the choice goes once one is chosen.
const LOOKS = ['a', 'b', 'c'];
const LOOK_WORDS = { a: 'probe.map.look.a', b: 'probe.map.look.b', c: 'probe.map.look.c' };

const MapPreview3D = ({ machine, grid, mode = null, done = [], className = '' }) => {
  const colors = useSceneColors();
  const [look, setLook] = useState('a');
  const [home, setHome] = useState(0);
  // The view fills the frame with the area (Mateusz, 2026-10-02), first and after every return home.
  const [fit, setFit] = useState(0);
  const idle = useRef(null);
  const hold = () => clearTimeout(idle.current);
  const release = () => {
    clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      setHome((n) => n + 1);
      setFit((n) => n + 1);
    }, IDLE_MS);
  };
  useEffect(() => () => clearTimeout(idle.current), []);

  const toolpath = useMemo(() => readToolpath(machine.gcode), [machine.gcode]);
  // Settled to a value, so a status report four times a second does not rebuild the scene (see `PathWidget`).
  const live = workOffset(machine.machinePosition, machine.position);
  const offsetKey = live ? `${live.x},${live.y},${live.z}` : '';
  const offset = useMemo(() => live || NO_OFFSET, [offsetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const area = grid?.xs ? { x: [grid.xs[0], grid.xs[grid.xs.length - 1]], y: [grid.ys[0], grid.ys[grid.ys.length - 1]] } : null;
  const areaKey = area ? `${area.x},${area.y}` : '';
  // The area on the machine, for the view to take in when there is no travel to frame.
  const also = useMemo(() => (area ? [{
    min: { x: area.x[0] + offset.x, y: area.y[0] + offset.y, z: offset.z },
    max: { x: area.x[1] + offset.x, y: area.y[1] + offset.y, z: offset.z },
  }] : []), [areaKey, offset]); // eslint-disable-line react-hooks/exhaustive-deps
  // The saved map's own extent, for the surface (variant C).
  const map = machine.heightMap;
  const saved = useMemo(() => (map ? {
    min: { x: map.xs[0], y: map.ys[0], z: offset.z }, max: { x: map.xs[map.xs.length - 1], y: map.ys[map.ys.length - 1], z: offset.z + 10 },
  } : null), [map, offset.z]);
  useEffect(() => {
    if (areaKey) {
      setFit((n) => n + 1);
    }
  }, [areaKey, look]);
  const scene = useMemo(() => composeScene({
    settings: machine.settings, envelope: machine.envelope, wcs: machine.modal?.wcs, offset, toolpath, layers: LAYERS, factor: machine.units?.factor, also,
  }), [machine.settings, machine.envelope, machine.modal?.wcs, offset, toolpath, machine.units?.factor, also]);

  return (
    <div className={`relative min-h-0 overflow-hidden rounded-ctl border border-line bg-field ${className}`}>
      <Scene
        scene={scene}
        tool={toolPoint(machine.machinePosition)}
        layers={LAYERS}
        view={DEFAULT_VIEW}
        revision={home}
        memory="map"
        fit={fit}
        focus={look === 'c' && saved ? saved : also[0] || null}
        // Framed on the area once the scene has drawn: a fit asked before that has no camera to move.
        onReady={() => setFit((n) => n + 1)}
        onFree={release}
        onGrab={hold}
        glideMs={GLIDE_MS}
      >
        {area ? (
          <MapLooks
            look={look}
            area={area}
            nx={grid.nx}
            ny={grid.ny}
            // The points it was given by, but for the program's, whose extent is not a point given.
            given={mode === 'program' ? [] : grid.given || []}
            done={done}
            offset={offset}
            map={machine.heightMap}
            colors={colors}
          />
        ) : null}
      </Scene>
      <div className="absolute left-2 top-2">
        <SegmentedChoice options={LOOKS} value={look} onChange={setLook} format={(one) => t(LOOK_WORDS[one])} label={t('probe.map.look.label')} compact joined />
      </div>
    </div>
  );
};

export default MapPreview3D;
