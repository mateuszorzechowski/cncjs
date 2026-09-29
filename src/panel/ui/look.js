import { storage } from './theme';

/**
 * Two more of the drawing's four axes as this device's settings: the density
 * and the face numbers are drawn in (decided 2026-09-21: they belong to
 * Settings; built 2026-09-29) — and the panel's own third, the text size.
 *
 * The token sheet has switched both axes by attribute on the root since the
 * first day — `[data-density='compact']`, `[data-num='plex']` — and nothing
 * ever wrote either. Same shape as the theme: remembered by this browser,
 * written onto the root before the first render, and every token, the 3D
 * scene and the number face follow without a rebuild.
 *
 * `apply` puts a value on the root; `normalize` turns anything stored into
 * one the setting can be.
 */
const makeLook = ({ key, normalize, fallback, apply }) => {
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
      apply(document.documentElement, value);
    }
  };

  const set = (next) => {
    const value = normalize(next);
    try {
      storage()?.setItem(key, String(value));
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

  return { normalize, read, set, watch, start: () => paint(read()) };
};

/** One of a few names, written as a `data-` attribute the token sheet switches on. */
const choice = ({ key, attribute, values }) => ({
  values,
  ...makeLook({
    key,
    fallback: values[0],
    normalize: (value) => (values.includes(value) ? value : values[0]),
    apply: (root, value) => {
      root.dataset[attribute] = value;
    },
  }),
});

/** `comfortable` is the drawing's `:root`; `compact` its tighter block. */
export const DENSITY = choice({ key: 'panel.density', attribute: 'density', values: ['comfortable', 'compact'] });

/** Azeret Mono is the drawing's default; the other three its switch blocks. */
export const NUM_FONT = choice({ key: 'panel.numFont', attribute: 'num', values: ['azeret', 'jetbrains', 'plex', 'segment'] });

/**
 * How big words are drawn on this device, in per cent of the drawing's sizes
 * (Mateusz, 2026-09-29: *"czy można dodać rozmiar czcionki?"* — *"tak"*; then
 * *"mało opcji … teraz nie widać różnicy"*: three chips at 90/100/115 became a
 * stepper from 80 to 140 in tens — at 160 the rail's and the phone menu's
 * words no longer fit their places). Put on the root as `--textScale`, which
 * the type scale multiplies by (`tailwind.panel.config.js`).
 */
export const TEXT_SCALE = {
  min: 80, max: 140, step: 10,
  ...makeLook({
    key: 'panel.textScale',
    fallback: 100,
    normalize: (value) => {
      const number = Math.round(Number(value) / 10) * 10;
      return Number.isFinite(number) && value !== null && value !== '' ? Math.min(140, Math.max(80, number)) : 100;
    },
    apply: (root, value) => {
      root.style.setProperty('--textScale', String(value / 100));
    },
  }),
};

/** All three, before the first render — see `startTheme`. */
export const startLook = () => {
  DENSITY.start();
  NUM_FONT.start();
  TEXT_SCALE.start();
};
