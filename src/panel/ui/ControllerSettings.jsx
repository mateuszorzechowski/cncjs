import { useEffect, useRef, useState } from 'react';
import Card from './Card';
import ConfirmSheet from './ConfirmSheet';
import FadeScroller from './FadeScroller';
import GeometrySettings from './GeometrySettings';
import RawSettings from './RawSettings';
import ControllerGroup from './ControllerGroup';
import ControllerMemory from './ControllerMemory';
import SettingsHistory from './SettingsHistory';
import SettingsPendingBar from './SettingsPendingBar';
import SettingsReview from './SettingsReview';
import Sheet from './Sheet';
import UndoNotice from './UndoNotice';
import { useIsPhone, useIsWide } from './shell';
import useSettingsPreview from './useSettingsPreview';
import useSettingsWrite from './useSettingsWrite';
import { useUnits } from './units';
import {
  GROUPS, groupsIn, isBad, pendingGroups, pendingRows, restoreDrafts,
} from '../machine/machineSettings';
import { readSettings } from '../machine/commands';
import { t } from '../i18n';

/**
 * The Sterownik tab: Grbl's settings, after the settings handoff of
 * 2026-09-28 — a list of groups that opens a group, one bar for the changes
 * not yet written, and one review that writes them.
 *
 * The list is `ControllerMemory`. A group opens in a sheet on a phone, in
 * the list's place on a tablet, beside the list on a PC; Geometria is a
 * sheet on a phone and a column wider. Nothing reaches the controller
 * before the review's "Zapisz w sterowniku".
 *
 * The server lists, converts, checks, writes and reads back; the panel keeps
 * only what was typed.
 */

// How long a setting reached from the Geometria summary stays lit.
const FLASH_MS = 1800;

const HISTORY = 'history';
const RAW = 'raw';
const GEOMETRY = 'geo';
const REVIEW = 'review';
const REREAD = 'reread';

// The settings Geometria is drawn from, as the tablet's column names them.
const GEOMETRY_CODES = '$130–132 · $23';

const groupTitle = (id) => t(GROUPS.find((g) => g.id === id).titleKey);

