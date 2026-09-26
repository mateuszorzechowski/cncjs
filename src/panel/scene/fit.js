import * as THREE from 'three';
// A relative path rather than the `lib/` alias the rest of the scene uses:
// Jest has no module mapping for it, and arithmetic that cannot be imported
// into a test is arithmetic nobody checks. Webpack resolves both.
import fitCameraToBounds from '../../lib/toolpath/camera-fit';
import { nearSides } from './grid-numbers';

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
 * Only on the sides that have figures — `nearSides`, the rule the grid
 * draws them by: the two edges nearest the camera, each with its row of
 * figures and its axis title outside it. Widened all round, the back of the
 * floor rose above a tall part's top and took the room back.
 *
 * Pixels on screen are millimetres over the zoom, and the zoom depends on
 * the room, so the fit is taken a few times until it settles. Returns what
 * the last fit returns: the point the camera looks at.
 */
export const RULER_FIT_PASSES = 3;

/**
 * The room a ruler and its axis title take, in rulers: the gap and a row of
 * figures, then a third of a figure of air and the title — about 1.3 times
 * what the figures alone took (`GridLabels`). Twice was measured too much:
 * the calibration file came out a quarter of a 360px preview.
 */
export const TITLED_RULER = 1.3;

export const fitWithRulers = (camera, box, direction, rulerPixels) => {
  const { outX, outY } = nearSides(box, direction);
  let target = fitCameraToBounds(camera, box, direction);
  // A row of figures and a title outside it, and the fit takes longer to
  // settle on the larger room.
  for (let i = 1; i < 2 * RULER_FIT_PASSES; i++) {
    const room = TITLED_RULER * (rulerPixels / camera.zoom);
    const widen = (side, out) => (side === out ? room : 0);
    const floor = new THREE.Box3(
      new THREE.Vector3(box.min.x - widen(-1, outX), box.min.y - widen(-1, outY), box.min.z),
      new THREE.Vector3(box.max.x + widen(1, outX), box.max.y + widen(1, outY), box.min.z)
    );
    target = fitCameraToBounds(camera, box.clone().union(floor), direction);
  }
  return target;
};

export default fitToBounds;
