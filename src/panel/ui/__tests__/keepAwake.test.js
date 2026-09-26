import { wakeSupport } from '../keepAwake';

describe('whether this page can keep the screen on', () => {
  const lock = { request: () => {} };

  test('over HTTPS, with the API: yes', () => {
    expect(wakeSupport({ secure: true, wakeLock: lock })).toBe('ok');
  });

  test('over plain HTTP the browser withholds it, and that is what the row says', () => {
    expect(wakeSupport({ secure: false, wakeLock: null })).toBe('insecure');
    // Even if something put it there: an insecure page is the reason to give.
    expect(wakeSupport({ secure: false, wakeLock: lock })).toBe('insecure');
  });

  test('a secure page in a browser without it', () => {
    expect(wakeSupport({ secure: true, wakeLock: null })).toBe('unsupported');
  });
});
