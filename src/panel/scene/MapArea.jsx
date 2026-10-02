import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * A height map's area on the machine (Mateusz, 2026-10-02: "opcja A"): a
 * sheet lying at the work's Z0 — a faint plane, its edge a hairline and a
 * paler grid through the points inside — and each point to measure a thin
 * ring flat on it, filled once measured (`done`, `{ i, j }`), the sheet shaded
 * by the heights measured so far (`heights`). No line crosses
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

/** Line segments `[[x, y, z], [x, y, z]]`. */
const Lines = ({ segments, color, opacity }) => {
  const geometry = useGeometry(() => new THREE.BufferGeometry().setFromPoints(
    segments.flatMap(([a, b]) => [new THREE.Vector3(...a), new THREE.Vector3(...b)])
  ), [JSON.stringify(segments)]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
};

/** From point `a` to `b`, `[x, y, z]`, less `r` at each end: a line that stops at the rings. */
const between = (a, b, r) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const length = Math.hypot(...d) || 1;
  const u = d.map((v) => (v / length) * r);
  return [[a[0] + u[0], a[1] + u[1], a[2] + u[2]], [b[0] - u[0], b[1] - u[1], b[2] - u[2]]];
};

/*
 * The sheet itself, a vertex at each point: raised by the heights measured
 * so far, times `scale` (Mateusz, 2026-10-03: a slider to bring the
 * differences out), and shaded by them — pale low, deeper high, blended
 * between points — an even middle shade where nothing is measured yet.
 */
const Sheet = ({
  nodes, nx, ny, shares, color, ground,
}) => {
  const key = JSON.stringify([nodes, shares]);
  const geometry = useGeometry(() => {
    const base = new THREE.Color(ground);
    const deep = new THREE.Color(color);
    const colors = shares.flatMap((share) => {
      const tint = base.clone().lerp(deep, share);
      return [tint.r, tint.g, tint.b];
    });
    const index = [];
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i;
        index.push(a, a + 1, a + nx, a + 1, a + nx + 1, a + nx);
      }
    }
    const made = new THREE.BufferGeometry();
    made.setAttribute('position', new THREE.Float32BufferAttribute(nodes.flat(), 3));
    made.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    made.setIndex(index);
    return made;
  }, [key, color, ground]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

const MapArea = ({
  area, nx, ny, given = [], done = [], heights = null, scale = 1, offset, color, ground,
}) => {
  const z = offset.z;
  const x0 = area.x[0] + offset.x;
  const x1 = area.x[1] + offset.x;
  const y0 = area.y[0] + offset.y;
  const y1 = area.y[1] + offset.y;
  const xs = Array.from({ length: nx }, (_, i) => along(x0, x1, nx, i));
  const ys = Array.from({ length: ny }, (_, j) => along(y0, y1, ny, j));
  const step = Math.min((x1 - x0) / Math.max(1, nx - 1), (y1 - y0) / Math.max(1, ny - 1));
  // A ring a sixteenth of the step, no larger than 1.5 mm: a coarse grid's rings do not swell.
  const r = Math.min(1.5, Math.max(0.25, step / 16));

  // Each point where it is drawn: raised by its height measured, times the scale; and its shade.
  const byPoint = new Map((heights?.heights || []).map(({ i, j, dz }) => [`${i},${j}`, dz]));
  const span = heights ? heights.high - heights.low : 0;
  const node = (i, j) => [xs[i], ys[j], z + (byPoint.get(`${i},${j}`) ?? 0) * scale];
  const nodes = ys.flatMap((y, j) => xs.map((x, i) => node(i, j)));
  const shares = ys.flatMap((y, j) => xs.map((x, i) => {
    const dz = byPoint.get(`${i},${j}`);
    return dz === undefined || span < 1e-6 ? 0.35 : 0.1 + 0.6 * ((dz - heights.low) / span);
  }));

  // From one point to the next along each row and each column, stopping at the rings: the edge's, and the grid's inside.
  const edge = [];
  const inner = [];
  ys.forEach((y, j) => xs.slice(1).forEach((x, k) => (j === 0 || j === ny - 1 ? edge : inner).push(between(node(k, j), node(k + 1, j), r))));
  xs.forEach((x, i) => ys.slice(1).forEach((y, k) => (i === 0 || i === nx - 1 ? edge : inner).push(between(node(i, k), node(i, k + 1), r))));
  // A cross round each point given, its arms from just off the ring outwards.
  const crosses = given.flatMap(({ x, y }) => {
    const cx = x + offset.x;
    const cy = y + offset.y;
    const [a, b] = [r * 1.5, r * 3];
    return [[[cx - b, cy, z], [cx - a, cy, z]], [[cx + a, cy, z], [cx + b, cy, z]], [[cx, cy - b, z], [cx, cy - a, z]], [[cx, cy + a, z], [cx, cy + b, z]]];
  });

  const measured = new Set(done.map(({ i, j }) => `${i},${j}`));
  const ring = useGeometry(() => new THREE.RingGeometry(r * 0.8, r, 32), [r]);
  const disc = useGeometry(() => new THREE.CircleGeometry(r, 32), [r]);

  return (
    <>
      <Sheet nodes={nodes} nx={nx} ny={ny} shares={shares} color={color} ground={ground} />
      <Lines segments={edge} color={color} opacity={0.9} />
      <Lines segments={inner} color={color} opacity={0.25} />
      {ys.flatMap((y, j) => xs.map((x, i) => (
        <mesh key={`${i},${j}`} geometry={measured.has(`${i},${j}`) ? disc : ring} position={node(i, j)}>
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      )))}
      {crosses.length ? <Lines segments={crosses} color={color} opacity={1} /> : null}
    </>
  );
};

export default MapArea;
