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
 * `dashed`, then, only for the one box that is a size without a place — a
 * machine that is not homed (`envelope.placed` false, see `Scene`) — and the
 * distances computed on the object right here, before the first frame, so it
 * cannot come out solid by accident.
 *
 * A box with no extent on an axis is drawn, not skipped. A program milled at
 * one depth has zero height, and a rectangle lying in the bed is the truthful
 * picture of it.
 */
// Dash and gap as a share of the box's longest side, so a bench and a router read alike.
const DASH_SHARE = 1 / 60;

const Outline = ({ bounds, color, opacity = 1, dashed = false }) => {
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
    if (dashed && line.current) {
      line.current.computeLineDistances();
    }
  }, [dashed, geometry]);
  const dash = Math.max(
    bounds.max.x - bounds.min.x,
    bounds.max.y - bounds.min.y,
    bounds.max.z - bounds.min.z
  ) * DASH_SHARE;

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
      {dashed
        ? <lineDashedMaterial color={color} transparent opacity={opacity} dashSize={dash} gapSize={dash} />
        : <lineBasicMaterial color={color} transparent opacity={opacity} />}
    </lineSegments>
  );
};

export default Outline;
