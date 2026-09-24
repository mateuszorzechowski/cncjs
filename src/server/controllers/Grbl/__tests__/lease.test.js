import { LEASE_MS, leaseHolder, motionRefusal, renewed } from '../lease';

const PENDANT = 'device-a';
const PHONE = 'device-b';

describe('who holds movement', () => {
  test('is whoever last moved the machine, until it runs out', () => {
    const lease = renewed(PENDANT, 1000);

    expect(leaseHolder(lease, 1000)).toBe(PENDANT);
    expect(leaseHolder(lease, 1000 + LEASE_MS - 1)).toBe(PENDANT);
    expect(leaseHolder(lease, 1000 + LEASE_MS)).toBeNull();
  });

  test('is nobody before anybody has moved anything', () => {
    // The state a controller starts in, and the state it comes back to. Both
    // have to read as "free", not as "held by nothing", or the comparison in
    // `motionRefusal` would hand the machine to whoever asked first.
    expect(leaseHolder(null, 1000)).toBeNull();
    expect(leaseHolder({ device: null, until: 0 }, 1000)).toBeNull();
  });
});

describe('whether this device may move the machine', () => {
  test('yes, when nobody else has for a moment', () => {
    expect(motionRefusal({ lease: null, device: PENDANT, now: 1000 })).toBeNull();
    expect(motionRefusal({
      lease: renewed(PHONE, 1000),
      device: PENDANT,
      now: 1000 + LEASE_MS,
    })).toBeNull();
  });

  test('yes, to the device that is already driving', () => {
    // The ordinary case, and the one that happens a hundred times a second
    // while a key is held: a lease is a claim by somebody, not a lock against
    // everybody.
    expect(motionRefusal({
      lease: renewed(PENDANT, 1000),
      device: PENDANT,
      now: 1100,
    })).toBeNull();
  });

  test('no, while another device is driving', () => {
    expect(motionRefusal({
      lease: renewed(PHONE, 1000),
      device: PENDANT,
      now: 1100,
    })).toBe('held-elsewhere');
  });

  test('no, to a client with no identity, while another holds it', () => {
    // A client that sends none gets its socket id from `CNCEngine`, so this is
    // really about the null never leaking through. Two nulls comparing equal
    // would make every unidentified client the same device as every other.
    expect(motionRefusal({
      lease: renewed(PHONE, 1000),
      device: null,
      now: 1100,
    })).toBe('held-elsewhere');
  });
});
