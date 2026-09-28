import AxesSettings from './AxesSettings';
import Notice from './Notice';
import ReportUnitsFix from './ReportUnitsFix';
import SettingControl from './SettingControl';
import SettingRow from './SettingRow';
import SettingsPlace from './SettingsPlace';
import { GROUPS, groupRows, isInactive, settingText } from '../machine/machineSettings';
import { t } from '../i18n';

/**
 * One group of the controller's settings, opened from the list (settings
 * handoff, 2026-09-28): its settings to edit, and nothing here writes — the
 * changes wait in the bar. Where it opens is `place` (see `SettingsPlace`).
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
  group, rows, drafts, onDraft, rule, disabled, readOnly, flash, place,
}) => {
  const about = GROUPS.find((g) => g.id === group);
  const title = group === 'axes' ? t('machine.axesSheet') : t(about.titleKey);
  return (
    <SettingsPlace title={title} {...place}>
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
    </SettingsPlace>
  );
};

export default ControllerGroup;
