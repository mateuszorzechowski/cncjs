import { useEffect, useRef, useState } from 'react';
import { changesOf } from '../machine/machineSettings';
import { previewSettings } from '../machine/commands';

// How long typing may pause before the server is asked what the changes do to the geometry.
const PREVIEW_MS = 250;

/**
 * Geometria after the changes being edited, from the server (Mateusz,
 * 2026-09-28: Geometria while the changes are looked at and in the review).
 *
 * Asked again whenever the changes or the controller's settings change, a
 * moment after typing stops. An answer is used only if it is the latest one
 * asked for — `seq` — so a slow answer to an older set of changes never
 * shows. `null` with nothing pending, or before the answer: the screen then
 * shows the geometry as the controller holds it.
 */
const useSettingsPreview = (machine, pending, drafts, rule) => {
  const asked = useRef(0);
  const [askedSeq, setAskedSeq] = useState(0);
  const changes = pending.length > 0 ? changesOf(pending, drafts, rule) : [];
  const changesKey = JSON.stringify(changes);
  const readAt = machine.machineSettings?.readAt;

  useEffect(() => {
    if (changes.length === 0 || !machine.connected) {
      return undefined;
    }
    const timer = setTimeout(() => {
      asked.current += 1;
      setAskedSeq(asked.current);
      previewSettings(changes, asked.current);
    }, PREVIEW_MS);
    return () => clearTimeout(timer);
    // `changesKey` stands for `changes`, which is new every render.
  }, [changesKey, readAt, machine.connected]);

  return pending.length > 0 && machine.settingsPreview?.seq === askedSeq ? machine.settingsPreview : null;
};

export default useSettingsPreview;
