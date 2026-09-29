import { storage } from './theme';

/**
 * Two more of the drawing's four axes as this device's settings: the density
 * and the face numbers are drawn in (decided 2026-09-21: they belong to
 * Settings; built 2026-09-29) — and the panel's own third, the text size.
 *
 * The token sheet has switched both by attribute on the root since the first
 * day — `[data-density='compact']`, `[data-num='plex']` — and nothing ever
 * wrote either. Same shape as the theme: remembered by this browser, written
 * onto the root before the first render, and every token, the 3D scene and
 * the number face follow without a rebuild.
 *
 * Unlike the theme there is no `system` source and nothing outside to follow,
 * so the attribute is simply the setting.
 */
const makeLook = ({ key, attribute, values, fallback = values[0] }) => {
  const normalize = (value) => (values.includes(value) ? value : fallback);
  const listeners = new Set();

  const read = () => {
    try {
      return normalize(storage()?.getItem(key));
    } catch (e) {
      return fallback;
    }
  };

  const paint = (value) => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset[attribute] = value;
    }
  };

  const set = (next) => {
    const value = normalize(next);
    try {
      storage()?.setItem(key, value);
    } catch (e) {
      // Kept for this session and no further, as the theme does.
    }
    paint(value);
    listeners.forEach((listener) => listener(value));
  };

  const watch = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { values, normalize, read, set, watch, start: () => paint(read()) };
};

/** `comfortable` is the drawing's `:root`; `compact` its tighter block. */
export const DENSITY = makeLook({ key: 'panel.density', attribute: 'density', values: ['comfortable', 'compact'] });

/** Azeret Mono is the drawing's default; the other three its switch blocks. */
export const NUM_FONT = makeLook({ key: 'panel.numFont', attribute: 'num', values: ['azeret', 'jetbrains', 'plex', 'segment'] });

/**
 * How big words are drawn, on this device (Mateusz, 2026-09-29: *"czy można
 * dodać rozmiar czcionki?"* — *"tak"*). In the order read, the middle one the
 * drawing's own.
 */
export const TEXT_SIZE = makeLook({ key: 'panel.textSize', attribute: 'text', values: ['small', 'normal', 'large'], fallback: 'normal' });

/** All three, before the first render — see `startTheme`. */
export const startLook = () => {
  DENSITY.start();
  NUM_FONT.start();
  TEXT_SIZE.start();
};
