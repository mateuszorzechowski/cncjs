/**
 * What the machine itself must not be doing when a probe is to move — asked
 * by `probe:start`, `probe:next` and `probe:resume` on top of their own
 * checks (the audit of 2026-10-05, K1 and K13).
 *
 * **The spindle.** A 3D probe on a turning spindle is a broken probe, and a
 * clip lead on a turning tool winds itself round it; a plate under the tool
 * puts a hand there. A program that ended without `M5`, or an `M3` typed into
 * the console, leaves it turning with nothing on the screen to say so. Grbl
 * reports it twice: `A:S` or `A:C` in a status report, and `M3`/`M4` in the
 * parser state. Either is enough to refuse — the second can lag the first by
 * the half second between `$G` queries, and a refusal that is a moment too
 * cautious costs one more tap.
 *
 * **The feed override.** A touch's speed is chosen against how far the probe
 * may travel past the contact before the machine stops; an override above
 * 100 % multiplies it. Below 100 % is slower, so safer, and passes.
 */
export const probeMachineRefusal = ({ status = {}, modal = {} } = {}) => {
  const accessories = String(status.accessoryState || '');
  if (/[SC]/.test(accessories) || modal.spindle === 'M3' || modal.spindle === 'M4') {
    return 'spindle-on';
  }
  const feed = Array.isArray(status.ov) ? Number(status.ov[0]) : NaN;
  if (feed > 100) {
    return 'feed-override';
  }
  return null;
};

export default probeMachineRefusal;
