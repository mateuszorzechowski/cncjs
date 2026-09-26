import { useEffect, useRef } from 'react';
import { currentToken } from './session';
import { useLastConnection } from './usePorts';

/**
 * When the port opens unasked: this device's half of it, and the server's.
 * The rule that joins the two is `connectMode.js`.
 */
const DEVICE_KEY = 'panel.connectOnOpen';

export const readConnectOnOpen = () => {
  try {
    return window.localStorage.getItem(DEVICE_KEY) === 'on';
  } catch (error) {
    return false;
  }
};

export const keepConnectOnOpen = (on) => {
  try {
    if (on) {
      window.localStorage.setItem(DEVICE_KEY, 'on');
    } else {
      window.localStorage.removeItem(DEVICE_KEY);
    }
  } catch (error) {
    // A browser that keeps nothing connects by hand, which is the default.
  }
};

const request = async (url, options) => {
  const token = currentToken();
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`${url}: ${res.status}`);
  }
  return res.json();
};

export const fetchAutoMode = () => request('/api/connection/auto').then(({ mode }) => mode);

export const saveAutoMode = (mode) => request('/api/connection/auto', {
  method: 'PUT',
  body: JSON.stringify({ mode }),
}).then((saved) => saved.mode);

/**
 * With this device set to connect when opened: on opening, while no port is
 * open, connect to what was connected last.
 *
 * Once per page, and only on opening it. A panel that has been disconnected
 * by hand stays disconnected — this runs when the page loads, not whenever
 * the port is found closed — and a panel that finds any port already open
 * attaches to that instead, which the machine layer does by itself.
 */
export const useAutoConnect = (machine) => {
  const tried = useRef(false);
  const last = useLastConnection(machine.linked);
  const { linked, connect } = machine;

  useEffect(() => {
    if (tried.current || !linked || !last?.port) {
      return;
    }
    tried.current = true;
    if (!readConnectOnOpen()) {
      return;
    }
    (async () => {
      const open = await request('/api/controllers');
      if (open.length > 0) {
        return;
      }
      await connect(last.port, { controllerType: last.controllerType, baudrate: last.baudrate });
    })().catch(() => {});
  }, [linked, last, connect]);
};
