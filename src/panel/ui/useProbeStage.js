import { useEffect, useRef } from 'react';
import { methodOf, optionsFor, sayProbeStage } from '../machine/probe';

/**
 * Where a probe wizard waits on the operator's hands — the position step, or
 * the paper felt for — said to every device through the server
 * (`probe:stage`), so a phone elsewhere shows a way to it with the jog open
 * (review notes, 2026-09-30).
 *
 * Said whenever this device moves it on; taken back only by the device the
 * wizard was begun on — the returned `owner`, set when a method is picked —
 * not by one that joined it. A device with no wizard in hand (`joined`
 * false) joins one waiting elsewhere (`onJoin(stage)`); one on the same
 * method follows a step taken elsewhere (`onFollow(step)`).
 */
const useProbeStage = ({
  machine, method, choice, step, feeling, joined, onJoin, onFollow,
}) => {
  const shared = machine.probeStage;
  const owner = useRef(false);
  const waiting = step === 'position' || feeling ? step : null;
  const stage = waiting ? JSON.stringify({ method: method.id, options: optionsFor(method, choice), step: waiting }) : null;

  useEffect(() => {
    if (stage && stage !== JSON.stringify(shared)) {
      sayProbeStage(JSON.parse(stage), owner.current);
    } else if (!stage && owner.current && shared) {
      sayProbeStage(null);
    }
  }, [stage]);

  useEffect(() => () => {
    if (owner.current) {
      sayProbeStage(null);
    }
  }, []);

  useEffect(() => {
    if (!shared || machine.probe?.state === 'running' || !methodOf(shared.method)) {
      return;
    }
    if (!joined) {
      onJoin(shared);
    } else if (waiting && shared.method === method?.id && shared.step !== waiting) {
      onFollow(shared.step);
    }
  }, [shared?.step, shared?.method]);

  return owner;
};

export default useProbeStage;
