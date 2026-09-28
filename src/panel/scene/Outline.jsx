import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * A box drawn as twelve edges.
 *
 * Every outline on this screen is one of these: the machine's reach, the
 * extents of the loaded program. `EdgesGeometry` rather than a wireframe
 * material, because a wireframe draws the triangles a box is made of and puts
 * a diagonal across all six faces.
 *
 * Emphasis is opacity and nothing else. A dashed line would have been the
 * obvious way to say "faint", and `lineDashedMaterial` needs line distances
 * computed on the object before it draws anything at all — a line that
 * silently comes out solid, or does not come out. Opacity says the same thing
 * and cannot fail quietly.
 *
 * `pattern`, then, only for the machine's own box, and only to say how much
 * is known of it (see `Scene`): `dashed`, long dashes, where it is but nothing
 * stops a move at its edge; `dotted` where only its size is known. The
 * distances are computed on the object right here, before the first frame, so
 * a pattern cannot come out solid by accident.
 *
 * A box with no extent on an axis is drawn, not skipped. A program milled at
 * one depth has zero height, and a rectangle lying in the bed is the truthful
 * picture of it.
 */
// Dash and gap as shares of the box's longest side, so a bench and a router read alike.
const PATTERNS = {
  dashed: { dash: 1 / 40, gap: 1 / 80 },
  dotted: { dash: 1 / 400, gap: 1 / 110 },
};

const Outline = ({ bounds, color, opacity = 1, pattern = 'solid' }) => {
  const shares = PATTERNS[pattern];
  const line = useRef(null);
  const geometry = useMemo(() => {
    const box = new THREE.BoxGeometry(
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y,
      bounds.max.z - bounds.min.z
    );
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();

    return edges;
  }, [bounds]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    if (shares && line.current) {
      line.current.computeLineDistances();
    }
  }, [shares, geometry]);
  const longest = Math.max(
    bounds.max.x - bounds.min.x,
    bounds.max.y - bounds.min.y,
    bounds.max.z - bounds.min.z
  );

  return (
    <lineSegments
      ref={line}
      geometry={geometry}
      position={[
        (bounds.min.x + bounds.max.x) / 2,
        (bounds.min.y + bounds.max.y) / 2,
        (bounds.min.z + bounds.max.z) / 2,
      ]}
    >
      {shares
        ? <lineDashedMaterial color={color} transparent opacity={opacity} dashSize={longest * shares.dash} gapSize={longest * shares.gap} />
        : <lineBasicMaterial color={color} transparent opacity={opacity} />}
    </lineSegments>
  );
};

export default Outline;
