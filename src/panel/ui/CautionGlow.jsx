/**
 * A soft amber glow under the jog keys, for a machine nothing guards the ends
 * of — not homed, so no fence and no soft limits (review note, 2026-09-28:
 * *"delikatne ostrzegawcze tło, z gradientem, rozmyciem — jak ramka przy
 * jogu"*).
 *
 * Kin to the hazard tape round the drawing (`HazardFrame`), and deliberately
 * not the same: the stripes mean "a click here moves the machine", this
 * means "take care, nothing stops it at the end". So a glow, not a stripe,
 * and in `--amb`, the colour this panel warns in.
 *
 * Under the keys rather than over them: the parent is `isolate` and this sits
 * at `-z-10`, so it shows in the gaps between keys and at the pad's edges,
 * and every key keeps its own face. `pointer-events-none`, so no press lands
 * on it.
 */
const CautionGlow = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 -z-10 rounded-card blur-md [background:radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--amb)_55%,transparent)_0%,color-mix(in_srgb,var(--amb)_25%,transparent)_60%,transparent_100%)]"
  />
);

export default CautionGlow;
