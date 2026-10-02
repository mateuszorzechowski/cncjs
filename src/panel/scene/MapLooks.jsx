import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/*
 * Three ways to draw a height map's area in the scene, for Mateusz to choose
 * from (2026-10-02) — the scene's own geometry, lying on the machine, rather
 * than marks facing the screen. Only one stays.
 *
 * A — a sheet at Z0: a hairline outline, a faint plane, the points flat
 *     rings on it (filled once measured), the given points small crosses.
 * B — the probe's way at each point: a short line down to Z0, dashed as a
 *     rapid before, solid once measured, under a hairline outline.
 * C — the surface measured: the saved map's heights, exaggerated, coloured
 *     low to high, with its grid's lines.
 */

const along = (from, to, n, k) => (n > 1 ? from + ((to - from) * k) / (n - 1) : from);

/** The grid's points, machine X and Y, `{ i, j, x, y }`. */
const pointsOf = (bounds, nx, ny) => {
  const out = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      out.push({
        i, j, x: along(bounds.min.x, bounds.max.x, nx, i), y: along(bounds.min.y, bounds.max.y, ny, j),
      });
    }
  }
  return out;
};

/** A geometry made once per change and let go of after. */
const useGeometry = (make, deps) => {
  const geometry = useMemo(make, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
};

/** The area's edge, a hairline closed loop at `z`. */
const Edge = ({ bounds, z, color, opacity = 0.9 }) => {
  const geometry = useGeometry(() => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(bounds.min.x, bounds.min.y, z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, z),
  ]), [bounds, z]);
  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineLoop>
  );
};

