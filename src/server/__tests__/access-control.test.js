import { authorizeIPAddress } from '../access-control';

describe('authorizeIPAddress', () => {
  test('lets the house in', async () => {
    await expect(authorizeIPAddress('192.168.0.196')).resolves.toBeUndefined();
    await expect(authorizeIPAddress('::ffff:192.168.0.20')).resolves.toBeUndefined();
  });

  // A phone on the tailnet, from outside the house (2026-10-09).
  test('lets Tailscale addresses in', async () => {
    await expect(authorizeIPAddress('100.101.102.103')).resolves.toBeUndefined();
    await expect(authorizeIPAddress('::ffff:100.64.0.1')).resolves.toBeUndefined();
    await expect(authorizeIPAddress('fd7a:115c:a1e0::1')).resolves.toBeUndefined();
  });

  test('keeps the internet out', async () => {
    await expect(authorizeIPAddress('8.8.8.8')).rejects.toThrow('Unauthorized IP address');
    // Just outside the shared address space on either side.
    await expect(authorizeIPAddress('100.63.255.255')).rejects.toThrow('Unauthorized IP address');
    await expect(authorizeIPAddress('100.128.0.0')).rejects.toThrow('Unauthorized IP address');
  });
});
