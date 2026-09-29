import Sheet from './Sheet';
import { t } from '../i18n';

/**
 * What MDI does and how its line is typed, behind the `?` beside the state
 * chip, as on every screen with help (review note, 2026-09-29: *"pomoc na
 * górze koło statusu"*).
 */
const MdiHelp = ({ onClose }) => (
  <Sheet title={t('mdi.help.title')} onClose={onClose}>
    <p className="m-0 text-base text-ink">{t('mdi.help.what')}</p>
    <p className="m-0 text-base text-ink">{t('mdi.help.keys')}</p>
    <p className="m-0 text-base text-ink">{t('mdi.help.console')}</p>
    <p className="m-0 text-base text-ink">{t('mdi.help.alarm')}</p>
  </Sheet>
);

export default MdiHelp;
