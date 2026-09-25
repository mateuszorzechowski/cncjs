import { platformOf } from '../platform';

describe('which platform the panel is open on', () => {
  test('a phone or a tablet by its own name', () => {
    expect(platformOf({ userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36' })).toBe('android');
    expect(platformOf({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' })).toBe('ios');
  });

  test('an iPad asking for the desktop site is still an iPad', () => {
    // Safari on an iPad reports itself as a Mac; only the touch points give it away.
    const ipad = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15', maxTouchPoints: 5 };
    expect(platformOf(ipad)).toBe('ios');
    expect(platformOf({ ...ipad, maxTouchPoints: 0 })).toBe('macos');
  });

  test('a desk', () => {
    expect(platformOf({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36' })).toBe('windows');
    expect(platformOf({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0' })).toBe('linux');
  });

  test('anything else is not guessed at', () => {
    expect(platformOf({ userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)' })).toBeNull();
    expect(platformOf({})).toBeNull();
  });
});
