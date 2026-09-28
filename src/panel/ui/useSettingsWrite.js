import { useEffect, useState } from 'react';
import { changesOf } from '../machine/machineSettings';
import { writeSettings } from '../machine/commands';
import { GRBL_ERROR_KEYS } from '../machine/journalWords';
import { REFUSAL_KEYS } from '../machine/refusal';
import { t } from '../i18n';

// How long a write may take to come back before the review says nothing did.
const ANSWER_MS = 10000;

const refusalText = ({ reason, name }) => {
  if (GRBL_ERROR_KEYS[reason]) {
    return t('machine.bar.grblRefused', { name: name ?? '', code: reason, meaning: t(GRBL_ERROR_KEYS[reason]) });
  }
  return REFUSAL_KEYS[reason] ? t(REFUSAL_KEYS[reason]) : t('refusal.other', { cmd: 'settings:write', reason });
};

/**
 * A write of the waiting changes to the controller, and how it ended.
 *
 * Done when `$$` read back after it matches every draft — `onWritten` then;
 * refused by the server or by Grbl, the reason in `error` and the drafts
 * kept; with no answer in ten seconds, said so. `saving` while it is under
 * way, so nothing is edited over it.
 */
const useSettingsWrite = (machine, pending, drafts, rule, onWritten) => {
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const refusal = machine.refusal;

  useEffect(() => {
    if (saving && pending.length === 0) {
      setSaving(null);
      onWritten();
    }
  }, [saving, pending.length]);

  useEffect(() => {
    if (saving && refusal?.cmd === 'settings:write' && refusal.seq > saving.seq) {
      setError(refusalText(refusal));
      setSaving(null);
    }
  }, [saving, refusal]);

  useEffect(() => {
    if (!saving) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setError(t('machine.bar.noAnswer'));
      setSaving(null);
    }, ANSWER_MS);
    return () => clearTimeout(timer);
  }, [saving]);

  const save = () => {
    setError(null);
    setSaving({ seq: refusal?.seq ?? 0 });
    writeSettings(changesOf(pending, drafts, rule));
  };

  return { saving: Boolean(saving), error, setError, save };
};

export default useSettingsWrite;
