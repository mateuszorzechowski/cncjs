import { useCallback, useEffect, useState } from 'react';
import { currentToken } from './session';
import { deviceId } from './device';
import { detectDevice, keepOwnName, ownName } from './deviceName';

/**
 * What this device says of itself to the server — the name it goes by in the
 * journal, and the system, browser and model behind it (`deviceName`) — and
 * the way to rename it. Said once the server can be reached, and again on a
 * rename; the socket's handshake already carried what the user agent alone
 * could tell (`useMachine`).
 */
const tell = async (said) => {
  const token = currentToken();
  const res = await fetch(`/api/devices/${encodeURIComponent(deviceId())}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(said),
  });
  if (!res.ok) {
    throw new Error(`PUT /api/devices: ${res.status}`);
  }
  return res.json();
};

export const useDeviceName = (linked) => {
  const [detected, setDetected] = useState(null);
  const [own, setOwn] = useState(ownName);
  // What the server knows of this device: its address, as it read it.
  const [known, setKnown] = useState(null);

  useEffect(() => {
    let live = true;
    detectDevice().then((found) => live && setDetected(found)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!linked || !detected) {
      return;
    }
    tell({ ...detected, name: own || detected.name }).then(setKnown).catch(() => {});
  }, [linked, detected, own]);

  const rename = useCallback((name) => {
    keepOwnName(name);
    setOwn(name.trim());
  }, []);

  return { detected, own, known, rename, name: own || detected?.name || '' };
};

export default useDeviceName;
