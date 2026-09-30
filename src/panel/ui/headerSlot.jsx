import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * The screen's own help, lifted into the top bar on a phone.
 *
 * *"Status i przycisk pomocy przeniesione z sekcji do headera"* (Mateusz,
 * 2026-09-25): on a phone a card's `?` took a line of its own at the top of
 * the only card on screen, while the bar above had room beside the state
 * chip. So a screen names its help here, and on a phone the bar draws it next
 * to the chip, the same height as the chip and the STOP; the card keeps its
 * `?` only where there is room for it (see `Card`).
 *
 * The press is read through a ref, so the bar is told once per screen rather
 * than on every render — the handler is a new function each time.
 *
 * The same place carries a screen's one tool when it is not help: `icon`, a
 * path in the nav's 24-unit box, drawn instead of the `?` (review note,
 * 2026-09-30: the probe's jog on a phone, *"ikona w headerze"*). `on` false
 * leaves the place empty — for a screen whose tool is there only at one step.
 */
const HeaderHelp = createContext(() => {});

export const HeaderHelpProvider = HeaderHelp.Provider;

export const useHeaderHelp = (label, onPress, { icon = null, on = true } = {}) => {
  const fill = useContext(HeaderHelp);
  const press = useRef(onPress);
  press.current = onPress;

  useEffect(() => {
    if (!on) {
      return undefined;
    }
    fill({ label, icon, onPress: () => press.current() });
    return () => fill(null);
  }, [fill, label, icon, on]);
};

export default HeaderHelp;
