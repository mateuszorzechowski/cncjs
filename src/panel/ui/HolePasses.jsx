import SegmentedChoice from './SegmentedChoice';
import SettingRow from './SettingRow';
import { t } from '../i18n';

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

/** The measuring group with the switch at its head — and a size's repeats — and the passes said in its box. */
export const passesSection = (one, fields, texts, onText) => {
  const repeats = one.repeats && fields.includes('repeats');
  return {
    id: one.id,
    title: t(one.key),
    fields: one.fields.filter((field) => fields.includes(field)),
    head: (
      <>
        <HolePasses value={texts.holePasses || '2'} onChange={(text) => onText('holePasses', text)} />
        {repeats ? <Repeats value={texts.repeats || '1'} onChange={(text) => onText('repeats', text)} /> : null}
      </>
    ),
    summary: [
      [t('probe.field.holePasses'), texts.holePasses || '2'],
      ...(repeats ? [[t('probe.field.repeats'), texts.repeats || '1']] : []),
    ],
  };
};

export default HolePasses;
