import { installationTimings, travelParts } from '../timings';

const SETTINGS = { settings: { $120: '500', $121: '500', $122: '300' } };
const SERVER = { leadMs: 46, ackMs: 7, stopMs: 53 };

const parts = ({ linkMs = 0, xySpeed = 1500, zSpeed = 600, settings = SETTINGS } = {}) => (
  travelParts({
    timings: installationTimings({ timing: SERVER, linkMs }),
    settings,
    xySpeed,
    zSpeed,
  })
);

describe('the millimetres those milliseconds cost', () => {
  test('each part is the travel it allows at the feed in use', () => {
    // `v * dt`, and nothing more: the machine is still going at the feed it
    // was given for the whole of it. 1500 mm/min is 25 mm/s.
    const travel = parts({ linkMs: 79 });

    expect(travel.linkMm).toBeCloseTo(1.975, 3);
    expect(travel.queueMm).toBeCloseTo(1.15, 3);
    expect(travel.replyMm).toBeCloseTo(0.175, 3);
  });

  test('braking is the machine own, and is not a delay', () => {
    // `v² / 2a` — the part no faster computer and no shorter cable removes.
    // 25 mm/s against 500 mm/s² is 0.625mm.
    expect(parts().brakingMm).toBeCloseTo(0.625, 3);
  });

  test('the worse of the two feeds decides, not one of them', () => {
    /*
     * A key on either pad produces this, and a sheet that quoted the gentler
     * of the two would be understating a distance somebody is about to put a
     * hand near. Which group it is decides the acceleration as well, so the
     * braking belongs to the same move rather than to an average.
     */
    const fastZ = parts({ xySpeed: 600, zSpeed: 2000 });

    expect(fastZ.feedrate).toBe(2000);
    expect(fastZ.overZ).toBe(false);
    // Z accelerates at 300, not the 500 of X and Y.
    expect(fastZ.brakingMm).toBeCloseTo(((2000 / 60) ** 2) / 600, 6);
  });

  test('a server on this computer costs no distance, and an untimed link none that is known', () => {
    /*
     * Two different answers, and the second is not nought. `Number(null)` is,
     * which is how a pendant that had never held a jog came to report a
     * perfect `0 ms` — the same coercion, one module along.
     */
    expect(parts({ linkMs: 0 }).linkMm).toBe(0);
    expect(parts({ linkMs: null }).linkMm).toBeNull();
  });

  test('and nothing is claimed when the machine has not said how it stops', () => {
    // No `$120`-`$122` is no honest braking figure, and half of a stopping
    // distance reads as a safety margin that has not been measured.
    expect(parts({ settings: {} }).brakingMm).toBeNull();
  });
});
