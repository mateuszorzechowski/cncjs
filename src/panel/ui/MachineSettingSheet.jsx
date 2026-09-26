import { useEffect, useRef, useState } from 'react';
import ConfirmSheet from './ConfirmSheet';
import SegmentedChoice from './SegmentedChoice';
import TextField from './TextField';
import ToggleChips from './ToggleChips';
import { maskNumber, maskOptions, maskValue, shownSetting } from '../machine/machineSettings';
import { writeSetting } from '../machine/commands';
import { GRBL_ERROR_KEYS } from '../machine/journalWords';
import { REFUSAL_KEYS } from '../machine/refusal';
import { t } from '../i18n';

/**
 * One of Grbl's settings, changed — and the confirmation, in one sheet.
 *
 * Every write goes to the controller's EEPROM (Mateusz, 2026-09-26: *"każdy
 * zapis = EEPROM, więc z potwierdzeniem"*), so the sheet says what is there
 * now, takes the new value, and writes only on its own button, under a
 * warning that says where it goes. What comes back is the server's: the
 * sheet closes when `$$` reports the new value, and stays open with the
 * reason when the server or Grbl refuses — the typed value kept.
 *
 * `raw`: the value as Grbl has it, in millimetres, for the `$x` view;
 * otherwise in the server's units, which the server converts back.
 */

// How long to wait for the new value before saying nothing came back.
const ANSWER_MS = 5000;

const figureOnly = (text) => text.replace(/[^0-9.,-]/g, '');

const refusalText = (reason) => {
  if (GRBL_ERROR_KEYS[reason]) {
    return t('machine.sheet.grblRefused', { code: reason, meaning: t(GRBL_ERROR_KEYS[reason]) });
  }
  return REFUSAL_KEYS[reason] ? t(REFUSAL_KEYS[reason]) : t('refusal.other', { cmd: 'settings:write', reason });
};

const Control = ({ row, draft, setDraft, unit, label }) => {
  if (row.kind === 'bool') {
    return (
      <SegmentedChoice
        label={label}
        options={[0, 1]}
        value={draft}
        onChange={setDraft}
        format={(on) => t(on ? 'machine.on' : 'machine.off')}
      />
    );
  }
  if (row.kind === 'mask' && row.bits) {
    return <ToggleChips label={label} options={maskOptions(row.bits)} value={draft} onChange={setDraft} />;
  }
  return (
    <TextField
      label={label}
      inputMode="decimal"
      unit={unit}
      value={draft}
      onChange={(event) => setDraft(figureOnly(event.target.value))}
    />
  );
};

const MachineSettingSheet = ({ row, text, rule, raw, refusal, onClose }) => {
  const shown = raw ? { value: row.raw ?? String(row.value), unit: '' } : shownSetting(row, rule);
  const initial = () => {
    if (row.kind === 'bool') {
      return row.value ? 1 : 0;
    }
    return row.kind === 'mask' && row.bits ? maskValue(row.value) : shown.value;
  };
  const [draft, setDraft] = useState(initial);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);
  const openedWith = useRef(row.value);

  const value = row.kind === 'mask' && row.bits ? maskNumber(draft) : draft;
  const unchanged = row.kind === 'bool' || (row.kind === 'mask' && row.bits)
    ? value === row.value
    : String(draft).trim() === '' || Number(String(draft).replace(',', '.')) === Number(String(shown.value).replace(',', '.'));

  // The new value reported: done.
  useEffect(() => {
    if (sent && row.value !== openedWith.current) {
      onClose();
    }
  }, [sent, row.value, onClose]);

  // Refused, by the server or by Grbl: said here, the value kept.
  useEffect(() => {
    if (sent && refusal?.cmd === 'settings:write' && refusal.seq > sent.seq) {
      setError(refusalText(refusal.reason));
      setSent(null);
    }
  }, [sent, refusal]);

  useEffect(() => {
    if (!sent) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setError(t('machine.sheet.noAnswer'));
      setSent(null);
    }, ANSWER_MS);
    return () => clearTimeout(timer);
  }, [sent]);

  const save = () => {
    setError(null);
    setSent({ seq: refusal?.seq ?? 0 });
    writeSetting({ name: row.name, value, units: raw ? undefined : rule?.name });
  };

  return (
    <ConfirmSheet
      title={t('machine.sheet.title', { title: text.title, name: row.name })}
      note={text.note}
      warning={t('machine.sheet.eeprom')}
      confirmLabel={t('machine.sheet.save')}
      tone="primary"
      busy={Boolean(sent) || unchanged}
      onConfirm={save}
      onClose={onClose}
    >
      <p className="m-0 font-num text-note text-mut">
        {t('machine.sheet.now', { value: shown.value, unit: shown.unit })}
      </p>
      <Control row={row} draft={draft} setDraft={setDraft} unit={shown.unit} label={text.title} />
      {error ? <p className="m-0 text-note text-red">{error}</p> : null}
    </ConfirmSheet>
  );
};

export default MachineSettingSheet;
