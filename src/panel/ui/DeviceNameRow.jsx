import { useEffect, useState } from 'react';
import SettingRow from './SettingRow';
import TextField from './TextField';
import { useDeviceName } from '../machine/useDeviceName';
import { t } from '../i18n';

/**
 * This device's name — what the journal calls it, so a person can tell who
 * did a thing without an id (Mateusz, 2026-09-26). Detected as specifically
 * as the browser allows; typed over, it is this device's own (kept in the
 * browser). Empty goes back to the detected one. The note says what the
 * server knows of it: the detected name and the address it came from.
 */
const DeviceNameRow = ({ linked }) => {
  const { detected, own, known, rename } = useDeviceName(linked);
  const [draft, setDraft] = useState(own);
  useEffect(() => setDraft(own), [own]);

  const facts = [detected?.name, known?.ip].filter(Boolean).join(' · ');
  const commit = () => {
    if (draft.trim() !== own) {
      rename(draft);
    }
  };

  return (
    <SettingRow
      title={t('connect.device.title')}
      note={facts ? t('connect.device.note', { facts }) : t('connect.device.noteBare')}
      scope="device"
    >
      <TextField
        label={t('connect.device.title')}
        value={draft}
        placeholder={detected?.name || ''}
        maxLength={80}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
    </SettingRow>
  );
};

export default DeviceNameRow;
