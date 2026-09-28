import { useEffect, useRef, useState } from 'react';
import { draftSettings } from '../machine/commands';
import { deviceId } from '../machine/device';

/**
 * The controller settings' changes waiting to be written — the server's,
 * shared by every panel (Mateusz, 2026-09-28: a reload keeps them, and
 * another device sees the same ones).
 *
 * What this panel types shows at once, and goes to the server; what the
 * server says back replaces it. One exception, so a field does not jump
 * under a thumb: the echo of an older request of this panel's own, arriving
 * while a newer one is still on its way, is not taken — the newer answer
 * will be. Another panel's change is taken as it comes; the last one typed
 * wins.
 *
 * Returns `[drafts, change]`: `change(set, { clear })`, `set` being
 * `{ name: draft | null }`.
 */
const useSharedDrafts = (machine) => {
  const [drafts, setDrafts] = useState(() => machine.machineSettings?.drafts ?? {});
  // This panel's requests: how many were sent, and the latest the server has answered.
  const sent = useRef(0);
  const answered = useRef(0);
  const me = useRef(deviceId());

  // What the server holds when the view arrives — on opening the tab, after
  // a reload, after every reading of `$$` — unless this panel is still
  // waiting for an answer, which will be newer.
  const viewDrafts = machine.machineSettings?.drafts;
  useEffect(() => {
    if (viewDrafts && answered.current === sent.current) {
      setDrafts(viewDrafts);
    }
  }, [viewDrafts]);

  // What the server holds after any panel changed it.
  const pending = machine.settingsPending;
  useEffect(() => {
    if (!pending) {
      return;
    }
    const mine = pending.device === me.current && pending.seq !== null;
    if (mine) {
      answered.current = Math.max(answered.current, pending.seq);
      if (pending.seq < sent.current) {
        return;
      }
    }
    setDrafts(pending.drafts ?? {});
  }, [pending]);

  const change = (set, { clear = false } = {}) => {
    setDrafts((now) => {
      const next = clear ? {} : { ...now };
      for (const [name, draft] of Object.entries(set)) {
        if (draft) {
          next[name] = draft;
        } else {
          delete next[name];
        }
      }
      return next;
    });
    sent.current += 1;
    draftSettings({ set, clear, seq: sent.current });
  };

  return [drafts, change];
};

export default useSharedDrafts;
