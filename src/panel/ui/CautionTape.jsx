/**
 * Hazard tape under the whole Jog card, turned down, for a machine nothing
 * guards the ends of — not homed, so no fence and no soft limits (review
 * notes, 2026-09-28: *"jak ramka przy jogu"*, *"taśma, ale przygaszona"*,
 * then *"na całą sekcję jog, przygaszone pod przyciskami i cień na
 * krawędziach"*).
 *
 * The same stripe as round the drawing (`HazardFrame`), faded almost away in
 * the middle, where the keys are, and stronger towards the card's edges, like
 * a shadow: kin to "a click here moves the machine", and plainly not it.
 *
 * Under everything in the card: the card is `isolate` and this sits at
 * `-z-10`, so every key and field keeps its own face. `pointer-events-none`,
 * so no press lands on it.
 */
const CautionTape = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 -z-10 bg-hazard opacity-40 [mask-image:radial-gradient(ellipse_at_center,rgb(0_0_0/0.15)_35%,rgb(0_0_0/0.5)_75%,#000_100%)]"
  />
);

export default CautionTape;
