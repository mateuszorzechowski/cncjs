import AxesSettings from './AxesSettings';
import Button from './Button';
import Card from './Card';
import FadeScroller from './FadeScroller';
import Notice from './Notice';
import ReportUnitsFix from './ReportUnitsFix';
import SettingControl from './SettingControl';
import SettingRow from './SettingRow';
import Sheet from './Sheet';
import { GROUPS, groupRows, isInactive, settingText } from '../machine/machineSettings';
import { t } from '../i18n';

/**
 * One group of the controller's settings, opened from the list (settings
 * handoff, 2026-09-28): its settings to edit, and nothing here writes — the
 * changes wait in the bar.
 *
 * On a phone a sheet over the list, closed with "Gotowe" (frame D2). Wider,
 * `inline`, a card in the list's own place, and "Wróć" takes it back to the
 * list (frame GT2ter) — a step back in the same place, not a closing, which
 * is why the two words differ.
 *
 * The axes as their own rows of X, Y and Z; every other group a row per
 * setting. `flash` is the setting reached from the Geometria summary.
 */

const Row = ({ row, rows, drafts, onDraft, rule, disabled, flash }) => {
  const text = settingText(row);
  const inactive = isInactive(row, rows, drafts, rule);
  const note = inactive ? t('machine.needs', { name: row.needs }) : text.note;
  return (
    <SettingRow title={text.title} code={row.name} note={note} lit={flash === row.name}>
      {/* A column of its own at the right, as wide as panel v2 gives it, rather than the row's whole width. */}
      <div className="w-full @lg/setting:max-w-[340px] @lg/setting:self-end">
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

const ControllerGroup = ({
  group, rows, drafts, onDraft, rule, disabled, readOnly, flash, inline = false, onClose, onBack,
}) => {
  const about = GROUPS.find((g) => g.id === group);
  const title = group === 'axes' ? t('machine.axesSheet') : t(about.titleKey);
  const body = (
    <>
      {readOnly ? <Notice>{t('machine.readOnly')}</Notice> : null}
      <p className="m-0 text-note text-mut">{t(about.noteKey)}</p>
      {group === 'axes' ? (
        <AxesSettings rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} flash={flash} />
      ) : (
        <div className="flex flex-col">
          {groupRows(rows, group).map((row) => (
            <Row key={row.name} row={row} rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} flash={flash} />
          ))}
        </div>
      )}
    </>
  );
  if (!inline) {
    return <Sheet title={title} onClose={onClose}>{body}</Sheet>;
  }
  /*
   * In a column: the head stands and only the settings scroll. On a tablet
   * in the list's place, and "Wróć" goes back to it; on a PC beside the
   * list, which stays, so there is nothing to go back to (frame PC1).
   */
  return (
    <Card
      label={title}
      aside={onBack ? <Button className="h-chiph px-4" onClick={onBack}>{t('machine.back')}</Button> : null}
      className="min-h-0 flex-1"
    >
      <FadeScroller className="flex flex-col gap-3">{body}</FadeScroller>
    </Card>
  );
};

export default ControllerGroup;
