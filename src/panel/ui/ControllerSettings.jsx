import { useEffect, useRef, useState } from 'react';
import AxesSettings from './AxesSettings';
import Card from './Card';
import FadeScroller from './FadeScroller';
import GeometrySettings, { HomingTable } from './GeometrySettings';
import MachinePreview from './MachinePreview';
import Notice from './Notice';
import RawSettings from './RawSettings';
import ReportUnitsFix from './ReportUnitsFix';
import GroupTabs from './GroupTabs';
import SettingControl from './SettingControl';
import SettingRow from './SettingRow';
import SettingsHistory from './SettingsHistory';
import SettingsSaveBar from './SettingsSaveBar';
import { useIsWide } from './shell';
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
const GEOMETRY = 'geo';

// How long a setting reached from the Geometria group stays lit.
const FLASH_MS = 1800;

const refusalText = ({ reason, name }) => {
  if (GRBL_ERROR_KEYS[reason]) {
    return t('machine.bar.grblRefused', { name: name ?? '', code: reason, meaning: t(GRBL_ERROR_KEYS[reason]) });
  }
  return REFUSAL_KEYS[reason] ? t(REFUSAL_KEYS[reason]) : t('refusal.other', { cmd: 'settings:write', reason });
};

// The group last open, for as long as the page lives.
let lastGroup = 'axes';

const Row = ({ row, rows, drafts, onDraft, rule, disabled, flash }) => {
  const text = settingText(row);
  const inactive = isInactive(row, rows, drafts, rule);
  const note = inactive ? t('machine.needs', { name: row.needs }) : text.note;
  return (
    <SettingRow title={text.title} code={row.name} note={note} lit={flash === row.name}>
      {/* A column of its own at the right, as wide as panel v2 gives it, rather than the row's whole width. */}
      <div className="w-full @3xl/shell:max-w-[340px] @3xl/shell:self-end">
        <SettingControl row={row} draft={drafts[row.name]} onDraft={onDraft} rule={rule} disabled={disabled || inactive} label={text.title} />
      </div>
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
  const units = useUnits();
  const { rule } = units;
  const wide = useIsWide();
  const [group, setGroup] = useState(() => lastGroup);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const rows = machine.machineSettings?.rows ?? [];
  const disabled = !machine.canWriteSettings || Boolean(saving);
  const pending = pendingRows(rows, drafts, rule);
  const counts = pendingCounts(pending);
  const bad = pending.some((row) => isBad(row, drafts[row.name], rule));
  const geometry = machine.machineSettings?.geometry;
  /*
   * On a PC the geometry is the axes' own view: the travel in 3D and the
   * homing table beside the table of X, Y and Z — the design's PC layout
   * (Mateusz, 2026-09-26: *"dla pc to jest na widoku osi"*). Narrower, where
   * there is no room beside it, it is a tab of its own (panel v2).
   */
  const geometryTab = geometry && !wide;
  const groups = [...groupsIn(rows).map(({ id }) => id), ...(geometryTab ? [GEOMETRY] : []), HISTORY];
  const [flash, setFlash] = useState(null);
  const flashTimer = useRef(null);
  // From a Geometria line to the setting behind it, lit for a moment.
  const jump = (to, name) => {
    setGroup(to);
    setFlash(name);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
  };
  useEffect(() => () => clearTimeout(flashTimer.current), []);
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
    <GroupTabs
      label={t('machine.groups')}
      options={groups}
      value={shownGroup}
      onChange={setGroup}
      counts={counts}
      format={(id) => t(id === HISTORY ? 'machine.history.title' : GROUPS.find((g) => g.id === id).titleKey)}
    />
  );

  /*
   * The card fills the screen and keeps its head and foot: the group tabs,
   * what the group is about, and the save bar stand still; only the settings
   * between them scroll (Mateusz, 2026-09-26).
   */
  return (
    <Card className="min-h-0 flex-1" bodyClassName="gap-4">
      {!machine.canWriteSettings ? <Notice>{t('machine.readOnly')}</Notice> : null}
      {raw ? (
        <RawSettings rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} canRead={machine.canWriteSettings} />
      ) : (
        <>
          {menu}
          {/*
            * Only what the group is about: its name is the tab lit above
            * (*"czy potrzebujemy duplikowac tytul skoro tab jest zaznaczony?"*,
            * 2026-09-26).
            */}
          {about ? <p className="m-0 shrink-0 text-note text-mut">{t(about.noteKey)}</p> : null}
          <FadeScroller>
            <div className="flex min-w-0 max-w-[1180px] flex-col gap-4">
              {shownGroup === 'axes' ? (
                <div className="flex flex-col gap-6 @3xl/shell:flex-row @3xl/shell:items-start">
                  <div className="min-w-0 flex-1">
                    <AxesSettings rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} flash={flash} />
                  </div>
                  {geometry && wide ? (
                    <div className="flex w-[360px] shrink-0 flex-col gap-2">
                      <MachinePreview className="h-[340px]" envelope={machine.envelope} homing={geometry.homing} />
                      <HomingTable homing={geometry.homing} units={units} />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {shownGroup === HISTORY ? <SettingsHistory history={machine.machineSettings?.history ?? []} /> : null}
              {shownGroup === GEOMETRY ? (
                <GeometrySettings geometry={geometry} envelope={machine.envelope} pending={new Set(pending.map(({ name }) => name))} onJump={jump} />
              ) : null}
              {!['axes', HISTORY, GEOMETRY].includes(shownGroup) ? (
                <div className="flex flex-col">
                  {groupRows(rows, shownGroup).map((row) => (
                    <Row key={row.name} row={row} rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} flash={flash} />
                  ))}
                </div>
              ) : null}
            </div>
          </FadeScroller>
        </>
      )}
      <div className="shrink-0">
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
    </Card>
  );
};

export default ControllerSettings;
