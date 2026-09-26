import SegmentedChoice from './SegmentedChoice';
import TextField from './TextField';
import ToggleChips from './ToggleChips';
import { bitOf, fieldText, isBad, isDirty, REPORT_KEYS, withBit } from '../machine/machineSettings';
import { settingFigure } from '../machine/units';
import { t } from '../i18n';

/**
 * The control for one of Grbl's settings, by what it holds — a figure, a
 * switch, a set of axes, or `$10`'s four reports — showing the unsaved draft
 * over the controller's value and what that value was.
 *
 * `raw`: the `$$` view, where a figure is Grbl's own (millimetres) and has
 * no unit beside it.
 */

// The mask's bits as ToggleChips holds them, and back.
const AXIS_IDS = ['x', 'y', 'z'];
const chipsOf = (value) => Object.fromEntries(AXIS_IDS.map((id, i) => [id, bitOf(value, i) === 1]));
const maskOf = (chips) => AXIS_IDS.reduce((sum, id, i) => withBit(sum, i, chips[id]), 0);
const AXIS_LABELS = { x: 'axis.x', y: 'axis.y', z: 'axis.z' };

const SettingControl = ({ row, draft, onDraft, raw = false, rule, disabled, label }) => {
  const value = draft ? Number(draft.text) : row.value;
  const set = (next) => onDraft(row.name, { text: String(next), raw });

  if (row.kind === 'bool' && !raw) {
    return (
      <SegmentedChoice
        label={label}
        options={[0, 1]}
        value={value}
        was={row.value}
        onChange={set}
        disabled={disabled || Boolean(row.locked)}
        format={(on) => t(on ? 'machine.on' : 'machine.off')}
      />
    );
  }
  if (row.bits === 'report' && !raw) {
    return (
      <SegmentedChoice
        label={label}
        options={[0, 1, 2, 3]}
        value={value}
        was={row.value}
        onChange={set}
        disabled={disabled}
        format={(n) => t(REPORT_KEYS[n])}
      />
    );
  }
  if (row.bits === 'axes' && !raw) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <ToggleChips
          label={label}
          options={AXIS_IDS.map((id) => ({ id, label: t(AXIS_LABELS[id]), disabled }))}
          value={chipsOf(value)}
          was={chipsOf(row.value)}
          onChange={(chips) => set(maskOf(chips))}
        />
        <span className="text-note text-mut">{t('machine.maskHint')}</span>
      </div>
    );
  }

  const dirty = isDirty(row, draft, rule);
  const bad = isBad(row, draft, rule);
  const shown = raw ? null : settingFigure(row.value, row.unit, rule);
  let frame;
  if (bad) {
    frame = 'bad';
  } else if (dirty) {
    frame = 'changed';
  }
  return (
    <TextField
      label={label}
      inputMode="decimal"
      unit={shown?.unit || undefined}
      value={fieldText(row, draft, raw, rule)}
      was={dirty && !raw ? fieldText(row, null, raw, rule) : undefined}
      state={frame}
      disabled={disabled || Boolean(row.locked)}
      onChange={(event) => onDraft(row.name, { text: event.target.value, raw })}
    />
  );
};

export default SettingControl;
