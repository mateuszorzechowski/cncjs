import * as THREE from 'three';
// A relative path rather than the `lib/` alias the rest of the scene uses:
// Jest has no module mapping for it, and arithmetic that cannot be imported
// into a test is arithmetic nobody checks. Webpack resolves both.
import fitCameraToBounds from '../../lib/toolpath/camera-fit';
import { nearSides, rulerSides } from './grid-numbers';

/**
 * Framing one object without turning the camera.
 *
 * The view buttons answer "look at it from there". This answers the other
 * question an operator has in front of a program — "fill the frame with
 * **this**" — and the difference is that it must not move the camera round
 * the object. Somebody has arranged an angle they want; zooming in on the
 * work is not a request to lose it.
 *
 * So the direction is read back off the camera rather than taken from a named
 * view: where it is now, relative to what it is orbiting, **is** the
 * orientation to keep. Everything else — how far back, and the zoom that
 * makes the box fill the frame — is what `fitCameraToBounds` already works
 * out for the view buttons, so this is the same fit from a different
 * direction rather than a second way of framing things.
 */
export const boundsBox = (bounds) => new THREE.Box3(
  new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
  new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
);

/**
 * The way the camera is currently looking, as a vector pointing from the
 * subject back towards the camera — which is the direction `fitCameraToBounds`
 * takes.
 *
 * Degenerate only if the camera sits exactly on its own target, which orbit
 * controls do not allow; the fit normalises it anyway.
 */
export const currentDirection = (camera, target) => new THREE.Vector3()
  .subVectors(camera.position, target);

/**
 * @returns {THREE.Vector3} The new orbit target — the centre of what was
 *   framed, so the view rotates about the object from now on.
 */
export const fitToBounds = (camera, target, bounds) => fitCameraToBounds(
  camera,
  boundsBox(bounds),
  currentDirection(camera, target)
);

/**
 * Frame `box` from `direction` with room on the floor for the grid's
 * figures, which stand `rulerPixels` outside the floor's edges at a fixed
 * size on screen.
 *
 * The room is added to the floor rather than around the whole frame. A
 * margin of screen pixels on every side took half of a small preview for
 * figures that stand on two sides at most, and a tall part — whose top, not
 * its floor, is what meets the frame above — came out small (the octocat,
 * Mateusz, 2026-09-25). Widening the floor makes room exactly where the
 * figures are and nowhere a taller part already reaches.
 *
 * Only on the sides that have figures — `rulerSides`, the rule the grid
 * draws them by: the side of Y the X figures run along, and in X the side
 * the Y figures run along and the far end of the X ruler, where the unit
 * is. Widened all round, the back of the floor rose above a tall part's top
 * and took the room back.
 *
 * Pixels on screen are millimetres over the zoom, and the zoom depends on
 * the room, so the fit is taken a few times until it settles. Returns what
 * the last fit returns: the point the camera looks at.
 */
export const RULER_FIT_PASSES = 3;

export const fitWithRulers = (camera, box, direction, rulerPixels, rulers = 'zero') => {
  const near = rulers === 'near';
  const sides = near ? nearSides(box, direction) : rulerSides(box);
  const { outX, outY } = sides;
  // Where the unit goes: the far figure of the X ruler, or — along the
  // nearest edges — the X title, past the end away from the corner.
  const farX = near
    ? (sides.axisX === box.max.x ? -1 : 1)
    : (Math.abs(box.min.x) > Math.abs(box.max.x) ? -1 : 1);
  // And the Y title, past the far end of the Y ruler.
  let farY = 0;
  if (near) {
    farY = sides.axisY === box.min.y ? 1 : -1;
  }
  let target = fitCameraToBounds(camera, box, direction);
  // The titles ask for more room, and the fit takes longer to settle on it.
  const passes = near ? 2 * RULER_FIT_PASSES : RULER_FIT_PASSES;
  for (let i = 1; i < passes; i++) {
    const room = rulerPixels / camera.zoom;
    const widen = (side, out) => (side === out ? room : 0);
    // A title is a word and a unit past the end figure: twice the room.
    const title = (side, out) => (near && side === out ? 2 * room : widen(side, out));
    const floor = new THREE.Box3(
      new THREE.Vector3(
        box.min.x - Math.max(widen(-1, outX), title(-1, farX)),
        box.min.y - Math.max(widen(-1, outY), title(-1, farY)),
        box.min.z
      ),
      new THREE.Vector3(
        box.max.x + Math.max(widen(1, outX), title(1, farX)),
        box.max.y + Math.max(widen(1, outY), title(1, farY)),
        box.min.z
      )
    );
    target = fitCameraToBounds(camera, box.clone().union(floor), direction);
  }
  return target;
};

export default fitToBounds;
