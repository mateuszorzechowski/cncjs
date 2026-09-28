import { useEffect, useState } from 'react';
import SegmentedChoice from './SegmentedChoice';
import { fetchAutoMode, keepConnectOnOpen, readConnectOnOpen, saveAutoMode } from '../machine/autoConnect';
import { t } from '../i18n';

/*
 * When the port opens unasked: two settings, two rows (review note,
 * 2026-09-28: *"czy w ramach tej sekcji możemy rozdzielić te akcje, manual i
 * auto dla serwera i osobno połączenie po włączeniu panelu?"*). They were one
 * control of three choices, where this device's choice hid the server's and
 * a lighter mark had to show it underneath; apart, each says its own scope.
 *
 * - the server's, `connection.auto`: `manual` or `server`, the same on every
 *   device;
 * - this device's: whether it connects when the panel is opened, kept in the
 *   browser, because every device keeps its own.
 */
const SERVER_MODES = ['manual', 'server'];
const ON_OPEN = ['off', 'on'];

// Written out, so every key is a literal the resources test can find.
const SERVER_NAMES = {
  manual: 'connect.auto.manual',
  server: 'connect.auto.server',
};
const ON_OPEN_NAMES = {
  off: 'connect.open.off',
  on: 'connect.open.on',
};

export const SERVER_NOTES = {
  manual: 'connect.auto.manualNote',
  server: 'connect.auto.serverNote',
};

/** Both settings, and the way to change each. The server's is `null` until it has said. */
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
  const chooseServer = (mode) => {
    saveAutoMode(mode).then(setServerMode).catch(() => {});
  };
  const chooseOnOpen = (on) => {
    keepConnectOnOpen(on);
    setOnOpen(on);
  };
  return { serverMode, onOpen, chooseServer, chooseOnOpen };
};

/** Manually / when the server starts — the server's, for every device. */
export const ServerConnectChoice = ({ mode, onChoose }) => (
  <SegmentedChoice
    joined
    fitWide
    label={t('connect.auto.label')}
    options={SERVER_MODES}
    value={mode === 'server' ? SERVER_MODES[1] : SERVER_MODES[0]}
    disabled={mode === null}
    onChange={onChoose}
    format={(id) => t(SERVER_NAMES[id])}
  />
);

/** Off / on — this device connecting when the panel is opened. */
export const OnOpenConnectChoice = ({ on, onChoose }) => (
  <SegmentedChoice
    joined
    fitWide
    label={t('connect.open.label')}
    options={ON_OPEN}
    value={ON_OPEN[Number(on)]}
    onChange={(id) => onChoose(id === ON_OPEN[1])}
    format={(id) => t(ON_OPEN_NAMES[id])}
  />
);
