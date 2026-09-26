import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ABOVE_PATH } from './Toolpath';
import { useScreenScale } from './screenScale';
import { useSceneColors } from './colors';

/**
 * Where homing leaves the machine, and where its switches are — for the
 * Geometria group of the controller settings (design, panel v2, 2026-09-26).
 *
 * `homing` is the server's table (`geometry.js`): per axis the switch's end
 * and where `$H` leaves it. HOME is a dot there, in the tool's amber — faint
 * with homing off, where it is only where the switches are. The switches are
 * red strokes from their corner along each axis, faint with hard limits off.
 * Machine zero is the scene's own axes; the travel its own outline.
 */

// The dot's size on screen, whatever the zoom.
const DOT_PIXELS = 7;

// How far a switch's stroke runs along its axis, of that axis's travel.
const STROKE = 0.09;

const point = (rows, key) => Object.fromEntries(rows.map((row) => [row.axis, row[key]]));

const Strokes = ({ corner, rows, color, opacity }) => {
  const geometry = useMemo(() => {
    const points = [];
    for (const row of rows) {
      const length = (row.range.max - row.range.min) * STROKE;
      const inward = row.switchAt === row.range.max ? -length : length;
      const from = new THREE.Vector3(corner.x, corner.y, corner.z);
      const to = from.clone();
      to[row.axis] += inward;
      points.push(from, to);
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [corner, rows]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} renderOrder={ABOVE_PATH}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthTest={false} />
    </lineSegments>
  );
};

const Dot = ({ at, color, opacity }) => {
  const scaled = useScreenScale(DOT_PIXELS);
  return (
    <group position={[at.x, at.y, at.z]}>
      <group ref={scaled}>
        <mesh renderOrder={ABOVE_PATH}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={false} />
        </mesh>
      </group>
    </group>
  );
};

const HomeMarks = ({ homing, homingOn, hardLimits }) => {
  const colors = useSceneColors();
  if (!homing || homing.some((row) => !row.range)) {
    return null;
  }
  const corner = point(homing, 'switchAt');
  const home = homingOn ? point(homing, 'after') : corner;
  return (
    <>
      <Strokes corner={corner} rows={homing} color={colors.stop} opacity={hardLimits ? 1 : 0.35} />
      <Dot at={home} color={colors.tool} opacity={homingOn ? 1 : 0.4} />
    </>
  );
};

export default HomeMarks;
