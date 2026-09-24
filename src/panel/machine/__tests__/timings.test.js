import { LINK_WORTH_SHOWING_MS, installationTimings } from '../timings';

// As the server sends it. `tickMs` and `stopMs` are in the payload and are
// not shown: the queue below is derived from the first, and what the second
// adds up to is on the table above this block, in millimetres.
const SERVER = { tickMs: 24, leadMs: 48, ackMs: 12, stopMs: 60 };

describe('how fast this installation is', () => {
  test('carries each part through as the side that measured it gave it', () => {
    // Nothing here is derived from anything else. A
    // long queue is a busy server, a slow reply is the cable, a slow link is a
    // server across a workshop — and one total says none of that.
    const timings = installationTimings({ timing: SERVER, linkMs: 0, beatMs: 111 });

    expect(timings).toMatchObject({ leadMs: 48, ackMs: 12, beatMs: 111 });
  });

  test('says nothing rather than nought for anything unmeasured', () => {
    /*
     * "Not measured yet" and "nothing" are different answers, and a panel that
     * wrote `0 ms` for the first would be showing a measurement that never
     * happened. Every one of these is null until the side that owns it says.
     */
    const timings = installationTimings({});

    expect(timings).toEqual({
      beatMs: null,
      linkMs: null,
      linkKnown: false,
      linkMatters: false,
      leadMs: null,
      ackMs: null,
    });
  });

  test('and a null is not a nought, which is how one reached the screen', () => {
    /*
     * `Number(null)` is 0, so the coercion on its own reported a pendant that
     * had never held a jog as having managed a perfect gap of `0 ms`. The
     * cases above had missed it by leaving the field out rather than setting
     * it — which is not what `useMachine` does.
     */
    expect(installationTimings({ timing: SERVER, linkMs: null, beatMs: null }))
      .toMatchObject({ beatMs: null, linkMs: null, linkKnown: false });
  });

  test('a link that has not been timed is not a server on this computer', () => {
    // Two different facts, and only one of them is a measurement.
    expect(installationTimings({ timing: SERVER, linkMs: null }).linkKnown).toBe(false);
    expect(installationTimings({ timing: SERVER, linkMs: 0 }).linkKnown).toBe(true);
  });

  test('a server on this computer is not a link worth naming', () => {
    /*
     * It measures as a fraction of a millisecond, and rounding that up to
     * "1 ms to the server" is noise dressed up as a finding. The common case
     * is one machine doing both.
     */
    expect(installationTimings({ timing: SERVER, linkMs: 0.4 }).linkMatters).toBe(false);
    expect(installationTimings({ timing: SERVER, linkMs: 1 }).linkMatters).toBe(false);
    expect(installationTimings({
      timing: SERVER, linkMs: LINK_WORTH_SHOWING_MS,
    }).linkMatters).toBe(true);
  });
});
