import { createContext, useContext } from 'react';
import { feedLabel, figure, lengthLabel } from '../machine/units';

/**
 * The server's units rule, for every screen without passing it down.
 *
 * Given at the top from the machine's snapshot, like the shell's width. A
 * screen asks `useUnits()` and gets the formatting already bound to the rule,
 * so there is one way to turn a millimetre into text and no screen can pick
 * another.
 */
const Units = createContext(null);

export const UnitsProvider = Units.Provider;

export const useUnits = () => {
  const rule = useContext(Units);
  return {
    rule,
    /** A length in mm as text — `position`, `size` or `feed`. */
    figure: (mm, kind) => figure(mm, rule, kind),
    length: lengthLabel(rule),
    feed: feedLabel(rule),
  };
};
