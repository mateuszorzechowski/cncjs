import Button from './Button';
import ConfirmSheet from './ConfirmSheet';
import { GeometryChanges } from './GeometrySettings';
import Icon from './Icon';
import { rowTitle, valueText } from '../machine/machineSettings';
import { settingFigure } from '../machine/units';
import { t } from '../i18n';

/**
 * Every change waiting for the controller, and the one way into its EEPROM
 * (settings handoff, 2026-09-28, frame E2).
 *
 * One sheet where there were two — a bar with Discard and Save, and a
 * confirmation after Save. This one *is* the confirmation: the list of what
 * goes in, from and to, is what `DESIGN.md` asks an EEPROM write to show
 * before it happens. Its two answers are "discard them all" and "write
 * them"; closing it keeps them waiting. A change can be taken back alone,
 * with its ✕, which returns that setting to what the controller holds.
 *
 * Written in the list's order; the first one Grbl refuses stops the rest,
 * and says so under the list.
 *
 * `geometry`, when a change moves it: the Geometria lines that would change,
 * before and after, and the checks as they would stand — the server's, for
 * the settings after the write (Mateusz, 2026-09-28). A red check is read
 * above the button, and does not stop it: the same as a file's check does
 * not stop WCZYTAJ.
 */

const Change = ({ row, draft, rule, onUndo, disabled }) => {
  const title = rowTitle(row);
  return (
    <li className="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base text-ink">
          <span className="font-num font-semibold">{row.name}</span>
          {' '}
          {title}
        </span>
        <span className="font-num text-note text-mut">
          {t('machine.change', {
            from: valueText(row, null, false, rule),
            to: valueText(row, draft, false, rule),
            unit: settingFigure(row.value, row.unit, rule).unit,
          })}
        </span>
      </div>
      <Button compact className="size-chiph" aria-label={t('machine.review.undo', { name: row.name })} disabled={disabled} onClick={onUndo}>
        <Icon name="cross" className="size-5" weight={2} />
      </Button>
    </li>
  );
};

const SettingsReview = ({
  pending, drafts, rule, bad, saving, error, canWrite, geometry, onJump, onUndo, onDiscard, onSave, onClose,
}) => (
  <ConfirmSheet
    title={t('machine.review.title', { count: pending.length })}
    confirmLabel={t(saving ? 'machine.bar.saving' : 'machine.review.save')}
    tone="primary"
    busy={saving || bad || !canWrite}
    cancelLabel={t('machine.review.discard')}
    onCancel={onDiscard}
    onConfirm={onSave}
    onClose={onClose}
  >
    <ul className="m-0 list-none p-0">
      {pending.map((row) => (
        <Change key={row.name} row={row} draft={drafts[row.name]} rule={rule} disabled={saving} onUndo={() => onUndo(row.name)} />
      ))}
    </ul>
    {geometry ? <GeometryChanges geometry={geometry.after} was={geometry.was} changed={geometry.changed} onJump={onJump} /> : null}
    {bad ? <p className="m-0 text-note text-red">{t('machine.review.bad')}</p> : null}
    {error ? <p className="m-0 text-note text-red">{error}</p> : null}
    <p className="m-0 text-note text-mut">{t('machine.review.note')}</p>
  </ConfirmSheet>
);

export default SettingsReview;
