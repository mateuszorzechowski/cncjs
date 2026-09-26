import { useEffect, useState } from 'react';

/**
 * Keep the screen on while the panel is open — this device's setting, from
 * the settings design (variant 2b, the Appearance tab). A pendant beside a
 * spindle is looked at, not touched, for the length of a job, and a screen
 * that locks half way through is a panel that has to be unlocked with a
 * dusty thumb to see where the program is.
 *
 * The Screen Wake Lock API, which a browser gives only to a **secure page**:
 * over plain HTTP `navigator.wakeLock` is not there at all. So the control
 * says why it is dark rather than looking broken — see `wakeSupport`.
 *
 * A lock is let go by the browser whenever the page is hidden (another tab,
 * the screen switched off by hand), so it is asked for again each time the
 * page comes back while the setting is on.
 */

const KEY = 'panel.keepAwake';

const CHANGE = 'panel:keepawake';

/**
 * Whether this page can hold the screen on: `ok`, `insecure` (served over
 * HTTP, where browsers withhold the API) or `unsupported` (a browser without
 * it). Takes what it looks at, so Jest can ask it without a window.
 */
export const wakeSupport = ({ secure, wakeLock }) => {
  if (!secure) {
    return 'insecure';
  }
  return wakeLock ? 'ok' : 'unsupported';
};

const here = () => (typeof window === 'undefined'
  ? { secure: false, wakeLock: null }
  : { secure: Boolean(window.isSecureContext), wakeLock: window.navigator?.wakeLock ?? null });

export const readKeepAwake = () => {
  try {
    return window.localStorage.getItem(KEY) === 'on';
  } catch (e) {
    return false;
  }
};

export const setKeepAwake = (on) => {
  try {
    if (on) {
      window.localStorage.setItem(KEY, 'on');
    } else {
      window.localStorage.removeItem(KEY);
    }
  } catch (e) {
    // A browser that keeps nothing lets the screen lock, which is the default.
  }
  window.dispatchEvent(new Event(CHANGE));
};

/**
 * What the lock is doing now, for the settings row: `off`, `held`, or
 * `refused` — the browser said no (a battery saver will). Kept here rather
 * than in React, because the hook that holds it lives at the top of the app
 * and the row that shows it is several screens away.
 */
let state = 'off';

const setState = (next) => {
  if (next !== state) {
    state = next;
    window.dispatchEvent(new Event(CHANGE));
  }
};

/** The setting, the page's support and the lock's state, kept current. */
export const useKeepAwakeStatus = () => {
  const read = () => ({ on: readKeepAwake(), support: wakeSupport(here()), state });
  const [status, setStatus] = useState(read);
  useEffect(() => {
    const update = () => setStatus(read());
    window.addEventListener(CHANGE, update);
    return () => window.removeEventListener(CHANGE, update);
  }, []);
  return status;
};

/**
 * Hold the screen on while the setting says so. Called once, by the app.
 */
export const useKeepAwake = () => {
  const { on, support } = useKeepAwakeStatus();

  useEffect(() => {
    if (!on || support !== 'ok') {
      setState('off');
      return undefined;
    }

    let lock = null;
    let live = true;

    const ask = async () => {
      if (!live || document.visibilityState !== 'visible' || (lock && !lock.released)) {
        return;
      }
      try {
        lock = await window.navigator.wakeLock.request('screen');
        setState('held');
        lock.addEventListener('release', () => live && setState(document.visibilityState === 'visible' ? 'refused' : 'held'));
      } catch (e) {
        setState('refused');
      }
    };

    ask();
    document.addEventListener('visibilitychange', ask);
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', ask);
      lock?.release().catch(() => {});
      setState('off');
    };
  }, [on, support]);
};
