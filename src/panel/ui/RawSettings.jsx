import { useState } from 'react';
import Button from './Button';
import SettingControl from './SettingControl';
import TextField from './TextField';
import { decoded, fieldText, filterRows, isBad, isDirty, rowTitle } from '../machine/machineSettings';
import { grblUnit } from '../machine/units';
import { readSettings } from '../machine/commands';
import { t } from '../i18n';

/**
 * The `$$` view: every setting as Grbl keeps it, one line each — the `$`, the
 * value to edit, Grbl's own unit, the name, and on the right what the value
 * means, what it was, or that it cannot be. A filter by `$`, name or group,
 * and `$$` read again. The same drafts as the described view (the settings
 * design, 2026-09-26, decision 1).
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

const RawSettings = ({ rows, drafts, onDraft, rule, disabled, canRead }) => {
  const [query, setQuery] = useState('');
  const shown = filterRows(rows, query);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <TextField
          label={t('machine.filter.label')}
          placeholder={t('machine.filter.placeholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-[12rem] flex-1 @3xl/shell:max-w-xs"
        />
        <span className="font-num text-note text-mut">{t('machine.filter.count', { shown: shown.length, all: rows.length })}</span>
        <span className="flex-1" />
        <Button tone="outline" className="h-chiph px-4" disabled={!canRead} onClick={readSettings}>{t('machine.readRaw')}</Button>
      </div>
      <div className="flex flex-col">
        {shown.map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-line py-2 last:border-b-0 @3xl/shell:grid-cols-[4rem_11rem_5rem_minmax(0,1fr)_minmax(0,12rem)]"
          >
            <span className="font-num text-base font-semibold text-ink">{row.name}</span>
            <SettingControl raw row={row} draft={drafts[row.name]} onDraft={onDraft} rule={rule} disabled={disabled} label={row.name} />
            <span className="hidden font-num text-note text-mut @3xl/shell:inline">{grblUnit(row.unit)}</span>
            <span className="col-start-2 truncate text-note text-ink @3xl/shell:col-start-auto">{rowTitle(row)}</span>
            <span className="col-start-2 @3xl/shell:col-start-auto @3xl/shell:text-right">
              <Side row={row} draft={drafts[row.name]} rule={rule} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RawSettings;
