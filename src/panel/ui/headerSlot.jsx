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
 */
const HeaderHelp = createContext(() => {});

export const HeaderHelpProvider = HeaderHelp.Provider;

export const useHeaderHelp = (label, onPress) => {
  const fill = useContext(HeaderHelp);
  const press = useRef(onPress);
  press.current = onPress;

  useEffect(() => {
    fill({ label, onPress: () => press.current() });
    return () => fill(null);
  }, [fill, label]);
};

export default HeaderHelp;
