import useKept from '../../ui/useKept';
import { SURFACE } from '../machine/probe';

/** Where this device's probe wizard is, kept while the screen is away (`useKept`): its step marks the menu. */
export const WIZARD_STEP = 'probe-step';

/**
 * The probe wizard's own state — its step, the method picked, each method's
 * one choice, the figures typed, the wire tested, where Z0 goes — kept
 * across leaving the screen and coming back (Mateusz, 2026-10-03).
 */
const useProbeWizard = () => {
  const [local, setLocal] = useKept(WIZARD_STEP, 'method');
  const [picked, setPicked] = useKept('probe-picked', null);
  // The corner, the paper's surface: each method's one choice, kept per method.
  const [chosen, setChosen] = useKept('probe-chosen', {});
  const [texts, setTexts] = useKept('probe-texts', {});
  const [bad, setBad] = useKept('probe-bad', null);
  const [touched, setTouched] = useKept('probe-touched', false);
  // Where Z0 goes against where it is measured — per measurement, as the corner is.
  const [surface, setSurface] = useKept('probe-surface', SURFACE);
  return {
    local, setLocal, picked, setPicked, chosen, setChosen, texts, setTexts, bad, setBad, touched, setTouched, surface, setSurface,
  };
};

export default useProbeWizard;
