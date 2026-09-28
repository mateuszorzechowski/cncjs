import { useState } from 'react';
import SettingControl from './SettingControl';
import TextField from './TextField';
import { decoded, fieldText, filterRows, isBad, isDirty, rowTitle } from '../machine/machineSettings';
import { grblUnit } from '../machine/units';
import { t } from '../i18n';

/**
 * The `$$` view: every setting as Grbl keeps it, one line each — the `$`, the
 * value to edit, Grbl's own unit, the name, and on the right what the value
 * means, what it was, or that it cannot be. A filter by `$`, name or group.
 * The same drafts as the described view (the settings design, 2026-09-26,
 * decision 1). In a sheet since the settings handoff (2026-09-28), which
 * scrolls it; it lays itself out by its own width, so the sheet's 520px on
 * a PC gets the narrow lines the phone does.
 *
 * Export, import and the command line are the design's third stage.
 */

const Side = ({ row, draft, rule }) => {
  if (isBad(row, draft, rule)) {
    return <span className="text-note text-red">{t('machine.badValue')}</span>;
  }
  if (isDirty(row, draft, rule)) {
    return <span className="font-num text-note text-ambT">{t('machine.was', { value: fieldText(row, null, true, rule) })}</span>;
  }
  return <span className="text-note text-mut">{decoded(row)}</span>;
};

const RawSettings = ({ rows, drafts, onDraft, rule, disabled }) => {
  const [query, setQuery] = useState('');
  const shown = filterRows(rows, query);
  return (
    <div className="@container/raw flex flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <TextField
          label={t('machine.filter.label')}
          placeholder={t('machine.filter.placeholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-[12rem] flex-1 @2xl/raw:max-w-xs"
        />
        <span className="font-num text-note text-mut">{t('machine.filter.count', { shown: shown.length, all: rows.length })}</span>
      </div>
      <div className="flex flex-col">
        {shown.map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-line py-2 last:border-b-0 @2xl/raw:grid-cols-[4rem_11rem_5rem_minmax(0,1fr)_minmax(0,12rem)]"
          >
            <span className="font-num text-base font-semibold text-ink">{row.name}</span>
            <SettingControl raw row={row} draft={drafts[row.name]} onDraft={onDraft} rule={rule} disabled={disabled} label={row.name} />
            <span className="hidden font-num text-note text-mut @2xl/raw:inline">{grblUnit(row.unit)}</span>
            <span className="col-start-2 truncate text-note text-ink @2xl/raw:col-start-auto">{rowTitle(row)}</span>
            <span className="col-start-2 @2xl/raw:col-start-auto @2xl/raw:text-right">
              <Side row={row} draft={drafts[row.name]} rule={rule} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RawSettings;
