import SegmentedChoice from './SegmentedChoice';
import { t } from '../i18n';

const ON = ['work', 'table'];
const Z0 = ['top', 'table'];
// Each option's word, named whole so the translations are found.
const WORDS = { work: 'probe.surface.work', table: 'probe.surface.table', top: 'probe.surface.top' };

/**
 * Where the plate or the sheet lies, and where Z0 goes (Mateusz, 2026-10-01:
 * two switches, *"Mierzysz na: materiał / stół"*, *"Z0 na: wierzch / stół"*).
 * Alike, the zero is where it is measured; apart, the work's thickness
 * between them — asked for in the figures (`probe.group.stock`).
 */
const SurfaceChoice = ({ value, onChange }) => (
  <div className="flex flex-col gap-2">
    <span className="text-cap font-semibold uppercase tracking-[0.08em] text-ink">{t('probe.surface.title')}</span>
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
      <span className="text-note text-mut">{t('probe.surface.on')}</span>
      <SegmentedChoice
        options={ON}
        value={value.on}
        onChange={(on) => onChange({ ...value, on })}
        format={(id) => t(WORDS[id])}
        label={t('probe.surface.on')}
        joined
      />
      <span className="text-note text-mut">{t('probe.surface.z0')}</span>
      <SegmentedChoice
        options={Z0}
        value={value.z0}
        onChange={(z0) => onChange({ ...value, z0 })}
        format={(id) => t(WORDS[id])}
        label={t('probe.surface.z0')}
        joined
      />
    </div>
  </div>
);

export default SurfaceChoice;
