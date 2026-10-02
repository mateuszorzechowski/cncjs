import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import Outline from './Outline';

// The points as marks a fixed size on screen, whatever the zoom.
const MARK_PX = 11;
// The area's outline dashed, as its pictograms have it.
const DASHED = 'dashed';

/*
 * The marks' shapes, white on clear, tinted by the material (Mateusz,
 * 2026-10-02): a point the area was given by, a square round it; a point to
 * measure, an empty ring; one measured, the ring filled.
 */
const SHAPES = {
  ring: (g) => {
    g.lineWidth = 9;
    g.beginPath();
    g.arc(32, 32, 24, 0, Math.PI * 2);
    g.stroke();
  },
  dot: (g) => {
    g.beginPath();
    g.arc(32, 32, 28, 0, Math.PI * 2);
    g.fill();
  },
  // A frame round the point it marks — a given point is often a point of the grid too, its ring inside.
  square: (g) => {
    g.lineWidth = 7;
    g.strokeRect(6, 6, 52, 52);
  },
};

const [RING, DOT, SQUARE] = Object.keys(SHAPES);
const textures = {};
const textureOf = (shape) => {
  if (!textures[shape]) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#ffffff';
    SHAPES[shape](g);
    textures[shape] = new THREE.CanvasTexture(canvas);
  }
  return textures[shape];
};

/** Points at `positions` (machine `[x, y, z]`), each drawn as `shape`. */
const Marks = ({
  positions, shape, color, size = MARK_PX,
}) => {
  const geometry = useMemo(() => {
    const made = new THREE.BufferGeometry();
    made.setAttribute('position', new THREE.Float32BufferAttribute(positions.flat(), 3));
    return made;
  }, [positions]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (!positions.length) {
    return null;
  }
  return (
    <points geometry={geometry}>
      <pointsMaterial color={color} size={size} sizeAttenuation={false} map={textureOf(shape)} transparent alphaTest={0.5} depthTest={false} />
    </points>
  );
};

/**
 * A height map's area on the machine (Mateusz, 2026-10-02): its outline
 * dashed, the points it was given by, and the points to measure — empty, and
 * filled as they are measured (`done`, `{ i, j }`) — at the work's Z0, where
 * the surface it measures is, placed by the work offset as the program's path
 * is. `area` and `given` are in work millimetres; `nx` × `ny` points spread
 * edge to edge as the server measures them.
 */
const MapArea = ({
  area, nx, ny, given = [], done = [], offset, color,
}) => {
  const z = offset.z;
  const bounds = useMemo(() => ({
    min: { x: area.x[0] + offset.x, y: area.y[0] + offset.y, z },
    max: { x: area.x[1] + offset.x, y: area.y[1] + offset.y, z },
  }), [area.x[0], area.x[1], area.y[0], area.y[1], offset.x, offset.y, z]); // eslint-disable-line react-hooks/exhaustive-deps

  const doneKey = done.map(({ i, j }) => `${i},${j}`).join(' ');
  const [open, filled] = useMemo(() => {
    const along = (from, to, n, k) => (n > 1 ? from + ((to - from) * k) / (n - 1) : from);
    const measured = new Set(doneKey.split(' '));
    const sets = [[], []];
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        sets[measured.has(`${i},${j}`) ? 1 : 0].push([along(bounds.min.x, bounds.max.x, nx, i), along(bounds.min.y, bounds.max.y, ny, j), z]);
      }
    }
    return sets;
  }, [bounds, nx, ny, z, doneKey]);
  const givenKey = given.map(({ x, y }) => `${x},${y}`).join(' ');
  const squares = useMemo(() => given.map(({ x, y }) => [x + offset.x, y + offset.y, z]), [givenKey, offset.x, offset.y, z]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Outline bounds={bounds} color={color} opacity={0.9} pattern={DASHED} />
      <Marks positions={open} shape={RING} color={color} />
      <Marks positions={filled} shape={DOT} color={color} />
      <Marks positions={squares} shape={SQUARE} color={color} size={MARK_PX * 1.9} />
    </>
  );
};

export default MapArea;
