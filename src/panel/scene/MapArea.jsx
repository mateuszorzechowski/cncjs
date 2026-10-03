import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import PointPicker from './PointPicker';
import { contourSegments } from './contours';

/**
 * A height map's area on the machine (Mateusz, 2026-10-02: "opcja A"): a
 * sheet lying at the work's Z0 — its edge a hairline, a paler grid through
 * the points inside — each point to measure a thin ring flat on it, filled
 * once measured (`done`, `{ i, j }`). No line crosses a ring: the edge and the
 * grid stop at it. A point the area was given by is a small cross round it.
 *
 * Measured (`heights`, `{ heights: [{ i, j, dz }], low, high }`), the sheet
 * is raised by each height times `scale` and shaded by it (2026-10-03): pale
 * to deep in the accent, or — `heat` — through the heatmap's colours.
 * `smooth` draws it as a smooth surface through the points rather than flat
 * between them: for the eye only, the program is still bent between the
 * points as measured. `solid` draws the sheet opaque, for its shape; see-
 * through, the path under it shows (Mateusz, 2026-10-03). `contours`, a
 * height in millimetres: lines on the sheet every that much, as on a
 * map of the land — where the board bulges is seen at once. `gridLines` off
 * leaves the sheet alone, a smooth surface: no lines, no edge, no points
 * (Mateusz, 2026-10-03: "bez linii siatki i bez punktów").
 *
 * `area` and `given` in work millimetres, placed by `offset` as the
 * program's path is; `nx` × `ny` points edge to edge as the server measures.
 *
 * A click on a point as drawn picks it (`onPick`, `{ i, j }`, or null when
 * one beside it or the right button lets it go — see `PointPicker`), and the
 * one picked (`picked`) is ringed as the Ścieżka's picked point is (Mateusz,
 * 2026-10-03: the height of one point read off the drawing, not guessed from
 * a colour). Points not drawn — the grid off — are not picked.
 */

// Each cell drawn this many times finer when smooth.
const FINE = 8;
// Around each point's mark, and its rings from the middle out: a disc measured, a ring not yet.
const MARK_SEGMENTS = 32;
/*
 * The most a mark's radius may take on the screen, in pixels: far out the
 * marks are the size of the grid, close in they stop growing (Mateusz,
 * 2026-10-03: "po przybliżeniu są za duże względem reszty"). Rebuilt when the
 * zoom has moved by more than a sixth.
 */
const MARK_PX = 7;
const ZOOM_STEP = Math.log(1.18);
const DISC = [0, 0.4, 0.7, 1];
const RING = [0.8, 1];
// Samples along each line of the grid, so it lies on a smooth sheet too.
const LINE_STEPS = 8;

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

// Catmull-Rom between `b` and `c`, `t` from 0 to 1: a smooth curve through every point.
const smoothly = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);

/** The height at grid position `(u, v)` — `0 … nx-1`, `0 … ny-1` — flat between points, or smooth through them. */
export const surfaceOf = (values, nx, ny, smooth) => (u, v) => {
  const at = (i, j) => values[Math.min(ny - 1, Math.max(0, j))][Math.min(nx - 1, Math.max(0, i))];
  const i = Math.min(nx - 2, Math.max(0, Math.floor(u)));
  const j = Math.min(ny - 2, Math.max(0, Math.floor(v)));
  const a = u - i;
  const b = v - j;
  if (!smooth) {
    return at(i, j) * (1 - a) * (1 - b) + at(i + 1, j) * a * (1 - b) + at(i, j + 1) * (1 - a) * b + at(i + 1, j + 1) * a * b;
  }
  const row = (jj) => smoothly(at(i - 1, jj), at(i, jj), at(i + 1, jj), at(i + 2, jj), a);
  return smoothly(row(j - 1), row(j), row(j + 1), row(j + 2), b);
};

/** A colour for a share of the range, 0 low to 1 high — the accent's shades, or the heatmap's colours; null, not measured. */
export const tintOf = (palette, ground, color) => {
  const base = new THREE.Color(ground);
  const deep = new THREE.Color(color);
  const heat = palette ? palette.map((one) => new THREE.Color(one)) : null;
  return (share) => {
    if (share === null) {
      return base.clone().lerp(deep, 0.35);
    }
    if (!heat) {
      // The whole way from the ground to the accent: the shades between were too close to tell apart (Mateusz, 2026-10-03).
      return base.clone().lerp(deep, 0.05 + 0.95 * share);
    }
    const at = Math.min(heat.length - 1.0001, share * (heat.length - 1));
    const k = Math.floor(at);
    return heat[k].clone().lerp(heat[k + 1], at - k).lerp(base, 0.35);
  };
};

