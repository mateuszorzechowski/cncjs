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

  test('with no change of zoom, is half way at half time, eased at both ends', () => {
    const level = { ...TO, zoom: 1 };
    const half = poseBetween(FROM, level, 0.5);
    close(half.target, [5, 5, 0]);

    // Slow to leave: a tenth of the time covers less than a tenth of the way.
    expect(poseBetween(FROM, level, 0.1).target[0]).toBeLessThan(1);
  });

  test('zooms by the same ratio at every step, so half time is the geometric middle', () => {
    expect(poseBetween(FROM, TO, 0.5).zoom).toBeCloseTo(Math.sqrt(1 * 3), 9);
  });

  test('pans at an even speed on screen while the zoom grows, not in a rush at the end', () => {
    // From far out (zoom 0.1) to 1 across 100 mm. Screen speed is the target's
    // speed in millimetres times the zoom; sample it and compare the end of
    // the glide with its middle — in a straight line it was ten times faster.
    const far = { position: [100, 0, 100], target: [0, 0, 0], zoom: 0.1 };
    const home = { position: [200, 0, 100], target: [100, 0, 0], zoom: 1 };
    const screenSpeed = (t) => {
      const a = poseBetween(far, home, t);
      const b = poseBetween(far, home, t + 0.001);
      return (Math.abs(b.target[0] - a.target[0]) / 0.001) * a.zoom;
    };
    // Eased, so compare points the easing treats alike: a quarter in, a quarter out.
    expect(screenSpeed(0.75) / screenSpeed(0.25)).toBeCloseTo(1, 1);
  });

  test('stays at the end once the time has run out', () => {
    close(poseBetween(FROM, TO, 1.4).position, TO.position);
    close(poseBetween(FROM, TO, -1).position, FROM.position);
  });
});
