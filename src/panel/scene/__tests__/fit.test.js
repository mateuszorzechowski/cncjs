import * as THREE from 'three';
import { TITLED_RULER, boundsBox, currentDirection, fitToBounds, fitWithRulers } from '../fit';
import fitCameraToBounds from '../../../lib/toolpath/camera-fit';

// The frustum is fixed and framing is done with `zoom`, which is how the
// orthographic camera in this scene is driven.
const camera = (aspect = 16 / 9, height = 300) => {
  const c = new THREE.OrthographicCamera(
    -(height * aspect) / 2, (height * aspect) / 2, height / 2, -height / 2, 0.001, 5000
  );
  c.up.set(0, 0, 1);
  return c;
};

// An awkward angle on purpose: nothing axis-aligned, so a fit that quietly
// snapped to a named view would show up as a changed direction.
const OBLIQUE = new THREE.Vector3(37, -61, 23).normalize();

const put = (c, target, distance = 900) => {
  c.position.copy(target).addScaledVector(OBLIQUE, distance);
  c.lookAt(target);
  c.updateMatrixWorld(true);
};

const OBJECT = { min: { x: 100, y: 40, z: -12 }, max: { x: 160, y: 90, z: -2 } };

describe('filling the frame with the object', () => {
  test('keeps the camera pointing the way it already pointed', () => {
    // The whole requirement. Somebody arranged an angle; zooming onto the
    // work is not a request to give it up.
    const c = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(c, target);
    const before = currentDirection(c, target).normalize();

    const center = fitToBounds(c, target, OBJECT);
    const after = currentDirection(c, center).normalize();

    expect(after.angleTo(before)).toBeLessThan(1e-6);
  });

  test('ends up looking at the middle of the object', () => {
    const c = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(c, target);

    const center = fitToBounds(c, target, OBJECT);
    expect(center.x).toBeCloseTo(130, 6);
    expect(center.y).toBeCloseTo(65, 6);
    expect(center.z).toBeCloseTo(-7, 6);
  });

  test('zooms in, rather than merely moving', () => {
    // An orthographic camera does not get closer by moving, so a fit that
    // only repositioned would look identical to no fit at all.
    const c = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(c, target);
    const before = c.zoom;

    fitToBounds(c, target, OBJECT);
    expect(c.zoom).toBeGreaterThan(before);
  });

  test('a smaller object fills the frame harder', () => {
    const big = camera();
    const small = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(big, target);
    put(small, target);

    fitToBounds(big, target, OBJECT);
    fitToBounds(small, target, {
      min: { x: 120, y: 60, z: -9 }, max: { x: 130, y: 70, z: -7 },
    });

    expect(small.zoom).toBeGreaterThan(big.zoom);
  });

  test('the object really is inside the frame afterwards', () => {
    // Direction and zoom are means; this is the end. Every corner has to
    // project inside the normalised view volume.
    const c = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(c, target);

    const center = fitToBounds(c, target, OBJECT);
    c.lookAt(center);
    c.updateMatrixWorld(true);

    const box = boundsBox(OBJECT);
    for (let i = 0; i < 8; i += 1) {
      const corner = new THREE.Vector3(
        (i & 1) ? box.max.x : box.min.x,
        (i & 2) ? box.max.y : box.min.y,
        (i & 4) ? box.max.z : box.min.z
      ).project(c);
      expect(Math.abs(corner.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(corner.y)).toBeLessThanOrEqual(1);
    }
  });

  test('two fits in a row do not creep', () => {
    // The second press has nothing left to do, so it must be a no-op rather
    // than a slow drift towards or away from the work.
    const c = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(c, target);

    const first = fitToBounds(c, target, OBJECT);
    const zoom = c.zoom;
    const second = fitToBounds(c, first, OBJECT);

    expect(c.zoom).toBeCloseTo(zoom, 6);
    expect(second.distanceTo(first)).toBeLessThan(1e-6);
  });
});

describe('framing with room for the rulers', () => {
  const ISO = new THREE.Vector3(1, -1, 1).normalize();
  // The octocat: a hundred millimetres square and thirty-seven tall.
  const TALL = boundsBox({ min: { x: 0, y: 0, z: 0.2 }, max: { x: 100, y: 100, z: 37.4 } });
  const RULERS = 62;

  /*
   * Where the figures stand from the default view: along the two edges
   * nearest the camera, the front (min Y) and the right (max X), each with a
   * row of figures and its axis title outside it.
   */
  const rulerCorners = (box, room) => [
    [box.max.x + (TITLED_RULER * room), box.min.y - (TITLED_RULER * room)],
    [box.min.x, box.min.y - (TITLED_RULER * room)],
    [box.max.x + (TITLED_RULER * room), box.max.y],
  ].map(([x, y]) => new THREE.Vector3(x, y, box.min.z));

  test.each([
    ['a tall part', TALL],
    ["COM3's travel", boundsBox({ min: { x: -1000, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } })],
  ])('leaves room on the floor where the rulers stand, inside the frame: %s', (_, box) => {
    const c = camera(4 / 3, 244);
    fitWithRulers(c, box, ISO, RULERS);
    c.updateMatrixWorld(true);

    const room = (RULERS * 0.95) / c.zoom;
    rulerCorners(box, room).forEach((corner) => {
      const p = corner.project(c);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1);
    });
  });

  test('frames a tall part larger than a margin all round would', () => {
    const c = camera(4 / 3, 600);
    fitWithRulers(c, TALL, ISO, RULERS);

    // The same room as a margin of screen pixels on every side, as it was
    // first done.
    const margin = camera(4 / 3, 600 - (2 * TITLED_RULER * RULERS));
    fitCameraToBounds(margin, TALL, ISO);

    expect(c.zoom).toBeGreaterThan(margin.zoom * 1.15);
  });

  test('with no rulers, is the plain fit', () => {
    const plain = camera();
    const ruled = camera();
    fitCameraToBounds(plain, TALL, ISO);
    fitWithRulers(ruled, TALL, ISO, 0);

    expect(ruled.zoom).toBeCloseTo(plain.zoom, 9);
  });
});