const ControllerSettings = ({ machine }) => {
  const units = useUnits();
  const { rule } = units;
  const phone = useIsPhone();
  // A PC's three columns: the list, the group chosen in it, Geometria (frames PC).
  const wide = useIsWide();
  const [drafts, setDrafts] = useState({});
  // The group being edited: a sheet on a phone, the list's place wider.
  const [group, setGroup] = useState(null);
  // What is over the screen: Geometria (a phone's), the history, `$$`, the review, or "read over the changes?".
  const [open, setOpen] = useState(null);
  const [discarded, setDiscarded] = useState(null);
  const view = machine.machineSettings;
  const rows = view?.rows ?? [];
  const pending = pendingRows(rows, drafts, rule);
  // Written and read back: every draft now matches the controller.
  const { saving, error, setError, save } = useSettingsWrite(machine, pending, drafts, rule, () => {
    setDrafts({});
    setOpen(null);
  });
  const disabled = !machine.canWriteSettings || saving;
  const bad = pending.some((row) => isBad(row, drafts[row.name], rule));
  const geometry = view?.geometry;
  const [flash, setFlash] = useState(null);
  const flashTimer = useRef(null);
  // From a Geometria line to the setting behind it, lit for a moment.
  const jump = (to, name) => {
    setOpen(null);
    setGroup(to);
    setFlash(name);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
  };
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const preview = useSettingsPreview(machine, pending, drafts, rule);
  const geometryAfter = preview?.geometry ?? geometry;
  const changedLines = preview?.changed ?? [];

  // The review with nothing left in it has nothing to say.
  useEffect(() => {
    if (open === REVIEW && pending.length === 0 && !saving) {
      setOpen(null);
    }
  }, [open, pending.length, saving]);

  const onDraft = (name, draft) => setDrafts((now) => ({ ...now, [name]: draft }));
  const close = () => setOpen(null);
  // No "are you sure": they are only this panel's edits, and "Cofnij" brings them back (frame E3).
  const discard = () => {
    setDiscarded({ seq: (discarded?.seq ?? 0) + 1, text: t('machine.discarded', { count: pending.length }), drafts });
    setDrafts({});
    setError(null);
    setOpen(null);
  };
  const undo = () => {
    setDrafts(discarded.drafts);
    setDiscarded(null);
  };
  // Reading again replaces what is on screen, so with changes waiting it asks first.
  const read = () => (pending.length > 0 ? setOpen(REREAD) : readSettings());

  if (rows.length === 0) {
    return (
      <Card className="flex-1">
        <p className="m-0 text-note text-mut">{t(machine.connected ? 'machine.waiting' : 'machine.empty')}</p>
      </Card>
    );
  }

  const groups = groupsIn(rows);
  // On a PC one group is always chosen, the first until another is.
  const shownGroup = groups.find(({ id }) => id === group)?.id ?? (wide ? groups[0]?.id : undefined);
  const card = (
    <ControllerMemory
      view={view}
      groups={groups}
      chosen={shownGroup}
      rule={rule}
      canWrite={machine.canWriteSettings}
      onRead={read}
      onGroup={setGroup}
      onGeometry={() => setOpen(GEOMETRY)}
      onHistory={() => setOpen(HISTORY)}
      onRaw={() => setOpen(RAW)}
    />
  );

  const groupView = shownGroup ? (
    <ControllerGroup
      group={shownGroup}
      rows={rows}
      drafts={drafts}
      onDraft={onDraft}
      rule={rule}
      disabled={disabled}
      readOnly={!machine.canWriteSettings}
      flash={flash}
      inline={!phone}
      onClose={() => setGroup(null)}
      onBack={phone || wide ? undefined : () => setGroup(null)}
    />
  ) : null;
  const geometryView = geometry ? (
    <GeometrySettings
      geometry={geometryAfter}
      was={geometry.summary}
      changed={changedLines}
      envelope={preview?.envelope ?? machine.envelope}
      onJump={jump}
    />
  ) : null;
  const bar = pending.length > 0 ? (
    <SettingsPendingBar pending={pending} groups={pendingGroups(pending)} error={error} onReview={() => setOpen(REVIEW)} />
  ) : null;

  /*
   * A phone: the card scrolls whole, the bar under it, a group and
   * Geometria in sheets (frames E). Wider: the list — or the group opened
   * in its place — with the bar under it, and beside them Geometria, always
   * there and down to the status bar, so what a change does to the box is in
   * sight while it is typed (frames GT).
   */
  return (
    <div className={`flex min-h-0 flex-1 gap-gap ${phone ? 'flex-col' : 'flex-row'}`}>
      {phone ? (
        <>
          <FadeScroller>
            <div className="flex min-h-full flex-col">{card}</div>
          </FadeScroller>
          {bar}
          {groupView}
          {open === GEOMETRY && geometryView ? <Sheet title={groupTitle(GEOMETRY)} onClose={close}>{geometryView}</Sheet> : null}
        </>
      ) : (
        <>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap">
            {wide ? (
              <div className="flex min-h-0 flex-1 gap-gap">
                <div className="flex min-h-0 w-setcol shrink-0 flex-col">{card}</div>
                {groupView}
              </div>
            ) : groupView || card}
            {bar}
          </div>
          {geometryView ? (
            <Card label={groupTitle(GEOMETRY)} aside={GEOMETRY_CODES} className="min-h-0 w-setcol shrink-0">
              <FadeScroller>{geometryView}</FadeScroller>
            </Card>
          ) : null}
        </>
      )}

      {open === HISTORY ? (
        <SettingsHistory
          history={view.history ?? []}
          disabled={disabled}
          onRestore={(entry) => {
            setDrafts((now) => ({ ...now, ...restoreDrafts(entry, rows) }));
            close();
          }}
          onImport={(imported) => setDrafts((now) => ({ ...now, ...imported }))}
          onClose={close}
        />
      ) : null}
      {open === RAW ? (
        <Sheet title={t('machine.raw.title')} onClose={close}>
          <RawSettings rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} />
        </Sheet>
      ) : null}
      {open === REVIEW ? (
        <SettingsReview
          geometry={changedLines.length > 0 ? { after: geometryAfter, was: geometry.summary, changed: changedLines, envelope: preview?.envelope ?? machine.envelope } : null}
          onJump={jump}
          pending={pending}
          drafts={drafts}
          rule={rule}
          bad={bad}
          saving={saving}
          error={error}
          canWrite={machine.canWriteSettings}
          onUndo={(name) => setDrafts((now) => {
            const next = { ...now };
            delete next[name];
            return next;
          })}
          onDiscard={discard}
          onSave={save}
          onClose={close}
        />
      ) : null}
      {open === REREAD ? (
        <ConfirmSheet
          title={t('machine.readOver.title')}
          note={t('machine.readOver.note', { count: pending.length })}
          confirmLabel={t('machine.readOver.confirm')}
          tone="primary"
          onConfirm={() => {
            setDrafts({});
            close();
            readSettings();
          }}
          onClose={close}
        />
      ) : null}
      <UndoNotice
        notice={discarded}
        onUndo={undo}
        className={phone ? 'inset-x-shellPad bottom-[calc(var(--navBite)+var(--gap))]' : 'inset-x-shellPad bottom-shellPad'}
      />
    </div>
  );
};

export default ControllerSettings;
