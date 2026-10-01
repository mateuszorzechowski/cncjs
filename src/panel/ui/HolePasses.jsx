import SegmentedChoice from './SegmentedChoice';
import SettingRow from './SettingRow';
import { t } from '../i18n';

const PASSES = ['1', '2'];
// Why one would pick each, named whole so the translations are found.
const WHY = { 1: 'probe.hole.passesWhy1', 2: 'probe.hole.passesWhy2' };

/**
 * Across the hole once or twice (Mateusz, 2026-10-01: *"opcja jednego
 * przejścia z uzasadnieniem"*): the switch, and under it why one would pick
 * what is picked. Kept with the figures (`holePasses`), so it is remembered
 * as they are.
 */
const HolePasses = ({ value, onChange }) => (
  <>
    <SettingRow title={t('probe.field.holePasses')}>
      <SegmentedChoice options={PASSES} value={value} onChange={onChange} label={t('probe.field.holePasses')} joined />
    </SettingRow>
    <p className="m-0 px-1 text-note text-mut">{t(WHY[value] || WHY[2])}</p>
  </>
);

/** The measuring group with the switch at its head, and the passes said in its box. */
export const passesSection = (one, fields, texts, onText) => ({
  id: one.id,
  title: t(one.key),
  fields: one.fields.filter((field) => fields.includes(field)),
  head: <HolePasses value={texts.holePasses || '2'} onChange={(text) => onText('holePasses', text)} />,
  summary: [[t('probe.field.holePasses'), texts.holePasses || '2']],
});

export default HolePasses;
