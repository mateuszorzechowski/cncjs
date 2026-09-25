import { poseBetween } from '../glide';

const FROM = { position: [100, 0, 0], target: [0, 0, 0], zoom: 1 };
const TO = { position: [10, 10, 100], target: [10, 10, 0], zoom: 3 };

const close = (a, b) => a.forEach((n, i) => expect(n).toBeCloseTo(b[i], 9));
const distance = (pose) => Math.hypot(...pose.position.map((n, i) => n - pose.target[i]));

describe('a glide between two poses', () => {
  test('starts where the camera was and ends where the view puts it', () => {
    const start = poseBetween(FROM, TO, 0);
    const end = poseBetween(FROM, TO, 1);

    close(start.position, FROM.position);
    close(start.target, FROM.target);
    expect(start.zoom).toBe(1);
    close(end.position, TO.position);
    close(end.target, TO.target);
    expect(end.zoom).toBe(3);
  });

  test('turns about the target rather than cutting through the part', () => {
    // Both poses a hundred from their target: every pose between is too, so
    // the camera swings round the part instead of passing through it.
    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(distance(poseBetween(FROM, TO, t))).toBeCloseTo(100, 6);
    }
  });

  test('is half way at half time, eased at both ends', () => {
    const half = poseBetween(FROM, TO, 0.5);
    close(half.target, [5, 5, 0]);
    expect(half.zoom).toBeCloseTo(2, 9);

    // Slow to leave: a tenth of the time covers less than a tenth of the zoom.
    expect(poseBetween(FROM, TO, 0.1).zoom - 1).toBeLessThan(0.2);
  });

  test('stays at the end once the time has run out', () => {
    close(poseBetween(FROM, TO, 1.4).position, TO.position);
    close(poseBetween(FROM, TO, -1).position, FROM.position);
  });
});