const MapArea = ({
  area, nx, ny, given = [], done = [], heights = null, scale = 1, smooth = false, heat = null, offset, color, ground, edgeColor,
  picked = null, pickColor, onPick = null, solid = false, contours = null, gridLines = true,
}) => {
  const z = offset.z;
  const x0 = area.x[0] + offset.x;
  const x1 = area.x[1] + offset.x;
  const y0 = area.y[0] + offset.y;
  const y1 = area.y[1] + offset.y;
  const xAt = (u) => x0 + ((x1 - x0) * u) / Math.max(1, nx - 1);
  const yAt = (v) => y0 + ((y1 - y0) * v) / Math.max(1, ny - 1);
  const step = Math.min((x1 - x0) / Math.max(1, nx - 1), (y1 - y0) / Math.max(1, ny - 1));
  // A ring a sixteenth of the step, no larger than 1.5 mm: a coarse grid's rings do not swell.
  const r = Math.min(1.5, Math.max(0.25, step / 16));
  // An orthographic camera's zoom is pixels to the millimetre.
  const camera = useThree((state) => state.camera);
  const [zoom, setZoom] = useState(camera.zoom);
  const seen = useRef(camera.zoom);
  useFrame(() => {
    if (Math.abs(Math.log(camera.zoom / seen.current)) > ZOOM_STEP) {
      seen.current = camera.zoom;
      setZoom(camera.zoom);
    }
  });
  const markR = Math.min(r, MARK_PX / Math.max(zoom, 1e-6));

  // Each point's height measured, 0 where none is yet.
  const byPoint = new Map((heights?.heights || []).map(({ i, j, dz }) => [`${i},${j}`, dz]));
  const values = Array.from({ length: ny }, (_, j) => Array.from({ length: nx }, (__, i) => byPoint.get(`${i},${j}`) ?? 0));
  const surface = surfaceOf(values, nx, ny, smooth);
  const span = heights ? heights.high - heights.low : 0;
  const lift = (u, v) => z + surface(u, v) * scale;
  const point = (u, v) => [xAt(u), yAt(v), lift(u, v)];
  /*
   * Points' marks laid on the sheet (Mateusz, 2026-10-03: "dostosować się do
   * krzywych"): each vertex of a ring or a disc at the sheet's own height
   * where it falls, so a mark bends over a crease of the sheet rather than
   * cutting through it. `radii` from the middle out; one geometry for all
   * `at` (`[{ i, j }]`), `size` times the ring's radius.
   */
  const stepX = (x1 - x0) / Math.max(1, nx - 1);
  const stepY = (y1 - y0) / Math.max(1, ny - 1);
  const marks = (at, radii, size = 1) => {
    const positions = [];
    const index = [];
    for (const { i, j } of at) {
      const first = positions.length / 3;
      for (const radius of radii) {
        for (let k = 0; k < MARK_SEGMENTS; k++) {
          const angle = (2 * Math.PI * k) / MARK_SEGMENTS;
          const dx = radius * size * markR * Math.cos(angle);
          const dy = radius * size * markR * Math.sin(angle);
          const u = Math.min(nx - 1, Math.max(0, i + dx / stepX));
          const v = Math.min(ny - 1, Math.max(0, j + dy / stepY));
          positions.push(xAt(i) + dx, yAt(j) + dy, lift(u, v));
        }
      }
      for (let ring = 0; ring < radii.length - 1; ring++) {
        for (let k = 0; k < MARK_SEGMENTS; k++) {
          const a = first + ring * MARK_SEGMENTS + k;
          const b = first + ring * MARK_SEGMENTS + ((k + 1) % MARK_SEGMENTS);
          index.push(a, b, a + MARK_SEGMENTS, b, b + MARK_SEGMENTS, a + MARK_SEGMENTS);
        }
      }
    }
    const made = new THREE.BufferGeometry();
    made.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    made.setIndex(index);
    return made;
  };

  // The sheet, finer when smooth, each vertex shaded by its height — or the middle shade near a point not measured.
  const fine = smooth ? FINE : 1;
  const cols = (nx - 1) * fine + 1;
  const rows = (ny - 1) * fine + 1;
  const sheetKey = JSON.stringify([x0, x1, y0, y1, z, nx, ny, heights, scale, smooth, heat, color, ground]);
  let opacity = 0.6;
  if (solid) {
    opacity = 1;
  }
  const sheet = useGeometry(() => {
    const tint = tintOf(heat, ground, color);
    const positions = [];
    const colors = [];
    for (let rr = 0; rr < rows; rr++) {
      for (let c = 0; c < cols; c++) {
        const u = c / fine;
        const v = rr / fine;
        positions.push(...point(u, v));
        const near = `${Math.round(u)},${Math.round(v)}`;
        const share = byPoint.has(near) && span > 1e-6 ? Math.min(1, Math.max(0, (surface(u, v) - heights.low) / span)) : null;
        const shade = tint(share);
        colors.push(shade.r, shade.g, shade.b);
      }
    }
    const index = [];
    for (let rr = 0; rr < rows - 1; rr++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = rr * cols + c;
        index.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols);
      }
    }
    const made = new THREE.BufferGeometry();
    made.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    made.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    made.setIndex(index);
    return made;
  }, [sheetKey]);

  // Along each row and column from one point to the next on the sheet, stopping a ring's width short of each.
  const gapU = markR / Math.max(1e-6, (x1 - x0) / Math.max(1, nx - 1));
  const gapV = markR / Math.max(1e-6, (y1 - y0) / Math.max(1, ny - 1));
  const run = (from, to, at) => Array.from({ length: LINE_STEPS }, (_, s) => [
    at(from + ((to - from) * s) / LINE_STEPS), at(from + ((to - from) * (s + 1)) / LINE_STEPS),
  ]);
  const edge = [];
  const inner = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx - 1; i++) {
      (j === 0 || j === ny - 1 ? edge : inner).push(...run(i + gapU, i + 1 - gapU, (u) => point(u, j)));
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny - 1; j++) {
      (i === 0 || i === nx - 1 ? edge : inner).push(...run(j + gapV, j + 1 - gapV, (v) => point(i, v)));
    }
  }
  // A cross round each point given, its arms from just off the ring outwards.
  const crosses = given.flatMap(({ x, y }) => {
    const cx = x + offset.x;
    const cy = y + offset.y;
    const [a, b] = [markR * 1.5, markR * 3];
    return [[[cx - b, cy, z], [cx - a, cy, z]], [[cx + a, cy, z], [cx + b, cy, z]], [[cx, cy - b, z], [cx, cy - a, z]], [[cx, cy + a, z], [cx, cy + b, z]]];
  });

  // Just over the sheet, so it does not cut them in half.
  const contourLines = contours && heights ? contourSegments(surface, nx, ny, contours, FINE)
    .map(([a, b]) => [point(...a), point(...b)].map(([px, py, pz]) => [px, py, pz + 0.05])) : [];

  const measured = new Set(done.map(({ i, j }) => `${i},${j}`));
  const all = values.flatMap((row, j) => row.map((_, i) => ({ i, j })));
  const marksKey = JSON.stringify([sheetKey, markR, done]);
  const discs = useGeometry(() => marks(all.filter(({ i, j }) => measured.has(`${i},${j}`)), DISC), [marksKey]);
  const rings = useGeometry(() => marks(all.filter(({ i, j }) => !measured.has(`${i},${j}`)), RING), [marksKey]);
  const pickedRing = useGeometry(() => marks(picked ? [picked] : [], RING, 2), [marksKey, picked?.i, picked?.j]);

  return (
    <>
      {/* Something a drag can turn the view about, as the program's path is (Mateusz, 2026-10-03) — see `Controls`. */}
      <mesh geometry={sheet} userData={{ pivot: true }}>
        <meshBasicMaterial vertexColors transparent={!solid} opacity={opacity} depthWrite={solid} side={THREE.DoubleSide} />
      </mesh>
      {gridLines ? <Lines segments={edge} color={color} opacity={0.9} /> : null}
      {gridLines ? <Lines segments={inner} color={color} opacity={0.25} /> : null}
      {/* Over the sheet they lie on, by the depth test's nudge rather than by lifting them off it. */}
      {gridLines ? [discs, rings].map((geometry) => (
        <mesh key={geometry.uuid} geometry={geometry}>
          <meshBasicMaterial color={color} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-4} />
        </mesh>
      )) : null}
      {crosses.length ? <Lines segments={crosses} color={color} opacity={1} /> : null}
      {/* Faint in the accent over its pale shades; over the heatmap's colours or a solid sheet, the neutral edge's grey and stronger, to be seen. */}
      {contourLines.length ? <Lines segments={contourLines} color={heat || solid ? edgeColor : color} opacity={heat || solid ? 0.7 : 0.3} /> : null}
      {onPick && gridLines ? <PointPicker points={all.map(({ i, j }) => ({ i, j, at: point(i, j) }))} onPick={onPick} /> : null}
      {picked ? (
        <mesh geometry={pickedRing}>
          <meshBasicMaterial color={pickColor} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-4} />
        </mesh>
      ) : null}
    </>
  );
};

export default MapArea;
