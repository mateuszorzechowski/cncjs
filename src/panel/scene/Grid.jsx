import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import GridLabels from './GridLabels';
import { buildGrid, buildSubGrid, fineStep } from './grid-lines';

/**
 * The ground the rest of the scene stands on.
 *
 * Without it this screen was a wireframe box floating in an empty colour, and
 * two things were wrong that did not look like the same problem. The drawing
 * read as too small for its card — an isometric cube is 0.87 as wide as it is
 * tall, so in a landscape viewport a correct fit still leaves half the width
 * empty, and with nothing in that space it reads as a mistake. And rotating
 * was disorienting, because there was no fixed thing to rotate *against*: the
 * only reference on screen was the object being moved.
 *
 * A grid answers both. It fills the frame without adding anything to read, and
 * it is the horizon that says which way the view has been turned.
 *
 * **Sized to the machine and then some, and faded rather than cut.** It is the
 * floor, not the table: stopping it dead at the edge of the travel drew a
 * rectangle nobody asked for, and made the machine look like it was standing
 * on a slab exactly its own size. The alpha rides on the vertices, because a
 * material has one opacity for the whole draw and that is the hard edge being
 * replaced.
 *
 * Laid at the floor of whatever is being shown, so it sits under the toolpath
 * rather than through the middle of it.
 */
/**
 * The finer lines, faded in once a square is large enough to hold them.
 *
 * **Opacity rather than mounting and unmounting.** The geometry is built once
 * and the weight is what changes, so the sub-grid arrives as a wash rather
 * than appearing all at once at a threshold nobody crossed deliberately.
 *
 * The numbers are pixels of a fine square on screen: nothing below about
 * fourteen reads as a grid rather than as a texture, and by twice that it is
 * fully there.
 */
const FINE_MIN_PIXELS = 14;
const FINE_FULL_PIXELS = 34;
const FINE_OPACITY = 0.1;

const SubGrid = ({ area, z, color, step, coarse }) => {
  const material = useRef(null);
  const geometry = useMemo(
    () => buildSubGrid(area, z, color, step, coarse),
    [area, z, color, step, coarse]
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ camera }) => {
    if (!material.current) {
      return;
    }
    const pixels = step * camera.zoom;
    const t = Math.min(1, Math.max(0,
      (pixels - FINE_MIN_PIXELS) / (FINE_FULL_PIXELS - FINE_MIN_PIXELS)));
    material.current.opacity = t * FINE_OPACITY;
    material.current.visible = t > 0;
  });

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial ref={material} vertexColors transparent opacity={0} depthWrite={false} />
    </lineSegments>
  );
};

/*
 * No line here writes depth. They are faint and they lie under everything,
 * so there is nothing for them to hide — and writing it hid the grid from
 * itself: seen edge-on, from the front or the side, every line collapses onto
 * one row of pixels, and the nearest one — out in the fade, all but
 * transparent — won the depth test and blocked the rest. The floor came out
 * at 216 against a ground of 247, where from the side it was 133. Measured
 * 2026-09-25, when the plane could not be seen in a side view.
 */
const Grid = ({ area, z, color, ends }) => {
  const endX = ends?.x;
  const endY = ends?.y;
  const { lines, axes, step } = useMemo(
    () => buildGrid(area, z, color, { x: endX, y: endY }),
    [area, z, color, endX, endY]
  );
  const fine = fineStep(step);

  useEffect(() => () => {
    lines.dispose();
    axes.dispose();
  }, [lines, axes]);

  return (
    <>
      <lineSegments geometry={lines}>
        {/* Faint on purpose — a workspace full of grid lines has to recede
          * rather than compete with the toolpath drawn on top of it. The
          * opacity here is the weight of the whole set; the fade towards the
          * edges is multiplied into it from the vertices. */}
        <lineBasicMaterial vertexColors transparent opacity={0.16} depthWrite={false} />
      </lineSegments>

      {fine ? (
        <SubGrid area={area} z={z} color={color} step={fine} coarse={step} />
      ) : null}

      <lineSegments geometry={axes}>
        <lineBasicMaterial vertexColors transparent opacity={0.5} depthWrite={false} />
      </lineSegments>

      <GridLabels area={area} step={step} z={z} color={color} />
    </>
  );
};

export default Grid;
