import { useEffect, useRef, useState } from 'react';
import Button from './Button';
import Card from './Card';
import ConfirmSheet from './ConfirmSheet';
import FadeScroller from './FadeScroller';
import GeometrySettings from './GeometrySettings';
import Icon from './Icon';
import Notice from './Notice';
import RawSettings from './RawSettings';
import SettingSummary from './SettingSummary';
import SettingsGroupSheet from './SettingsGroupSheet';
import SettingsHistory, { historyLine } from './SettingsHistory';
import SettingsPendingBar from './SettingsPendingBar';
import SettingsReview from './SettingsReview';
import Sheet from './Sheet';
import UndoNotice from './UndoNotice';
import { useIsPhone } from './shell';
import { useUnits } from './units';
import {
  changesOf, GROUPS, groupLine, groupsIn, isBad, pendingGroups, pendingRows, restoreDrafts,
} from '../machine/machineSettings';
import { figure, lengthLabel } from '../machine/units';
import { readSettings, writeSettings } from '../machine/commands';
import { GRBL_ERROR_KEYS } from '../machine/journalWords';
import { REFUSAL_KEYS } from '../machine/refusal';
import { t } from '../i18n';

/**
 * The Sterownik tab: Grbl's settings, after the settings handoff of
 * 2026-09-28 — a list of groups that opens a group, one bar for the changes
 * not yet written, and one review that writes them.
 *
 * The card says what it is reading — PAMIĘĆ STEROWNIKA and the firmware —
 * and reads it again with ↻. Each group's line shows its values, from the
 * server; under a rule, the two things that are not groups: the history of
 * writes, and Grbl's own `$$`. A group opens in a sheet (frame D2); nothing
 * reaches the controller before the review's "Zapisz w sterowniku".
 *
 * The same on every width for now. The tablet's and the PC's columns — a
 * group beside the list, Geometria beside both — are the next two steps.
 *
 * The server lists, converts, checks, writes and reads back; the panel keeps
 * only what was typed.
 */

// How long a write may take to come back before the review says nothing did.
const ANSWER_MS = 10000;

// How long a setting reached from the Geometria summary stays lit.
const FLASH_MS = 1800;

const HISTORY = 'history';
const RAW = 'raw';
const GEOMETRY = 'geo';
const REVIEW = 'review';
const REREAD = 'reread';

const refusalText = ({ reason, name }) => {
  if (GRBL_ERROR_KEYS[reason]) {
    return t('machine.bar.grblRefused', { name: name ?? '', code: reason, meaning: t(GRBL_ERROR_KEYS[reason]) });
  }
  return REFUSAL_KEYS[reason] ? t(REFUSAL_KEYS[reason]) : t('refusal.other', { cmd: 'settings:write', reason });
};

const groupTitle = (id) => t(GROUPS.find((g) => g.id === id).titleKey);

