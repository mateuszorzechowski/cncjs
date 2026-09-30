import { ZPlateCycle } from 'cncjs';

export const FastTouch = () => (
  // The measurement as it happens, played by the machine's step: that part of
  // the Z plate cycle loops until the next step comes in; `words` says it.
  // Telefon / tablet / PC: the drawing fills its card's width up to max-w-md.
  <div className="w-side"><ZPlateCycle phase="z-fast" words="Szybki zjazd do styku" /></div>
);

export const SlowTouch = () => (
  <div className="w-side"><ZPlateCycle phase="z" words="Wolny dotyk" /></div>
);

export const Lift = () => (
  <div className="w-side"><ZPlateCycle phase="lift" words="Powrót po pomiarze" /></div>
);
