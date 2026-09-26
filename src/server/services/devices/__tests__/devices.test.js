import devices, { MOST, readableAddress } from '..';

afterEach(() => {
  devices.open({});
  devices.removeAllListeners();
});

describe('the devices a server has seen', () => {
  test('are kept by id, with what each says of itself and where it came from', () => {
    devices.seen('a1', { name: 'Android · SM-S918B · Chrome 128', system: 'Android 14', browser: 'Chrome 128', ip: '::ffff:192.168.0.23' });

    expect(devices.all().a1).toMatchObject({ name: 'Android · SM-S918B · Chrome 128', ip: '192.168.0.23', browser: 'Chrome 128' });
  });

  test('what a device does not say is kept from before', () => {
    devices.seen('a1', { name: 'Warsztat', model: 'SM-S918B' });
    devices.seen('a1', { ip: '192.168.0.40' });

    expect(devices.all().a1).toMatchObject({ name: 'Warsztat', model: 'SM-S918B', ip: '192.168.0.40' });
  });

  test('are said to be changed only when a reader would see a difference', () => {
    const changes = jest.fn();
    devices.on('change', changes);

    devices.seen('a1', { name: 'Warsztat', ip: '192.168.0.23' }, new Date('2026-09-26T10:00:00Z'));
    devices.seen('a1', { name: 'Warsztat', ip: '192.168.0.23' }, new Date('2026-09-26T11:00:00Z'));

    expect(changes).toHaveBeenCalledTimes(1);
    expect(devices.all().a1.seen).toBe('2026-09-26T11:00:00.000Z');
  });

  test('keep the most recent ones only', () => {
    for (let i = 0; i < MOST + 5; i++) {
      devices.seen(`d${i}`, { name: `n${i}` }, new Date(Date.UTC(2026, 8, 26, 0, i)));
    }

    expect(Object.keys(devices.all())).toHaveLength(MOST);
    expect(devices.all().d0).toBeUndefined();
    expect(devices.all()[`d${MOST + 4}`]).toBeDefined();
  });

  test('a page of the journal gets the ones it names, and nothing for an unknown id', () => {
    devices.seen('a1', { name: 'Warsztat' });

    expect(devices.describe(['a1', 'x', undefined])).toEqual({ a1: expect.objectContaining({ name: 'Warsztat' }) });
  });

  test('an address is read as a person writes it', () => {
    expect(readableAddress('::ffff:10.0.0.5')).toBe('10.0.0.5');
    expect(readableAddress('::1')).toBe('127.0.0.1');
  });
});
