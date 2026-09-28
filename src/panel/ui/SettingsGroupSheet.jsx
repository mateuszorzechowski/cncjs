import AxesSettings from './AxesSettings';
import Notice from './Notice';
import ReportUnitsFix from './ReportUnitsFix';
import SettingControl from './SettingControl';
import SettingRow from './SettingRow';
import Sheet from './Sheet';
import { GROUPS, groupRows, isInactive, settingText } from '../machine/machineSettings';
import { t } from '../i18n';

/**
 * One group of the controller's settings, opened from the list (settings
 * handoff, 2026-09-28, frame D2): its settings to edit, and "Gotowe", which
 * closes it and leaves the changes waiting in the bar — nothing here writes.
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

const SettingsGroupSheet = ({ group, rows, drafts, onDraft, rule, disabled, readOnly, flash, onClose }) => (
  <Sheet title={group === 'axes' ? t('machine.axesSheet') : t(GROUPS.find((g) => g.id === group).titleKey)} onClose={onClose}>
    {readOnly ? <Notice>{t('machine.readOnly')}</Notice> : null}
    {group === 'axes' ? (
      <AxesSettings rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} flash={flash} />
    ) : (
      <div className="flex flex-col">
        {groupRows(rows, group).map((row) => (
          <Row key={row.name} row={row} rows={rows} drafts={drafts} onDraft={onDraft} rule={rule} disabled={disabled} flash={flash} />
        ))}
      </div>
    )}
  </Sheet>
);

export default SettingsGroupSheet;
