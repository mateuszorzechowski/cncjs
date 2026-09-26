import { describeDevice } from '../deviceName';

// Real user agents, copied, not written.
const PIXEL_OLD = 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';
const ANDROID_REDUCED = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const WINDOWS_EDGE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0';
const MAC_FIREFOX = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:130.0) Gecko/20100101 Firefox/130.0';
const LINUX_CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

describe('what a device is called', () => {
  test('an Android phone by its model, from the user agent where it still says it', () => {
    expect(describeDevice({ userAgent: PIXEL_OLD }).name).toBe('Android 13 · SM-S918B · Chrome 116');
  });

  test('from the browser’s own answer where the user agent says only K', () => {
    expect(describeDevice({ userAgent: ANDROID_REDUCED }).name).toBe('Android 10 · Chrome 128');
    expect(describeDevice({ userAgent: ANDROID_REDUCED, data: { model: 'Pixel 8', platformVersion: '14.0.0' } }).name)
      .toBe('Android 14 · Pixel 8 · Chrome 128');
  });

  test('an iPhone, a Mac, a Linux desk', () => {
    expect(describeDevice({ userAgent: IPHONE }).name).toBe('iPhone · Safari 17');
    expect(describeDevice({ userAgent: MAC_FIREFOX }).name).toBe('macOS · Firefox 130');
    expect(describeDevice({ userAgent: LINUX_CHROME }).name).toBe('Linux · Chrome 128');
  });

  test('Windows 11 told from 10 by the platform version, Edge told from Chrome', () => {
    expect(describeDevice({ userAgent: WINDOWS_EDGE, data: { platformVersion: '15.0.0' } }).name).toBe('Windows 11 · Edge 128');
    expect(describeDevice({ userAgent: WINDOWS_EDGE, data: { platformVersion: '10.0.0' } }).name).toBe('Windows 10 · Edge 128');
    expect(describeDevice({ userAgent: WINDOWS_EDGE }).name).toBe('Windows · Edge 128');
  });

  test('nothing to go on is an empty name, not a guess', () => {
    expect(describeDevice({}).name).toBe('');
  });
});
