import SegmentedChoice from './SegmentedChoice';
import { LANGUAGES, chooseLanguage, currentLanguage, t } from '../i18n';

// Written out, so every key is a literal the resources test can find.
const NAMES = {
  pl: 'language.pl',
  en: 'language.en',
};

/**
 * The panel's language on this device — the control alone; its name is the
 * settings row's.
 *
 * Each language named in itself, `Polski` and `English`, in both: somebody
 * who cannot read the panel's current language is exactly the person looking
 * for this row.
 */
const LanguageChoice = () => (
  <SegmentedChoice
    joined
    fitWide
    label={t('language.label')}
    options={LANGUAGES}
    value={currentLanguage()}
    onChange={chooseLanguage}
    format={(id) => t(NAMES[id])}
  />
);

export default LanguageChoice;
