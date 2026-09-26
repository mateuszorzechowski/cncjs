import SegmentedChoice from './SegmentedChoice';
import { setKeepAwake } from './keepAwake';
import { t } from '../i18n';

const OPTIONS = ['off', 'on'];

// Written out, so every key is a literal the resources test can find.
const LABELS = {
  off: 'keepAwake.off',
  on: 'keepAwake.on',
};

/**
 * Off / On — this device keeping its screen on while the panel is open. Dark
 * where the page cannot do it; the row's note says why (`keepAwakeNote`).
 */
const KeepAwakeChoice = ({ status }) => {
  const [off, on] = OPTIONS;
  return (
    <SegmentedChoice
      joined
      fitWide
      label={t('keepAwake.label')}
      options={OPTIONS}
      value={status.on ? on : off}
      disabled={status.support !== 'ok'}
      onChange={(id) => setKeepAwake(id === on)}
      format={(id) => t(LABELS[id])}
    />
  );
};

/** The row's note: what it does, or why it cannot, or that the browser said no. */
export const keepAwakeNote = ({ on, support, state }) => {
  if (support === 'insecure') {
    return t('keepAwake.insecure');
  }
  if (support === 'unsupported') {
    return t('keepAwake.unsupported');
  }
  if (on && state === 'refused') {
    return t('keepAwake.refused');
  }
  return t('keepAwake.note');
};

export default KeepAwakeChoice;
