import { useEffect } from 'react';
import useKept from '../../ui/useKept';
import useProbeStage from './useProbeStage';
import { SURFACE, choiceOf, methodOf } from '../machine/probe';
import { t } from '../../i18n/index';

/**
 * Whose probe wizard the screen shows (review notes, 2026-10-01): this
 * device's own (`mode` `own`, from picking a method), another device's
 * joined (`joined`), or none yet. The ways between them:
 *
 * - `join` the wizard waiting elsewhere — straight away when the top bar's
 *   way here brought us (`ask`, the jog open at the position step), or
 *   chosen on the screen when we came from the menu (`declined` once
 *   "start my own" was chosen instead);
 * - `leave` one joined: this device's methods, the wizard going on where it is;
 * - taken over — another device reached the step with its own — back a step
 *   with the device named (`takenBy`), or, joined, out of it.
 *
 * The wizard's own state is the screen's; its setters are passed in.
 */
const useProbeJoin = ({
  machine, method, choice, surface, area = null, onArea = () => {}, step, feeling, ask, onAsked, setPicked, setChosen, setSurface, setLocal, setJogging,
}) => {
  const shared = machine.probeStage;
  // Kept while the screen is away, as the rest of the wizard is (`useProbeWizard`).
  const [mode, setMode] = useKept('probe2-mode', null);
  const [takenBy, setTakenBy] = useKept('probe2-takenBy', null);
  const [declined, setDeclined] = useKept('probe2-declined', false);
  const { mine } = useProbeStage({
    machine, method, choice, surface, area, step, feeling, mode, onFollow: setLocal,
    onTakenOver: (name) => {
      setTakenBy(name || t('probe.join.elsewhere'));
      setLocal(mode === 'own' ? 'prepare' : 'method');
      if (mode !== 'own') {
        setMode(null);
        setPicked(null);
      }
    },
  });

  const join = () => {
    const joined = methodOf(shared.method);
    setMode('joined');
    setTakenBy(null);
    setPicked(shared.method);
    if (joined?.choice) {
      setChosen((now) => ({ ...now, [shared.method]: choiceOf(joined, shared.options) }));
    }
    // The height map's area and grid, as the device it was begun on asked for them.
    if (joined?.asks) {
      onArea(shared.options);
    }
    setSurface({ on: shared.options?.on ?? SURFACE.on, z0: shared.options?.z0 ?? SURFACE.z0 });
    setLocal(shared.step);
  };

  // Left: the methods, not the offer again (review note, 2026-10-01).
  const leave = () => {
    setDeclined(true);
    setMode(null);
    setPicked(null);
    setJogging(false);
    setLocal('method');
  };

  // Declined once, asked again for the next wizard waiting.
  useEffect(() => {
    if (!shared) {
      setDeclined(false);
    }
  }, [shared]);

  useEffect(() => {
    if (ask && shared) {
      if (!mode && !machine.probe) {
        join();
      }
      setJogging(Boolean(ask.jog));
    }
    if (ask) {
      onAsked();
    }
  }, [ask]);

  return {
    shared, mine, mode, setMode, takenBy, setTakenBy, declined, setDeclined, join, leave,
  };
};

export default useProbeJoin;
