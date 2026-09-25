import * as THREE from 'three';

/**
 * A camera carried from one pose to another rather than cut to it.
 *
 * For the Pliki preview, which goes back to its framing by itself after it
 * has been turned and let go (Mateusz, 2026-09-25): a jump would read as the
 * preview resetting, a glide reads as the preview going home.
 *
 * The target and the zoom move in a straight line; the camera's offset from
 * the target turns on the shortest arc (a slerp) and changes length in a
 * straight line, so the part stays in the middle of the turn instead of the
 * camera cutting through it. Eased in and out.
 */

/** A pose as plain numbers: `{ position, target, zoom }`, arrays of three. */
export const poseOf = (camera, target) => ({
  position: camera.position.toArray(),
  target: target.toArray(),
  zoom: camera.zoom,
});

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

/** The pose `t` of the way from `from` to `to`, `t` in [0, 1]. */
export const poseBetween = (from, to, t) => {
  const k = ease(Math.min(1, Math.max(0, t)));
  const target0 = new THREE.Vector3().fromArray(from.target);
  const target1 = new THREE.Vector3().fromArray(to.target);
  const offset0 = new THREE.Vector3().fromArray(from.position).sub(target0);
  const offset1 = new THREE.Vector3().fromArray(to.position).sub(target1);
  const length = offset0.length() + (offset1.length() - offset0.length()) * k;

  const turn = new THREE.Quaternion().setFromUnitVectors(offset0.clone().normalize(), offset1.clone().normalize());
  const direction = offset0.clone().normalize().applyQuaternion(new THREE.Quaternion().slerp(turn, k));
  const target = target0.lerp(target1, k);

  return {
    position: target.clone().add(direction.multiplyScalar(length)).toArray(),
    target: target.toArray(),
    zoom: from.zoom + (to.zoom - from.zoom) * k,
  };
};

/**
 * Play the glide on a camera and its orbit controls, a frame at a time.
 * Returns a function that stops it where it is — for a hand that takes the
 * camera again half way.
 */
export const glide = ({ camera, orbit, from, to, ms, invalidate }) => {
  const start = performance.now();
  let frame = 0;

  const step = (now) => {
    const t = (now - start) / ms;
    const pose = poseBetween(from, to, t);
    camera.position.fromArray(pose.position);
    camera.zoom = pose.zoom;
    camera.updateProjectionMatrix();
    orbit.target.fromArray(pose.target);
    orbit.update();
    invalidate();
    if (t < 1) {
      frame = requestAnimationFrame(step);
    }
  };
  frame = requestAnimationFrame(step);

  return () => cancelAnimationFrame(frame);
};
