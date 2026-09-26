import { useState } from 'react';
import Button from './Button';
import ConfirmSheet from './ConfirmSheet';
import { fieldText, rowTitle, valueText } from '../machine/machineSettings';
import { settingFigure } from '../machine/units';
import { readSettings } from '../machine/commands';
import { useIsPhone } from './shell';
import { t } from '../i18n';

/**
 * The bar under the controller's settings: what is changed and not yet in
 * the controller, and the two ways out — throw it away or write it — or,
 * with nothing changed, that the screen matches the controller and when it
 * was read (the settings design, 2026-09-26).
 *
 * Writing asks first, every time: the list of what goes into the EEPROM,
 * from and to (Mateusz, 2026-09-26: *"arkusz z listą linii"*).
 */

const when = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

const Change = ({ row, draft, raw, rule }) => {
  const unit = raw ? '' : settingFigure(row.value, row.unit, rule).unit;
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 border-b border-line py-2 last:border-b-0">
      <span className="font-num text-note font-semibold text-ink">{row.name}</span>
      <span className="text-note text-ink">{rowTitle(row)}</span>
      <span className="font-num text-note text-mut">
        {t('machine.change', { from: valueText(row, null, raw, rule), to: valueText(row, draft, raw, rule), unit })}
      </span>
    </li>
  );
};

const SettingsSaveBar = ({
  pending, drafts, raw, rule, readAt, count, bad, saving, error, canWrite, onDiscard, onSave,
}) => {
  const [asking, setAsking] = useState(false);
  const phone = useIsPhone();
  const changed = pending.length > 0;
  const button = phone ? 'h-ctl flex-1 px-3' : 'h-ctl px-5';
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-ctl border px-4 py-3 ${changed ? 'border-amb bg-ambS' : 'border-line bg-surf'}`}>
      {/* On a phone the words take a line of their own and the buttons share the next. */}
      <div className={`flex min-w-0 flex-1 flex-col gap-1 ${phone ? 'basis-full' : ''}`}>
        {changed ? (
          <>
            <span className="text-base font-semibold text-ambT">
              {t((phone && 'machine.bar.pendingShort') || (bad && 'machine.bar.pendingBad') || 'machine.bar.pending', { count: pending.length })}
            </span>
            <span className="hidden flex-wrap gap-1.5 @3xl/shell:flex">
              {pending.map((row) => (
                <span key={row.name} className="rounded-ctl bg-panel px-1.5 py-0.5 font-num text-cap text-ambT">
                  {t('machine.bar.line', { name: row.name, value: fieldText(row, drafts[row.name], raw, rule) })}
                </span>
              ))}
            </span>
          </>
        ) : (
          <>
            <span className="text-base font-semibold text-ink">{t('machine.bar.clean')}</span>
            {readAt && !phone ? (
              <span className="text-note text-mut">{t('machine.bar.readAt', { time: when.format(new Date(readAt)), count })}</span>
            ) : null}
          </>
        )}
        {error ? <span className="text-note text-red">{error}</span> : null}
      </div>
      {changed ? (
        <>
          <Button tone="outline" className={button} disabled={saving} onClick={onDiscard}>{t('machine.bar.discard')}</Button>
          <Button tone="primary" className={button} disabled={saving || bad || !canWrite} onClick={() => setAsking(true)}>
            {t(saving ? 'machine.bar.saving' : (phone && 'machine.bar.saveShort') || 'machine.bar.save', { count: pending.length })}
          </Button>
        </>
      ) : (
        <Button tone="outline" className={button} disabled={!canWrite} onClick={readSettings}>
          {t(phone ? 'machine.bar.reloadShort' : 'machine.bar.reload')}
        </Button>
      )}
      {asking ? (
        <ConfirmSheet
          title={t('machine.confirm.title', { count: pending.length })}
          note={t('machine.confirm.note')}
          warning={t('machine.confirm.eeprom')}
          confirmLabel={t('machine.confirm.save')}
          tone="primary"
          onConfirm={() => {
            setAsking(false);
            onSave();
          }}
          onClose={() => setAsking(false)}
        >
          <ul className="m-0 list-none p-0">
            {pending.map((row) => <Change key={row.name} row={row} draft={drafts[row.name]} raw={raw} rule={rule} />)}
          </ul>
        </ConfirmSheet>
      ) : null}
    </div>
  );
};

export default SettingsSaveBar;
