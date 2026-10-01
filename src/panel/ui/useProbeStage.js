import { useEffect, useRef } from 'react';
import { deviceId } from '../machine/device';
import { optionsFor, sayProbeStage } from '../machine/probe';

/**
 * Where a probe wizard waits on the operator's hands — the position step, or
 * the paper felt for — shared through the server (`probe:stage`) so a phone
 * elsewhere can join it (review notes, 2026-09-30/10-01). One at a time:
 *
 * - `mode` `own`: this device's wizard. Reaching the step it says so as its
 *   owner, taking it over from another device's; leaving the step it lets
 *   it go. Taken over by another device reaching the step — `onTakenOver`
 *   with that device's name — it goes back a step.
 * - `mode` `joined`: another device's wizard, followed here. A step taken
 *   here is said without taking it; its owner gone, this device takes it on.
 * - Either follows a step taken elsewhere (`onFollow`).
 *
 * Returns `mine`: the wizard waiting is this device's.
 */
const useProbeStage = ({
  machine, method, choice, surface, step, feeling, mode, onFollow, onTakenOver,
}) => {
  const shared = machine.probeStage;
  const mine = Boolean(shared?.owner && shared.owner.device === deviceId());
  const waiting = mode && (step === 'position' || feeling) ? step : null;
  const stage = waiting ? JSON.stringify({ method: method.id, options: optionsFor(method, choice, surface), step: waiting }) : null;
  const said = ({ owner, ...rest } = {}) => JSON.stringify(rest);
  const owned = useRef(false);
  owned.current = mine;

  // Say it: as the owner for a wizard of this device's, as a step for one joined.
  useEffect(() => {
    if (stage) {
      if (mode === 'own' ? !mine || stage !== said(shared) : stage !== said(shared)) {
        sayProbeStage(JSON.parse(stage), mode === 'own');
      }
    } else if (mine) {
      sayProbeStage({ release: true });
    }
  }, [stage]);

  // Leaving the screen is leaving the step.
  useEffect(() => () => {
    if (owned.current) {
      sayProbeStage({ release: true });
    }
  }, []);

  // Taken over, followed, or left without an owner.
  const had = useRef(false);
  useEffect(() => {
    if (mine) {
      had.current = true;
    }
    if (!shared || !waiting) {
      return;
    }
    const another = shared.owner && !mine && (had.current || (mode === 'joined' && shared.method !== method?.id));
    if (another) {
      had.current = false;
      onTakenOver(shared.owner.name);
      return;
    }
    if (mode === 'joined' && !shared.owner) {
      sayProbeStage(JSON.parse(stage), true);
      return;
    }
    if (shared.method === method?.id && shared.step !== waiting) {
      onFollow(shared.step);
    }
  }, [shared?.step, shared?.method, shared?.owner?.device]);

  return { mine };
};

export default useProbeStage;
