import SegmentedChoice from './SegmentedChoice';
import SettingRow from './SettingRow';
import { surfaceShifts } from '../machine/surface';
import { t } from '../i18n';

const ON = ['work', 'table'];
const Z0 = ['top', 'table'];
// Each option's word, named whole so the translations are found.
const WORDS = { work: 'probe.surface.work', table: 'probe.surface.table', top: 'probe.surface.top' };

/**
 * Where the plate or the sheet lies, and where Z0 goes (Mateusz, 2026-10-01:
 * two switches, *"Mierzysz na: materiał / stół"*, *"Z0 na: wierzch / stół"*),
 * as rows of the figures' group they head. Alike, the zero is where it is
 * measured; apart, the work's thickness between them.
 */
const SurfaceChoice = ({ value, onChange }) => (
  <>
    <SettingRow title={t('probe.surface.on')}>
      <SegmentedChoice options={ON} value={value.on} onChange={(on) => onChange({ ...value, on })} format={(id) => t(WORDS[id])} label={t('probe.surface.on')} joined />
    </SettingRow>
    <SettingRow title={t('probe.surface.z0')}>
      <SegmentedChoice options={Z0} value={value.z0} onChange={(z0) => onChange({ ...value, z0 })} format={(id) => t(WORDS[id])} label={t('probe.surface.z0')} joined />
    </SettingRow>
  </>
);

/**
 * The figures' group for it, last in the list and closed (review note,
 * 2026-10-01: *"ukryj za kategorią i daj na dół, z domyślnymi wartościami"*):
 * the two switches at its head, the work's thickness only while they differ,
 * and what they are set to in its box.
 */
export const surfaceSection = (one, fields, surface, onSurface) => ({
  id: one.id,
  title: t(one.key),
  fields: surfaceShifts(surface) ? one.fields.filter((field) => fields.includes(field)) : [],
  head: <SurfaceChoice value={surface} onChange={onSurface} />,
  summary: [[t('probe.surface.on'), t(WORDS[surface.on])], [t('probe.surface.z0'), t(WORDS[surface.z0])]],
});

export default SurfaceChoice;
