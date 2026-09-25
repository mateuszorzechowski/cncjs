import * as THREE from 'three';

/*
 * The limits of the turntable, the same as the orbit controls had: a hair
 * short of straight down, and the horizon — never under the bed.
 */
export const MIN_POLAR = 0.01;
export const MAX_POLAR = Math.PI / 2;

const Z = new THREE.Vector3(0, 0, 1);

/** How far from straight down the camera is looking at `target` from. */
export const polarOf = (position, target) => {
  const offset = position.clone().sub(target);
  return Math.acos(Math.min(1, Math.max(-1, offset.z / offset.length())));
};

const turn = (point, pivot, rotation) => point.clone().sub(pivot).applyQuaternion(rotation).add(pivot);

/**
 * Turn the view about a point, keeping that point where it is on screen.
 *
 * *"Rotacja wokół punktu, gdzie kliknąłem myszą"* (Mateusz, 2026-09-25). The
 * orbit controls turn about their target, which a view button sets to the
 * middle of the machine; zoomed into a corner 500 mm away, a degree of turn
 * swung what was being looked at by about 9 mm — a fifth of a 50 mm view per
 * degree. Turning about the point under the pointer instead, what was
 * grabbed stays under the pointer at any zoom.
 *
 * The camera and its target are carried round the pivot together, rigidly,
 * so the camera still looks at its target and the orbit controls — still
 * doing the pan and the zoom — agree with where it ended up.
 *
 * @param {object} args
 * @param {THREE.Vector3} args.position The camera.
 * @param {THREE.Vector3} args.target What it looks at.
 * @param {THREE.Vector3} args.pivot What to turn about.
 * @param {number} args.theta Radians about the machine's Z.
 * @param {number} args.phi Radians further from straight down (clamped).
 * @returns {{ position: THREE.Vector3, target: THREE.Vector3 }}
 */
export const orbitAbout = ({ position, target, pivot, theta, phi }) => {
  // About Z first: the turntable.
  const aboutZ = new THREE.Quaternion().setFromAxisAngle(Z, theta);
  let p = turn(position, pivot, aboutZ);
  let t = turn(target, pivot, aboutZ);

  // Then over the top: about the horizontal axis square to the view. A turn
  // about Z × offset by +a takes the offset a further from Z.
  const was = polarOf(p, t);
  const wanted = Math.min(MAX_POLAR, Math.max(MIN_POLAR, was + phi));
  const offset = p.clone().sub(t);
  const axis = Z.clone().cross(offset);
  if (axis.lengthSq() > 1e-12 && wanted !== was) {
    const over = new THREE.Quaternion().setFromAxisAngle(axis.normalize(), wanted - was);
    p = turn(p, pivot, over);
    t = turn(t, pivot, over);
  }

  return { position: p, target: t };
};

export default orbitAbout;

/**
 * The point a turn is about, for a ray from the pointer.
 *
 * In order: the drawn path it touched (`hit`); else, when it passes through
 * the program's box, the middle of its run inside — *"trafiam w otwór między
 * ścieżkami"* (Mateusz, 2026-09-25): a pocket's hole is still the part, not
 * the floor under it, which can be 150 mm lower and turned the part on a
 * long arm; else the machine's floor; else the target's depth along the ray.
 *
 * @param {object} args
 * @param {THREE.Ray} args.ray From the pointer, into the scene.
 * @param {THREE.Vector3|null} args.hit Where it touched the path, if it did.
 * @param {THREE.Box3|null} args.box The program, where it is drawn.
 * @param {number|null} args.floor The floor's Z.
 * @param {THREE.Vector3} args.target What the camera looks at.
 */
export const pivotFor = ({ ray, hit, box, floor, target }) => {
  if (hit) {
    return hit.clone();
  }

  if (box && !box.isEmpty()) {
    const entry = ray.intersectBox(box, new THREE.Vector3());
    if (entry) {
      // Back along the ray from well past the box, to find where it leaves.
      const beyond = entry.clone().addScaledVector(ray.direction, box.getSize(new THREE.Vector3()).length() * 2 + 1);
      const exit = new THREE.Ray(beyond, ray.direction.clone().negate()).intersectBox(box, new THREE.Vector3());
      return exit ? entry.add(exit).multiplyScalar(0.5) : entry;
    }
  }

  if (Number.isFinite(floor)) {
    const onFloor = ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -floor), new THREE.Vector3());
    if (onFloor) {
      return onFloor;
    }
  }

  return ray.closestPointToPoint(target, new THREE.Vector3());
};
