import { useEffect, useState } from 'react';
import SegmentedChoice from './SegmentedChoice';
import { fetchAutoMode, keepConnectOnOpen, readConnectOnOpen, saveAutoMode } from '../machine/autoConnect';
import { CONNECT_MODES, connectMode, connectPlan, serverBeside } from '../machine/connectMode';
import { t } from '../i18n';

// Written out, so every key is a literal the resources test can find.
const NAMES = {
  manual: 'connect.auto.manual',
  panel: 'connect.auto.panel',
  server: 'connect.auto.server',
};

export const AUTO_NOTES = {
  manual: 'connect.auto.manualNote',
  panel: 'connect.auto.panelNote',
  server: 'connect.auto.serverNote',
};

/**
 * When the port opens unasked — the mode shown and the way to choose one,
 * handed to the row so its note and its scope can follow the choice. See
 * `machine/connectMode` for the two settings behind the one control. Shown
 * only once the server has said its part.
 */
export const useAutoMode = () => {
  const [serverMode, setServerMode] = useState(null);
  const [onOpen, setOnOpen] = useState(readConnectOnOpen);
  useEffect(() => {
    let live = true;
    fetchAutoMode().then((current) => live && setServerMode(current)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const choose = (mode) => {
    const plan = connectPlan(mode, onOpen);
    if (plan.onOpen !== undefined) {
      keepConnectOnOpen(plan.onOpen);
      setOnOpen(plan.onOpen);
    }
    if (plan.server) {
      saveAutoMode(plan.server).then(setServerMode).catch(() => {});
    }
  };
  const known = serverMode !== null;
  return {
    mode: known ? connectMode(serverMode, onOpen) : null,
    // The server's own mode, beside this device's choice (or null).
    beside: known ? serverBeside(serverMode, onOpen) : null,
    choose,
  };
};

/**
 * This device's choice filled; the server's beside it in the lighter mark —
 * the same `covers` face the jog steps use.
 */
const AutoConnectChoice = ({ mode, beside, onChoose }) => (
  <SegmentedChoice
    joined
    fitWide
    label={t('connect.auto.label')}
    options={CONNECT_MODES}
    value={mode}
    covers={(option) => option === beside}
    disabled={mode === null}
    onChange={onChoose}
    format={(id) => t(NAMES[id])}
  />
);

export default AutoConnectChoice;
