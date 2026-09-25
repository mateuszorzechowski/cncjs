import * as THREE from 'three';
import { MAX_POLAR, MIN_POLAR, orbitAbout, polarOf } from '../pivotOrbit';

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
