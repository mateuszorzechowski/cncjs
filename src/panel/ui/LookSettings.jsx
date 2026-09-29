import LookChoice from './LookChoice';
import SettingRow from './SettingRow';
import { DENSITY, NUM_FONT, TEXT_SIZE } from './look';
import { t } from '../i18n';

/**
 * Density, text size and number face, under the theme: this device's, like it.
 *
 * The faces keep their own names — they are names, like a port's — but each
 * still goes through a key, so the rule that every displayed value has one
 * holds without an exception to explain.
 */
const LookSettings = () => (
  <>
    <SettingRow title={t('density.label')} note={t('density.note')}>
      <LookChoice
        look={DENSITY}
        label={t('density.label')}
        labels={{ comfortable: t('density.comfortable'), compact: t('density.compact') }}
      />
    </SettingRow>
    <SettingRow title={t('textSize.label')} note={t('textSize.note')}>
      <LookChoice
        look={TEXT_SIZE}
        label={t('textSize.label')}
        labels={{ small: t('textSize.small'), normal: t('textSize.normal'), large: t('textSize.large') }}
      />
    </SettingRow>
    <SettingRow title={t('numFont.label')} note={t('numFont.note')}>
      <LookChoice
        look={NUM_FONT}
        label={t('numFont.label')}
        labels={{
          azeret: t('numFont.azeret'),
          jetbrains: t('numFont.jetbrains'),
          plex: t('numFont.plex'),
          segment: t('numFont.segment'),
        }}
      />
    </SettingRow>
  </>
);

export default LookSettings;
