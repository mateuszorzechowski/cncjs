/**
 * What this device is called, in words a person recognises — the system,
 * the model where the browser will tell, the browser and its version — so the
 * journal can say who did a thing without a UUID (Mateusz, 2026-09-26: *"im
 * bardziej specyficzna nazwa dla urządzenia da się dostać, tym lepiej"*).
 *
 * Pure: it is handed what the browser said, `userAgent` and, where there is
 * one, the answer of `navigator.userAgentData.getHighEntropyValues` (Chromium
 * only; the only way to the model of an Android phone now that its user
 * agent says `K`). A name somebody typed in Settings wins over all of it.
 */

const major = (version) => (version ? String(version).split('.')[0] : '');

const systemOf = (ua, data) => {
  if (/iPhone/.test(ua)) {
    return 'iPhone';
  }
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && data?.mobile)) {
    return 'iPad';
  }
  const android = ua.match(/Android\s+([\d.]+)/);
  if (android) {
    // The reduced user agent says 10 whatever the phone runs; the browser's
    // own answer says what it is.
    return `Android ${major(data?.platformVersion) || major(android[1])}`;
  }
  if (/Windows NT/.test(ua)) {
    // The user agent says 10 for both; the platform version tells 11 apart.
    const version = Number(major(data?.platformVersion));
    if (version) {
      return version >= 13 ? 'Windows 11' : 'Windows 10';
    }
    return 'Windows';
  }
  if (/CrOS/.test(ua)) {
    return 'ChromeOS';
  }
  if (/Mac OS X/.test(ua)) {
    return 'macOS';
  }
  if (/Linux/.test(ua)) {
    return 'Linux';
  }
  return '';
};

const browserOf = (ua) => {
  const found = [
    ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
    ['Opera', /OPR\/([\d.]+)/],
    ['Samsung', /SamsungBrowser\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ].find(([, pattern]) => pattern.test(ua));
  return found ? `${found[0]} ${major(ua.match(found[1])[1])}` : '';
};

const modelOf = (ua, data) => {
  if (data?.model) {
    return data.model;
  }
  // `Android 14; SM-S918B)` — until the reduced user agent, which says `K`.
  const android = ua.match(/Android[^;)]*;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?\)/);
  return android && android[1] !== 'K' ? android[1].trim() : '';
};

/** `{ system, browser, model, name }` — `name` all three, joined. */
export const describeDevice = ({ userAgent = '', data = null } = {}) => {
  const system = systemOf(userAgent, data);
  const browser = browserOf(userAgent);
  const model = modelOf(userAgent, data);
  return { system, browser, model, name: [system, model, browser].filter(Boolean).join(' · ') };
};

const KEY = 'panel.deviceName';

/** The name somebody typed for this device, or ''. */
export const ownName = () => {
  try {
    return window.localStorage.getItem(KEY) || '';
  } catch (e) {
    return '';
  }
};

export const keepOwnName = (name) => {
  try {
    if (name.trim()) {
      window.localStorage.setItem(KEY, name.trim());
    } else {
      window.localStorage.removeItem(KEY);
    }
  } catch (e) {
    // A browser that keeps nothing goes by the detected name.
  }
};

/** What the browser says of itself, the model included where it can be asked for. */
export const detectDevice = async () => {
  const nav = window.navigator;
  let data = null;
  try {
    data = await nav.userAgentData?.getHighEntropyValues?.(['model', 'platformVersion']);
    data = data ? { ...data, mobile: nav.userAgentData.mobile } : null;
  } catch (e) {
    data = null;
  }
  return describeDevice({ userAgent: nav.userAgent, data });
};
