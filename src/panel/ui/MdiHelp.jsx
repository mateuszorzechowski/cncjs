import KeyRow from './KeyRow';
import Sheet from './Sheet';
import { t } from '../i18n';

/**
 * What MDI does, and its keys and buttons row by row as the jog's shortcuts
 * are, behind the `?` beside the state chip (review notes, 2026-09-29:
 * *"pomoc na górze koło statusu"*, *"przyciski i skróty klawiszowe opisane —
 * jak w jog"*).
 */
const MdiHelp = ({ onClose }) => (
  <Sheet title={t('mdi.help.title')} onClose={onClose}>
    <p className="m-0 text-base text-ink">{t('mdi.help.what')}</p>
    <div className="flex flex-col">
      <KeyRow keys={[t('mdi.help.key.enter')]} does={t('mdi.help.send')} />
      <KeyRow keys={[t('shortcuts.key.up'), t('shortcuts.key.down')]} does={t('mdi.help.history')} />
      <KeyRow keys={[t('mdi.help.key.suggest')]} does={t('mdi.help.suggest')} />
      <KeyRow keys={[t('shortcuts.key.up'), t('shortcuts.key.down'), t('mdi.help.key.enter')]} does={t('mdi.help.pick')} />
      <KeyRow keys={[t('shortcuts.key.escape')]} does={t('mdi.help.dismiss')} />
      <KeyRow keys={[t('mdi.send')]} does={t('mdi.help.sendButton')} />
      <KeyRow keys={[t('mdi.clear')]} does={t('mdi.help.clearButton')} />
    </div>
    <p className="m-0 text-base text-ink">{t('mdi.help.console')}</p>
    <p className="m-0 text-base text-ink">{t('mdi.help.alarm')}</p>
  </Sheet>
);

export default MdiHelp;
