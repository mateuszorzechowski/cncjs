/**
 * The panel's addresses: a screen, and on the settings screen its tab —
 * `/jog`, `/settings/controller` (Mateusz, 2026-09-28:
 * *"nawigując nie zmienia się adres URL … przycisk wstecz, gest cofnij nie
 * działają"*, and *"może być /panel/settings"*). Plain paths rather than a
 * `#`: the server hands the panel's page to any of them (`app.js`), so a
 * reload or a bookmark opens what it names.
 *
 * Pure, so Jest reads it without a browser.
 */
export const BASE = '/';

/** `{ screen, tab }` from an address, or null for the panel's bare root and anything outside it. */
export const routeFrom = (pathname) => {
  if (!pathname || !pathname.startsWith(BASE)) {
    return null;
  }
  const [screen, tab] = pathname.slice(BASE.length).split('/').filter(Boolean);
  return screen ? { screen, tab: tab || null } : null;
};

/**
 * The address of a screen, and of its tab where it has one. `search` is kept
 * as it was — `?lng=pl`, which the tests and the review overlay open with.
 */
export const pathOf = (screen, tab, search = '') => `${BASE}${screen}${tab ? `/${tab}` : ''}${search}`;
