import { useUnits } from './units';
import { t } from '../i18n';

/**
 * The tool's place in the coordinate system under a probing drawing: muted
 * against the old zero, in the accent once the new one is written. One row
 * for every method (review note, 2026-09-30: *"G54 before/after ma być
 * ujednolicony na rysunkach"*) — the Z plate's said its Z in a box inside
 * the drawing, the corner's its X, Y and Z under it. Left-aligned, the
 * figures in fixed columns (Claude Design, probe proposals, 2026-09-30).
 *
 * `axes` is `[['z', mm], …]`, in the order said.
 */
const ProbeReadout = ({ wcs, after, axes }) => {
  const units = useUnits();
  return (
    <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line px-3 py-2 font-num ${after ? 'bg-accS text-acc' : 'text-ink'}`}>
      {/* On a phone the caption stands over the figures, so the three stay on one line. */}
      <span className="basis-full whitespace-nowrap text-cap text-mut @3xl/shell:basis-auto">
        {t('probe.readout.system', { wcs: wcs || 'G54', when: t(after ? 'probe.readout.after' : 'probe.readout.before') })}
      </span>
      {/* In columns of their own, so the figures do not shift as they change (proposal, 2026-09-30). */}
      {axes.map(([axis, mm]) => (
        <span key={axis} className="whitespace-nowrap text-base font-semibold @3xl/shell:w-24">{`${axis.toUpperCase()} ${units.figure(mm)}`}</span>
      ))}
    </div>
  );
};

export default ProbeReadout;
