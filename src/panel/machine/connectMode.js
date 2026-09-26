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

/**
 * What the control shows as chosen: this device's own choice first — a
 * device set to connect when opened shows that, whatever the server does —
 * else the server's (Mateusz, 2026-09-26: *"opcja panel tyczy się tylko tego
 * urządzenia, opcja serwer ją nadpisuje, ale na urządzeniu dalej zaznaczony
 * jest panel … ale serwer zaznaczony też jest widoczny"*).
 */
export const connectMode = (serverMode, onOpen) => {
  if (onOpen) {
    return 'panel';
  }
  return serverMode === 'server' ? 'server' : 'manual';
};

/**
 * The server's own mode, shown in the lighter mark beside this device's
 * choice — `manual` or `server`, whichever it is — or null when the server's
 * is what is shown as chosen (Mateusz, 2026-09-26: *"opcja manual podobnie
 * jak serwer, delikatnie niebieska, nie nadpisuje automatycznego łączenia na
 * urządzeniu"*). Two settings, both always visible.
 */
export const serverBeside = (serverMode, onOpen) => (onOpen && serverMode ? serverMode : null);

/**
 * What choosing `mode` sets. The panel choice is this device's alone: it
 * turns on, and off again, without touching the server's. Manually and the
 * server's start are the server's, and leave this device's own as it is.
 */
export const connectPlan = (mode, onOpen = false) => (mode === 'panel'
  ? { onOpen: !onOpen }
  : { server: mode === 'server' ? 'server' : 'manual' });

/** Whose setting a mode is: `panel` this device's, the other two the server's. */
export const connectScope = (mode) => (mode === 'panel' ? 'device' : 'server');
