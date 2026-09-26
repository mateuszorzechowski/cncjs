/**
 * When the port is opened without anybody pressing Connect — "Tryb łączenia",
 * the settings design's variant 3a (2026-09-26).
 *
 * Three choices in one control, named by the moment of connecting and ordered
 * from the least automatic: `manual`, `panel` (when this panel is opened),
 * `server` (when the server starts). They are two settings underneath, of two
 * scopes:
 *
 * - **the server's**, `connection.auto`: `server` or `manual`, the same on
 *   every device;
 * - **this device's**, whether it connects when opened — kept in the browser,
 *   because every device keeps its own (*"Inne urządzenia zachowują własne
 *   ustawienie"*).
 *
 * The server's `server` wins what is shown: with it the port is open before
 * any panel is, and a device's own choice cannot be seen. So choosing `panel`
 * turns the server's back to `manual` as well — for every device, which is the
 * one thing the control does beyond this one.
 *
 * Pure, so Jest reads it without a browser; `autoConnect.js` beside it keeps
 * the two settings and reaches the socket.
 */
export const CONNECT_MODES = ['manual', 'panel', 'server'];

/** What the control shows, from the server's mode and this device's. */
export const connectMode = (serverMode, onOpen) => {
  if (serverMode === 'server') {
    return 'server';
  }
  return onOpen ? 'panel' : 'manual';
};

/** What choosing `mode` sets: the server's mode, and this device's. */
export const connectPlan = (mode) => ({
  server: mode === 'server' ? 'server' : 'manual',
  onOpen: mode === 'panel',
});

/** Whose setting a mode is: `panel` this device's, the other two the server's. */
export const connectScope = (mode) => (mode === 'panel' ? 'device' : 'server');
