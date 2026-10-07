import SegmentedChoice from '../../ui/SegmentedChoice';
import SettingRow from '../../ui/SettingRow';
import { t } from '../../i18n/index';

const PASSES = ['1', '2'];
const REPEATS = ['1', '2', '3', '4', '5'];
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

/*
 * A size's passes that count (Mateusz, 2026-10-03: *"do wyboru"*): one, or
 * more for their mean and spread — after the ones that find the centre.
 */
const Repeats = ({ value, onChange }) => (
  <>
    <SettingRow title={t('probe.field.repeats')}>
      <SegmentedChoice options={REPEATS} value={value} onChange={onChange} label={t('probe.field.repeats')} joined />
    </SettingRow>
    <p className="m-0 px-1 text-note text-mut">{t(value === '1' ? 'probe.size.repeatsWhy1' : 'probe.size.repeatsWhyMore')}</p>
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

/*
 * The repeats, last, in a group of their own (the sense report of
 * 2026-10-05, #30): how far a size repeats is seldom asked, so it stays out
 * of the way of the figures every measurement needs.
 */
export const advancedSection = (texts, onText) => ({
  id: 'advanced',
  title: t('probe2.group.advanced'),
  fields: [],
  head: <Repeats value={texts.repeats || '1'} onChange={(text) => onText('repeats', text)} />,
  summary: [[t('probe.field.repeats'), texts.repeats || '1']],
});

export default HolePasses;
