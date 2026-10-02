import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import Outline from './Outline';

// The points as dots a fixed size on screen, whatever the zoom.
const DOT_PX = 7;
// The area's outline dashed, as its pictograms have it.
const DASHED = 'dashed';

/**
 * A height map's area on the machine (Mateusz, 2026-10-02): its outline
 * dashed and its points, at the work's Z0 — where the surface it measures is
 * — placed by the work offset as the program's path is. `area` is in work
 * millimetres, `{ x: [from, to], y: [from, to] }`, `nx` × `ny` points spread
 * edge to edge as the server measures them.
 */
const MapArea = ({
  area, nx, ny, offset, color,
}) => {
  const z = offset.z;
  const bounds = useMemo(() => ({
    min: { x: area.x[0] + offset.x, y: area.y[0] + offset.y, z },
    max: { x: area.x[1] + offset.x, y: area.y[1] + offset.y, z },
  }), [area.x[0], area.x[1], area.y[0], area.y[1], offset.x, offset.y, z]); // eslint-disable-line react-hooks/exhaustive-deps

  const geometry = useMemo(() => {
    const along = (from, to, n, k) => (n > 1 ? from + ((to - from) * k) / (n - 1) : from);
    const positions = [];
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        positions.push(along(bounds.min.x, bounds.max.x, nx, i), along(bounds.min.y, bounds.max.y, ny, j), z);
      }
    }
    const made = new THREE.BufferGeometry();
    made.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return made;
  }, [bounds, nx, ny, z]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <>
      <Outline bounds={bounds} color={color} opacity={0.9} pattern={DASHED} />
      <points geometry={geometry}>
        <pointsMaterial color={color} size={DOT_PX} sizeAttenuation={false} />
      </points>
    </>
  );
};

export default MapArea;