const ControllerSettings = ({ machine }) => {
  const units = useUnits();
  const { rule } = units;
  const phone = useIsPhone();
  const [drafts, setDrafts] = useState({});
  // What is open over the list: a group, Geometria, the history, `$$`, the review, or "read over the changes?".
  const [open, setOpen] = useState(null);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const [discarded, setDiscarded] = useState(null);
  const view = machine.machineSettings;
  const rows = view?.rows ?? [];
  const disabled = !machine.canWriteSettings || Boolean(saving);
  const pending = pendingRows(rows, drafts, rule);
  const bad = pending.some((row) => isBad(row, drafts[row.name], rule));
  const geometry = view?.geometry;
  const [flash, setFlash] = useState(null);
  const flashTimer = useRef(null);
  // From a Geometria line to the setting behind it, lit for a moment.
  const jump = (to, name) => {
    setOpen(to);
    setFlash(name);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
  };
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // Written and read back: every draft now matches the controller.
  useEffect(() => {
    if (saving && pending.length === 0) {
      setSaving(null);
      setDrafts({});
      setOpen(null);
    }
  }, [saving, pending.length]);

  // The review with nothing left in it has nothing to say.
  useEffect(() => {
    if (open === REVIEW && pending.length === 0 && !saving) {
      setOpen(null);
    }
  }, [open, pending.length, saving]);

  // Refused by the server or by Grbl: said in the review and the bar, the drafts kept.
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
  const close = () => setOpen(null);
  const save = () => {
    setError(null);
    setSaving({ seq: refusal?.seq ?? 0 });
    writeSettings(changesOf(pending, drafts, rule));
  };
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

  const firmware = view.firmware;
  const summaries = view.groups ?? [];
  const groups = groupsIn(rows);
  const travel = geometry?.summary.find(({ id }) => id === 'travel')?.value;

  const list = (
    <div className="flex flex-col gap-2">
      {!machine.canWriteSettings ? <Notice>{t('machine.readOnly')}</Notice> : null}
      {groups.map(({ id }) => (
        <SettingSummary
          key={id}
          title={groupTitle(id)}
          values={groupLine(summaries.find(({ group }) => group === id), rule)}
          onOpen={() => setOpen(id)}
        />
      ))}
      {geometry ? (
        <SettingSummary
          title={groupTitle(GEOMETRY)}
          values={travel ? [{ value: ['x', 'y', 'z'].map((axis) => figure(travel[axis], rule, 'extent')).join(' × '), unit: lengthLabel(rule) }] : []}
          onOpen={() => setOpen(GEOMETRY)}
        />
      ) : null}
      {/* Not groups: what was written, and Grbl's own list. */}
      <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
        <SettingSummary title={t('machine.history.title')} values={[{ value: historyLine(view.history ?? []) }]} onOpen={() => setOpen(HISTORY)} />
        <SettingSummary title={t('machine.raw.title')} values={[{ value: t('machine.raw.count', { count: rows.length }) }]} onOpen={() => setOpen(RAW)} />
      </div>
    </div>
  );

  /*
   * The card's head reads what it is and has the one action; on a phone the
   * whole card scrolls with it, as the other tabs do, and wider the head
   * stands and the list scrolls under it (handoff, "Przewijanie").
   */
  const card = (
    <Card
      label={t('machine.card.title')}
      sublabel={firmware?.version ? `${firmware.name} ${firmware.version}` : firmware?.name}
      aside={(
        <Button compact className="size-chiph" aria-label={t('machine.card.read')} title={t('machine.card.read')} disabled={!machine.canWriteSettings} onClick={read}>
          <Icon name="refresh" className="size-5" weight={2} />
        </Button>
      )}
      className={phone ? 'flex-1' : 'min-h-0 flex-1'}
    >
      {phone ? list : <FadeScroller>{list}</FadeScroller>}
    </Card>
  );

  const shownGroup = groups.find(({ id }) => id === open)?.id;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-gap">
      {phone ? (
        <FadeScroller>
          <div className="flex min-h-full flex-col">{card}</div>
        </FadeScroller>
      ) : card}
      {pending.length > 0 ? (
        <SettingsPendingBar pending={pending} groups={pendingGroups(pending)} error={error} onReview={() => setOpen(REVIEW)} />
      ) : null}

      {shownGroup ? (
        <SettingsGroupSheet
          group={shownGroup}
          rows={rows}
          drafts={drafts}
          onDraft={onDraft}
          rule={rule}
          disabled={disabled}
          readOnly={!machine.canWriteSettings}
          flash={flash}
          onClose={close}
        />
      ) : null}
      {open === GEOMETRY && geometry ? (
        <Sheet title={groupTitle(GEOMETRY)} onClose={close}>
          <GeometrySettings geometry={geometry} envelope={machine.envelope} pending={new Set(pending.map(({ name }) => name))} onJump={jump} />
        </Sheet>
      ) : null}
      {open === HISTORY ? (
        <Sheet title={t('machine.history.title')} onClose={close}>
          <SettingsHistory
            history={view.history ?? []}
            disabled={disabled}
            onRestore={(entry) => {
              setDrafts((now) => ({ ...now, ...restoreDrafts(entry, rows) }));
              close();
            }}
          />
        </Sheet>
      ) : null}
      {open === RAW ? (
        <Sheet title={t('machine.raw.title')} onClose={close}>
          <RawSettings rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} />
        </Sheet>
      ) : null}
      {open === REVIEW ? (
        <SettingsReview
          pending={pending}
          drafts={drafts}
          rule={rule}
          bad={bad}
          saving={Boolean(saving)}
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
