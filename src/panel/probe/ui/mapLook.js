/**
 * How the height map's drawing was last set on this device — the scale, the
 * looks and the layers — kept between visits (Mateusz, 2026-10-03:
 * "ustawienia podglądu zapamiętują się"). A view, not a setting of the
 * machine's: it stays in this browser, as the theme does (`ui/theme`).
 */
const KEY = 'panel.mapLook';

const DEFAULTS = {
  scale: 20,
  looks: ['gridLines'],
  layers: {
    machineArea: true, path: true, wcsAxes: true, map: true,
  },
};

const read = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    return saved && typeof saved === 'object' ? saved : {};
  } catch (err) {
    return {};
  }
};

/** What was kept, over the defaults: `{ scale, looks, layers }`. */
export const mapLook = () => {
  const saved = read();
  return {
    scale: Number.isFinite(saved.scale) ? saved.scale : DEFAULTS.scale,
    looks: Array.isArray(saved.looks) ? saved.looks : DEFAULTS.looks,
    layers: { ...DEFAULTS.layers, ...(saved.layers && typeof saved.layers === 'object' ? saved.layers : {}) },
  };
};

/** Keep part of it (`{ scale }`, `{ looks }` or `{ layers }`). */
export const keepMapLook = (part) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...mapLook(), ...part }));
  } catch (err) {
    // A browser that keeps nothing: the drawing is as set until the page goes.
  }
};
