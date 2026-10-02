import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * A height map's area on the machine (Mateusz, 2026-10-02: "opcja A"): a
 * sheet lying at the work's Z0 — a faint plane, its edge a hairline and a
 * paler grid through the points inside — and each point to measure a thin
 * ring flat on it, filled once measured (`done`, `{ i, j }`). No line crosses
 * a ring: the edge and the grid stop at it. A point the area was given by is
 * a small cross round it, its arms clear of the ring.
 *
 * `area` and `given` in work millimetres, placed by `offset` as the
 * program's path is; `nx` × `ny` points edge to edge as the server measures.
 */

const along = (from, to, n, k) => (n > 1 ? from + ((to - from) * k) / (n - 1) : from);

/** A geometry made once per change and let go of after. */
const useGeometry = (make, deps) => {
  const geometry = useMemo(make, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
};

/** Line segments `[[x, y], [x, y]]` at height `z`. */
const Lines = ({
  segments, z, color, opacity,
}) => {
  const geometry = useGeometry(() => new THREE.BufferGeometry().setFromPoints(
    segments.flatMap(([a, b]) => [new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z)])
  ), [JSON.stringify(segments), z]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
};

const MapArea = ({
  area, nx, ny, given = [], done = [], offset, color,
}) => {
  const z = offset.z;
  const x0 = area.x[0] + offset.x;
  const x1 = area.x[1] + offset.x;
  const y0 = area.y[0] + offset.y;
  const y1 = area.y[1] + offset.y;
  const xs = Array.from({ length: nx }, (_, i) => along(x0, x1, nx, i));
  const ys = Array.from({ length: ny }, (_, j) => along(y0, y1, ny, j));
  const step = Math.min((x1 - x0) / Math.max(1, nx - 1), (y1 - y0) / Math.max(1, ny - 1));
  const r = Math.max(0.25, step / 16);

  // From one point to the next along each row and each column, stopping at the rings: the edge's, and the grid's inside.
  const edge = [];
  const inner = [];
  ys.forEach((y, j) => xs.slice(1).forEach((x, k) => (j === 0 || j === ny - 1 ? edge : inner).push([[xs[k] + r, y], [x - r, y]])));
  xs.forEach((x, i) => ys.slice(1).forEach((y, k) => (i === 0 || i === nx - 1 ? edge : inner).push([[x, ys[k] + r], [x, y - r]])));
  // A cross round each point given, its arms from just off the ring outwards.
  const crosses = given.flatMap(({ x, y }) => {
    const cx = x + offset.x;
    const cy = y + offset.y;
    const [a, b] = [r * 1.5, r * 3];
    return [[[cx - b, cy], [cx - a, cy]], [[cx + a, cy], [cx + b, cy]], [[cx, cy - b], [cx, cy - a]], [[cx, cy + a], [cx, cy + b]]];
  });

  const measured = new Set(done.map(({ i, j }) => `${i},${j}`));
  const ring = useGeometry(() => new THREE.RingGeometry(r * 0.8, r, 32), [r]);
  const disc = useGeometry(() => new THREE.CircleGeometry(r, 32), [r]);

  return (
    <>
      <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, z]}>
        <planeGeometry args={[x1 - x0, y1 - y0]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Lines segments={edge} z={z} color={color} opacity={0.9} />
      <Lines segments={inner} z={z} color={color} opacity={0.25} />
      {ys.flatMap((y, j) => xs.map((x, i) => (
        <mesh key={`${i},${j}`} geometry={measured.has(`${i},${j}`) ? disc : ring} position={[x, y, z]}>
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      )))}
      {crosses.length ? <Lines segments={crosses} z={z} color={color} opacity={1} /> : null}
    </>
  );
};

export default MapArea;