/** Crosses over the points given, flat on the plane. */
const Crosses = ({ given, z, size, color }) => {
  const geometry = useGeometry(() => new THREE.BufferGeometry().setFromPoints(given.flatMap(({ x, y }) => [
    new THREE.Vector3(x - size, y, z), new THREE.Vector3(x + size, y, z),
    new THREE.Vector3(x, y - size, z), new THREE.Vector3(x, y + size, z),
  ])), [given, z, size]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
};

const SheetLook = ({
  bounds, z, nx, ny, given, done, color,
}) => {
  const step = Math.min((bounds.max.x - bounds.min.x) / Math.max(1, nx - 1), (bounds.max.y - bounds.min.y) / Math.max(1, ny - 1));
  const r = Math.max(0.25, step / 16);
  const measured = new Set(done.map(({ i, j }) => `${i},${j}`));
  const points = pointsOf(bounds, nx, ny);
  const ring = useGeometry(() => new THREE.RingGeometry(r * 0.8, r, 32), [r]);
  const disc = useGeometry(() => new THREE.CircleGeometry(r, 24), [r]);
  return (
    <>
      <Edge bounds={bounds} z={z} color={color} />
      <mesh position={[(bounds.min.x + bounds.max.x) / 2, (bounds.min.y + bounds.max.y) / 2, z]}>
        <planeGeometry args={[bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {points.map(({ i, j, x, y }) => (
        <mesh key={`${i},${j}`} geometry={measured.has(`${i},${j}`) ? disc : ring} position={[x, y, z]}>
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <Crosses given={given} z={z} size={r * 2.2} color={color} />
    </>
  );
};

const ProbeLook = ({
  bounds, z, nx, ny, given, done, color, rapid,
}) => {
  const height = Math.max(2, Math.min(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y) / 8);
  const measured = new Set(done.map(({ i, j }) => `${i},${j}`));
  const points = pointsOf(bounds, nx, ny);
  const lines = (want) => points.filter(({ i, j }) => measured.has(`${i},${j}`) === want)
    .flatMap(({ x, y }) => [new THREE.Vector3(x, y, z + height), new THREE.Vector3(x, y, z)]);
  const doneKey = [...measured].join(' ');
  const key = `${bounds.min.x},${bounds.min.y},${bounds.max.x},${bounds.max.y}`;
  const waiting = useGeometry(() => new THREE.BufferGeometry().setFromPoints(lines(false)), [key, z, nx, ny, doneKey, height]);
  const touched = useGeometry(() => new THREE.BufferGeometry().setFromPoints(lines(true)), [key, z, nx, ny, doneKey, height]);
  return (
    <>
      <Edge bounds={bounds} z={z} color={color} />
      <lineSegments geometry={waiting} onUpdate={(self) => self.computeLineDistances()}>
        <lineDashedMaterial color={rapid} dashSize={height / 6} gapSize={height / 8} />
      </lineSegments>
      <lineSegments geometry={touched}>
        <lineBasicMaterial color={color} />
      </lineSegments>
      <Crosses given={given} z={z} size={height / 3} color={color} />
    </>
  );
};

const SurfaceLook = ({
  map, offset, color, ground,
}) => {
  const {
    xs, ys, dz, low, high,
  } = map;
  const span = Math.min(xs[xs.length - 1] - xs[0], ys[ys.length - 1] - ys[0]);
  // The heights shown at a scale a bow of under a millimetre can be seen at: a fifth of the area's side.
  const k = high - low > 1e-6 ? (span / 5) / (high - low) : 1;
  // Each cell drawn finer than the grid, bilinear between its corners as the program is bent: smooth, not faceted.
  const FINE = 8;
  const heightAt = (u, v) => {
    const i = Math.min(xs.length - 2, Math.floor(u));
    const j = Math.min(ys.length - 2, Math.floor(v));
    const a = u - i;
    const b = v - j;
    return dz[j][i] * (1 - a) * (1 - b) + dz[j][i + 1] * a * (1 - b) + dz[j + 1][i] * (1 - a) * b + dz[j + 1][i + 1] * a * b;
  };
  const geometry = useGeometry(() => {
    const made = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const lowColor = new THREE.Color(ground).lerp(new THREE.Color(color), 0.15);
    const highColor = new THREE.Color(color);
    const cols = (xs.length - 1) * FINE + 1;
    const rows = (ys.length - 1) * FINE + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = c / FINE;
        const v = r / FINE;
        const i = Math.min(xs.length - 2, Math.floor(u));
        const j = Math.min(ys.length - 2, Math.floor(v));
        const x = xs[i] + (xs[i + 1] - xs[i]) * (u - i);
        const y = ys[j] + (ys[j + 1] - ys[j]) * (v - j);
        const h = heightAt(u, v);
        positions.push(x, y, offset.z + (h - low) * k);
        const tint = lowColor.clone().lerp(highColor, high - low > 1e-6 ? (h - low) / (high - low) : 0);
        colors.push(tint.r, tint.g, tint.b);
      }
    }
    const index = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c;
        index.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols);
      }
    }
    made.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    made.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    made.setIndex(index);
    return made;
  }, [map, offset.z, color, ground, k]);
  // The grid's own lines over it: the measured points' rows and columns, not the fine mesh's.
  const wire = useGeometry(() => {
    const at = (u, v) => {
      const i = Math.min(xs.length - 2, Math.floor(u));
      const j = Math.min(ys.length - 2, Math.floor(v));
      return new THREE.Vector3(xs[i] + (xs[i + 1] - xs[i]) * (u - i), ys[j] + (ys[j + 1] - ys[j]) * (v - j), offset.z + (heightAt(u, v) - low) * k);
    };
    const pts = [];
    const steps = (xs.length - 1) * FINE;
    for (let j = 0; j < ys.length; j++) {
      for (let s = 0; s < steps; s++) {
        pts.push(at(s / FINE, j), at((s + 1) / FINE, j));
      }
    }
    const rowsSteps = (ys.length - 1) * FINE;
    for (let i = 0; i < xs.length; i++) {
      for (let s = 0; s < rowsSteps; s++) {
        pts.push(at(i, s / FINE), at(i, (s + 1) / FINE));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [map, offset.z, k]);
  return (
    <>
      <mesh geometry={geometry}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
      <lineSegments geometry={wire}>
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </lineSegments>
    </>
  );
};

/**
 * `look` `a`, `b` or `c` (see above); `area`, `given` in work millimetres,
 * placed by `offset`; `map` the saved height map, machine coordinates, for C.
 */
const MapLooks = ({
  look, area, nx, ny, given = [], done = [], offset, map = null, colors,
}) => {
  const z = offset.z;
  const bounds = {
    min: { x: area.x[0] + offset.x, y: area.y[0] + offset.y },
    max: { x: area.x[1] + offset.x, y: area.y[1] + offset.y },
  };
  const placed = given.map(({ x, y }) => ({ x: x + offset.x, y: y + offset.y }));
  if (look === 'c') {
    return map ? <SurfaceLook map={map} offset={offset} color={colors.work} ground={colors.ground} /> : <Edge bounds={bounds} z={z} color={colors.work} />;
  }
  if (look === 'b') {
    return <ProbeLook bounds={bounds} z={z} nx={nx} ny={ny} given={placed} done={done} color={colors.work} rapid={colors.rapid} />;
  }
  return <SheetLook bounds={bounds} z={z} nx={nx} ny={ny} given={placed} done={done} color={colors.work} />;
};

export default MapLooks;
