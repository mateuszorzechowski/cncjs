import { useEffect, useMemo, useState } from 'react';
import Scene from '../scene/Scene';
import MapArea from '../scene/MapArea';
import { useSceneColors } from '../scene/colors';
import { composeScene, toolPoint } from '../scene/compose';
import { DEFAULT_VIEW } from '../scene/views';
import { workOffset } from '../machine/envelope';
import { readToolpath } from '../machine/toolpath';

/**
 * The height map's area on the machine, in 3D (Mateusz, 2026-10-02: the
 * Ścieżka's and the jog's scene, not a drawing of its own): the travel, the
 * loaded program's path, the work zero and the tool where it stands — so a
 * corner taken by jog is seen where it is — and the area with its points at
 * Z0 (`MapArea`). It turns and zooms.
 *
 * Framed on the area the first time it is drawn, and again when the area
 * changes — until the operator moves the camera: from then on it stays where
 * they put it, and comes back there on the next of these steps (Mateusz,
 * 2026-10-03: *"jak zmienię ustawienia kamery to nie przywracaj"*). The
 * scene's memory (`memory="map"`) keeps the pose between them.
 */

const LAYERS = { machineArea: true, path: true, wcsAxes: true };
const NO_OFFSET = { x: 0, y: 0, z: 0 };

// Kept across these steps, as the camera is: the area last framed, and whether the operator has moved the view since.
const framing = { area: null, moved: false };

const MapPreview3D = ({
  machine, grid, mode = null, done = [], heights = null, scale = 1, smooth = false, heat = false, className = '',
}) => {
  const colors = useSceneColors();
  const [fit, setFit] = useState(0);
  // A fit asked before the scene has drawn has no camera to move.
  const [ready, setReady] = useState(false);

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
  // Framed on a new area, unless the operator has put the camera somewhere of their own.
  useEffect(() => {
    if (ready && areaKey && !framing.moved && framing.area !== areaKey) {
      framing.area = areaKey;
      setFit((n) => n + 1);
    }
  }, [ready, areaKey]);
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
        revision={0}
        memory="map"
        fit={fit}
        focus={also[0] || null}
        onReady={() => setReady(true)}
        onGrab={() => {
          framing.moved = true;
        }}
      >
        {area ? (
          <MapArea
            area={area}
            nx={grid.nx}
            ny={grid.ny}
            // The points it was given by, but for the program's, whose extent is not a point given.
            given={mode === 'program' ? [] : grid.given || []}
            done={done}
            heights={heights}
            scale={scale}
            smooth={smooth}
            heat={heat ? [colors.heat0, colors.heat1, colors.heat2, colors.heat3, colors.heat4] : null}
            offset={offset}
            color={colors.work}
            ground={colors.ground}
          />
        ) : null}
      </Scene>
    </div>
  );
};

export default MapPreview3D;
