import { useEffect, useRef } from 'react';
import { currentToken } from './session';
import { useLastConnection } from './usePorts';

/**
 * Who opens the port unasked — the server's setting (board note 2,
 * 2026-09-25): `server`, `panel` or `manual`.
 */
export const AUTO_MODES = ['server', 'panel', 'manual'];

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
 * With `panel`: the first panel to open while no port is open connects to
 * what was connected last.
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
    (async () => {
      if (await fetchAutoMode() !== 'panel') {
        return;
      }
      const open = await request('/api/controllers');
      if (open.length > 0) {
        return;
      }
      await connect(last.port, { controllerType: last.controllerType, baudrate: last.baudrate });
    })().catch(() => {});
  }, [linked, last, connect]);
};
