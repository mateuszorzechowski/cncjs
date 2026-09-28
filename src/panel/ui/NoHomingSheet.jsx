import Button from './Button';
import Sheet from './Sheet';
import { t } from '../i18n';

/**
 * What the amber mark in the top bar means: the machine is not homed (`$22=0`,
 * the server's `envelope.placed` false), so nothing guards the ends of its
 * axes. Measured on COM3, 2026-09-28: MDI drove 100 mm past the travel, and a
 * "retract" to machine Z0 went down. Said once, here, for every screen.
 *
 * `onSettings` goes to the controller's settings, where homing is switched on.
 */
const NoHomingSheet = ({ onSettings, onClose }) => (
  <Sheet
    title={t('caution.title')}
    onClose={onClose}
    footer={<Button tone="primary" className="h-ctl w-full" onClick={onSettings}>{t('caution.settings')}</Button>}
  >
    <p className="m-0 text-base text-ink">{t('caution.where')}</p>
    <p className="m-0 text-base text-ink">{t('caution.guards')}</p>
    <p className="m-0 text-base text-ink">{t('caution.moves')}</p>
    <p className="m-0 text-note text-mut">{t('caution.fix')}</p>
  </Sheet>
);

export default NoHomingSheet;
