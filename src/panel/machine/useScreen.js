import { useEffect, useState } from 'react';
import { pathOf, routeFrom } from './route';
import { showSettingsTab } from '../screens/SettingsScreen';

/*
 * The screen last open, kept on this device.
 *
 * *"Zapamiętywanie ostatniego ekranu, żeby po odświeżeniu albo wejściu
 * trafiać na ten sam"* (Mateusz, 2026-09-25): a reload — and the panel
 * reloads itself on every update — dropped whoever was on the journal or the
 * zeroing screen back on the dashboard. Per device rather than on the server,
 * since a phone and the desk are usually looking at different things.
 *
 * Only a screen that exists: a name kept by an older panel, or typed into
 * storage by hand, opens the dashboard instead.
 */
const KEEP_SCREEN = 'panel.screen';

const rememberedScreen = (isScreen) => {
  try {
    const kept = window.localStorage.getItem(KEEP_SCREEN);
    return kept && isScreen(kept) ? kept : 'dashboard';
  } catch (err) {
    return 'dashboard';
  }
};

/*
 * The screen the address names — `/panel/jog`, `/panel/settings/controller`
 * — and at the bare `/panel/` the one kept on this device, as before. A tab
 * the address names is handed to the settings screen before it opens.
 */
const firstScreen = (isScreen) => {
  const route = routeFrom(window.location.pathname);
  if (route && isScreen(route.screen)) {
    if (route.tab) {
      showSettingsTab(route.tab);
    }
    return route.screen;
  }
  return rememberedScreen(isScreen);
};

/**
 * The screen open, and the way to another: `[screen, go]`. `isScreen` says
 * which names are screens.
 */
const useScreen = (isScreen) => {
  const [screen, setScreen] = useState(() => firstScreen(isScreen));
  useEffect(() => {
    try {
      window.localStorage.setItem(KEEP_SCREEN, screen);
    } catch (err) {
      // Private mode: the panel opens on the dashboard next time, as before.
    }
  }, [screen]);

  /*
   * The address follows the screen, one step of history per screen, and the
   * browser's back — a button, a phone's gesture — goes back a screen
   * (Mateusz, 2026-09-28). The bare `/panel/` is written over with the
   * screen it opened, rather than stepped from. The settings screen writes
   * its tab into the same step (`SettingsScreen`); an open sheet has a step
   * of its own (`Sheet`), and going back from it only closes it.
   */
  useEffect(() => {
    if (routeFrom(window.location.pathname)?.screen !== screen) {
      window.history.replaceState(window.history.state, '', pathOf(screen, null, window.location.search));
    }
    const back = () => {
      const route = routeFrom(window.location.pathname);
      if (route && isScreen(route.screen)) {
        if (route.tab) {
          showSettingsTab(route.tab);
        }
        setScreen(route.screen);
      }
    };
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
    // Once: after that, `go` moves the address with the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const go = (next) => {
    if (next !== screen) {
      window.history.pushState(null, '', pathOf(next, null, window.location.search));
      setScreen(next);
    }
  };
  return [screen, go];
};

export default useScreen;
