/**
 * Whether the panel on screen is still the panel that was served.
 *
 * A pendant is opened once and left open — installed on a phone it may not be
 * reloaded for weeks. So a rebuilt panel sits on the server while the operator
 * looks at an older one, and nothing says so: the service worker is
 * network-first, which keeps the *assets* fresh but cannot swap out the
 * JavaScript already running in the page.
 *
 * Reloading by hand used to be the answer, and it stopped being one when
 * pull-to-refresh was switched off — deliberately, because the same gesture
 * scrolls the settings and opens the menu. That trade is only honest if the
 * panel says when a reload is worth making, which is what this is for.
 *
 * The build writes its version beside the panel (`version.json`, see
 * `scripts/panel-version.js`), and the panel on screen compares it with its
 * own. It used to wait for a new service worker instead, which only arrives
 * when `sw.js` itself changes — most rebuilds went unnoticed (Mateusz,
 * 2026-09-28: *"chcę widzieć, do jakiej wersji mogę zaktualizować panel"*).
 *
 * And it updates itself, unless this device says not to: when nobody is
 * using it. A reload under a finger holding a jog key would drop the key
 * mid-move, so it waits for the page to go to the background or for
 * `IDLE_MS` without a touch or a key.
 */

/** This panel's own build: `{ label, tag, commit, dirty, builtAt, id }`. */
export const THIS_BUILD = process.env.BUILD_VERSION ?? null;

/** Whether the server serves another build than the one running here. */
export const isNewer = (mine, served) => Boolean(mine && served?.id && served.id !== mine.id);

// How often to ask: a small file, and a rebuild is seen within a couple of minutes.
const CHECK_MS = 2 * 60 * 1000;
// How long without a touch or a key before an update may reload the page by itself.
export const IDLE_MS = 30 * 1000;
const KEY = 'panel.autoUpdate';

let served = null;
const watchers = new Set();

const tell = () => watchers.forEach((notify) => notify());

/** The build the server has now, once asked; `null` before that. */
export const servedBuild = () => served;

/** A newer panel is waiting on the server. Reload to take it. */
export const isUpdateReady = () => isNewer(THIS_BUILD, served);

/** Called when either of the above, or the setting, changes. Returns the unsubscribe. */
export const watchUpdate = (notify) => {
  watchers.add(notify);
  return () => watchers.delete(notify);
};

/** Take it. Nothing is lost: the job and the port belong to the server. */
export const applyUpdate = () => window.location.reload();

/** This device updating by itself: on unless it was switched off here. */
export const readAutoUpdate = () => {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch (e) {
    return true;
  }
};

export const setAutoUpdate = (on) => {
  try {
    if (on) {
      window.localStorage.removeItem(KEY);
    } else {
      window.localStorage.setItem(KEY, 'off');
    }
  } catch (e) {
    // A browser that keeps nothing updates by itself, which is the default.
  }
  tell();
};

/*
 * Guarded, because this module is imported by the Jest tier too, where there
 * is no window at all.
 */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let lastInput = Date.now();
  const touched = () => {
    lastInput = Date.now();
  };
  window.addEventListener('pointerdown', touched, { capture: true, passive: true });
  window.addEventListener('keydown', touched, { capture: true, passive: true });

  /*
   * Once per build on the server. Should the reload bring back the same old
   * panel — a bundle kept by the browser's cache — it would otherwise reload
   * again every half a minute; the button stays for that case.
   */
  const TRIED = 'panel.autoUpdateTried';
  const tried = () => {
    try {
      return window.sessionStorage.getItem(TRIED);
    } catch (e) {
      return null;
    }
  };
  const maybeApply = () => {
    if (!isUpdateReady() || !readAutoUpdate() || tried() === served.id) {
      return;
    }
    if (document.hidden || Date.now() - lastInput >= IDLE_MS) {
      try {
        window.sessionStorage.setItem(TRIED, served.id);
      } catch (e) {
        // Without it the next reload may try again; the button is still there.
      }
      applyUpdate();
    }
  };

  const check = () => fetch('/panel/version.json', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .then((build) => {
      if (build?.id && build.id !== served?.id) {
        served = build;
        tell();
      }
    })
    .catch(() => undefined)
    .then(maybeApply);

  check();
  setInterval(check, CHECK_MS);
  // Waiting for a quiet moment: checked often, it costs nothing.
  setInterval(maybeApply, 5000);
  document.addEventListener('visibilitychange', () => (document.hidden ? maybeApply() : check()));

  // The worker itself, still asked for now and then, so a change to `sw.js` reaches the browser.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        setInterval(() => registration.update().catch(() => undefined), CHECK_MS * 5);
      })
      .catch(() => undefined);
  }
}

export default isUpdateReady;
