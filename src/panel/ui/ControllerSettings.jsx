import { useEffect, useState } from 'react';
import AxesSettings from './AxesSettings';
import Card from './Card';
import Notice from './Notice';
import RawSettings from './RawSettings';
import ReportUnitsFix from './ReportUnitsFix';
import SegmentedChoice from './SegmentedChoice';
import SettingControl from './SettingControl';
import SettingRow from './SettingRow';
import SettingsHistory from './SettingsHistory';
import SettingsSaveBar from './SettingsSaveBar';
import { useIsPhone } from './shell';
import { useUnits } from './units';
import {
  changesOf, GROUPS, groupRows, groupsIn, isBad, isInactive, pendingCounts, pendingRows, settingText,
} from '../machine/machineSettings';
import { writeSettings } from '../machine/commands';
import { GRBL_ERROR_KEYS } from '../machine/journalWords';
import { REFUSAL_KEYS } from '../machine/refusal';
import { t } from '../i18n';

/**
 * The Sterownik tab: Grbl's settings, after the settings design of
 * 2026-09-26 — groups in a menu with a count of changes beside each, one
 * group at a time, values edited where they stand, and nothing reaching the
 * controller before the bar at the bottom writes it, after asking.
 *
 * `raw` is the switch in the tab row: the same drafts shown as Grbl's `$$`.
 * The server lists, converts, checks, writes and reads back; the panel keeps
 * only what was typed.
 */

// How long a write may take to come back before the bar says nothing did.
const ANSWER_MS = 10000;

const HISTORY = 'history';

const refusalText = ({ reason, name }) => {
  if (GRBL_ERROR_KEYS[reason]) {
    return t('machine.bar.grblRefused', { name: name ?? '', code: reason, meaning: t(GRBL_ERROR_KEYS[reason]) });
  }
  return REFUSAL_KEYS[reason] ? t(REFUSAL_KEYS[reason]) : t('refusal.other', { cmd: 'settings:write', reason });
};

// The group last open, for as long as the page lives.
let lastGroup = 'axes';

const Row = ({ row, rows, drafts, onDraft, rule, disabled }) => {
  const text = settingText(row);
  const inactive = isInactive(row, rows, drafts, rule);
  const note = inactive ? t('machine.needs', { name: row.needs }) : text.note;
  return (
    <SettingRow title={<>{text.title} <span className="font-num text-cap font-normal text-mut">{row.name}</span></>} note={note}>
      <SettingControl row={row} draft={drafts[row.name]} onDraft={onDraft} rule={rule} disabled={disabled || inactive} label={text.title} />
      {row.wrong ? (
        <div className="flex flex-wrap items-center gap-3 rounded-ctl border border-red bg-redS px-3 py-2">
          <span className="flex-1 text-note text-red">{t('machine.reportFix.wrong')}</span>
          <ReportUnitsFix disabled={disabled} />
        </div>
      ) : null}
    </SettingRow>
  );
};

const ControllerSettings = ({ machine, raw }) => {
  const phone = useIsPhone();
  const { rule } = useUnits();
  const [group, setGroup] = useState(() => lastGroup);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const rows = machine.machineSettings?.rows ?? [];
  const disabled = !machine.canWriteSettings || Boolean(saving);
  const pending = pendingRows(rows, drafts, rule);
  const counts = pendingCounts(pending);
  const bad = pending.some((row) => isBad(row, drafts[row.name], rule));
  const groups = [...groupsIn(rows).map(({ id }) => id), HISTORY];
  const shownGroup = groups.includes(group) ? group : groups[0];
  const about = GROUPS.find(({ id }) => id === shownGroup);

  useEffect(() => {
    lastGroup = group;
  }, [group]);

  // Written and read back: every draft now matches the controller.
  useEffect(() => {
    if (saving && pending.length === 0) {
      setSaving(null);
      setDrafts({});
    }
  }, [saving, pending.length]);

  // Refused by the server or by Grbl: said in the bar, the drafts kept.
  const refusal = machine.refusal;
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

  const onDraft = (name, draft) => setDrafts((now) => ({ ...now, [name]: draft }));
  const save = () => {
    setError(null);
    setSaving({ seq: refusal?.seq ?? 0 });
    writeSettings(changesOf(pending, drafts, rule));
  };

  if (rows.length === 0) {
    return (
      <Card className="flex-1">
        <p className="m-0 text-note text-mut">{t(machine.connected ? 'machine.waiting' : 'machine.empty')}</p>
      </Card>
    );
  }

  const menu = (
    <SegmentedChoice
      label={t('machine.groups')}
      options={groups}
      value={shownGroup}
      onChange={setGroup}
      columns={phone ? undefined : 1}
      compact={phone}
      counts={Object.fromEntries(groups.map((id) => [id, counts[id] || undefined]))}
      format={(id) => t(id === HISTORY ? 'machine.history.title' : GROUPS.find((g) => g.id === id).titleKey)}
    />
  );

  return (
    <Card className="flex-1">
      <div className="flex flex-col gap-4">
        {!machine.canWriteSettings ? <Notice>{t('machine.readOnly')}</Notice> : null}
        {raw ? (
          <RawSettings rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} canRead={machine.canWriteSettings} />
        ) : (
          <div className="flex flex-col gap-4 @3xl/shell:flex-row @3xl/shell:items-start">
            <div className={phone ? '-mx-1 overflow-x-auto px-1' : 'w-52 shrink-0'}>{menu}</div>
            <div className="flex min-w-0 max-w-[1180px] flex-1 flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="m-0 text-lead font-semibold text-ink">{t(about ? about.titleKey : 'machine.history.title')}</h2>
                {about ? <p className="m-0 text-note text-mut">{t(about.noteKey)}</p> : null}
              </div>
              {shownGroup === 'axes' ? (
                <AxesSettings rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} />
              ) : null}
              {shownGroup === HISTORY ? <SettingsHistory history={machine.machineSettings?.history ?? []} /> : null}
              {shownGroup !== 'axes' && shownGroup !== HISTORY ? (
                <div className="flex flex-col">
                  {groupRows(rows, shownGroup).map((row) => (
                    <Row key={row.name} row={row} rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
        <div className="sticky bottom-0">
          <SettingsSaveBar
            pending={pending}
            drafts={drafts}
            raw={raw}
            rule={rule}
            readAt={machine.machineSettings?.readAt}
            count={rows.length}
            bad={bad}
            saving={Boolean(saving)}
            error={error}
            canWrite={machine.canWriteSettings}
            onDiscard={() => {
              setDrafts({});
              setError(null);
            }}
            onSave={save}
          />
        </div>
      </div>
    </Card>
  );
};

export default ControllerSettings;
