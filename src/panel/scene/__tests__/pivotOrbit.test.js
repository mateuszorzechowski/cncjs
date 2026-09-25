import * as THREE from 'three';
import { MAX_POLAR, MIN_POLAR, orbitAbout, pivotFor, polarOf } from '../pivotOrbit';

const Z = new THREE.Vector3(0, 0, 1);

// Where a point lands on screen: its offset from the camera along the
// camera's own right and up, the camera looking from `position` at `target`
// with Z up — what an orthographic view draws.
const onScreen = (point, position, target) => {
  const forward = target.clone().sub(position).normalize();
  const right = forward.clone().cross(Z).normalize();
  const up = right.clone().cross(forward).normalize();
  const d = point.clone().sub(position);
  return [d.dot(right), d.dot(up)];
};

const v = (x, y, z) => new THREE.Vector3(x, y, z);

describe('turning the view about a point', () => {
  const position = v(300, -400, 500);
  const target = v(0, 0, 0);
  // A corner of the part, well away from the target: the case that made
  // turning a zoomed view throw the work off screen.
  const pivot = v(-120, 80, -10);

  test('keeps the point where it is on screen', () => {
    const before = onScreen(pivot, position, target);
    const after = orbitAbout({ position, target, pivot, theta: 0.4, phi: -0.2 });
    const moved = onScreen(pivot, after.position, after.target);

    expect(moved[0]).toBeCloseTo(before[0], 6);
    expect(moved[1]).toBeCloseTo(before[1], 6);
  });

  test('turns by the angles asked, with Z still up', () => {
    const after = orbitAbout({ position, target, pivot, theta: 0.3, phi: 0.1 });
    expect(polarOf(after.position, after.target)).toBeCloseTo(polarOf(position, target) + 0.1, 6);

    const bearing = (p, t) => Math.atan2(p.y - t.y, p.x - t.x);
    expect(bearing(after.position, after.target)).toBeCloseTo(bearing(position, target) + 0.3, 6);
  });

  test('never below the bed, never through the pole', () => {
    const low = orbitAbout({ position, target, pivot, theta: 0, phi: 3 });
    expect(polarOf(low.position, low.target)).toBeCloseTo(MAX_POLAR, 6);

    const high = orbitAbout({ position, target, pivot, theta: 0, phi: -3 });
    expect(polarOf(high.position, high.target)).toBeCloseTo(MIN_POLAR, 6);
  });

  test('keeps the distance to what it looks at', () => {
    const after = orbitAbout({ position, target, pivot, theta: 1.1, phi: 0.3 });
    expect(after.position.distanceTo(after.target)).toBeCloseTo(position.distanceTo(target), 6);
  });

  test('about the target itself, is the plain orbit: the target stays put', () => {
    const after = orbitAbout({ position, target, pivot: target.clone(), theta: 0.5, phi: 0.2 });
    expect(after.target.distanceTo(target)).toBeCloseTo(0, 6);
  });
});

describe('where a turn is about', () => {
  // Looking straight down at the table from above the part.
  const down = () => new THREE.Ray(v(5, 5, 1000), v(0, 0, -1));
  // A 10 mm part, 2 mm deep, standing on a floor 150 mm below its top.
  const part = new THREE.Box3(v(0, 0, -2), v(10, 10, 0));
  const target = v(0, 0, 0);

  test('the path, when the pointer is on it', () => {
    expect(pivotFor({ ray: down(), hit: v(5, 5, -1), box: part, floor: -150, target })).toEqual(v(5, 5, -1));
  });

  test('inside the part, when the pointer is over it but between its paths', () => {
    // *"Czy trafiam w płaszczyznę, ale w ramach modelu — np. w otwór między
    // ścieżkami?"* (2026-09-25): a hole in a pocket is still the part, not the
    // floor 150 mm under it.
    expect(pivotFor({ ray: down(), hit: null, box: part, floor: -150, target })).toEqual(v(5, 5, -1));
  });

  test('the floor, beside the part', () => {
    const beside = new THREE.Ray(v(50, 50, 1000), v(0, 0, -1));
    expect(pivotFor({ ray: beside, hit: null, box: part, floor: -150, target })).toEqual(v(50, 50, -150));
  });

  test('the target\'s depth, when the ray meets nothing', () => {
    const level = new THREE.Ray(v(-500, 3, 0), v(1, 0, 0));
    const got = pivotFor({ ray: level, hit: null, box: null, floor: -150, target: v(20, 0, 0) });
    expect(got.x).toBeCloseTo(20, 6);
    expect(got.y).toBeCloseTo(3, 6);
  });
});
