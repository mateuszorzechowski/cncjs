import { useEffect, useState } from 'react';
import SegmentedChoice from './SegmentedChoice';
import { AUTO_MODES, fetchAutoMode, saveAutoMode } from '../machine/autoConnect';
import { t } from '../i18n';

// Written out, so every key is a literal the resources test can find.
const NAMES = {
  server: 'connect.auto.server',
  panel: 'connect.auto.panel',
  manual: 'connect.auto.manual',
};

export const AUTO_NOTES = {
  server: 'connect.auto.serverNote',
  panel: 'connect.auto.panelNote',
  manual: 'connect.auto.manualNote',
};

/**
 * Who opens the port unasked — the control and the mode, handed to the row
 * so its note can say what the chosen mode does. The server's setting; shown
 * only once the server has said which is in force.
 */
export const useAutoMode = () => {
  const [mode, setMode] = useState(null);
  useEffect(() => {
    let live = true;
    fetchAutoMode().then((current) => live && setMode(current)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const choose = (next) => saveAutoMode(next).then(setMode).catch(() => {});
  return [mode, choose];
};

const AutoConnectChoice = ({ mode, onChoose }) => (
  <SegmentedChoice
    joined
    fitWide
    label={t('connect.auto.label')}
    options={AUTO_MODES}
    value={mode}
    disabled={mode === null}
    onChange={onChoose}
    format={(id) => t(NAMES[id])}
  />
);

export default AutoConnectChoice;
