import Notice from './Notice';
import SegmentedChoice from './SegmentedChoice';
import SettingControl from './SettingControl';
import SettingRow from './SettingRow';
import {
  AXES, AXIS_MASKS, AXIS_QUANTITIES, bitOf, isDirty, settingText, withBit,
} from '../machine/machineSettings';
import { settingFigure } from '../machine/units';
import { t } from '../i18n';

/**
 * The Osie group: the axes' four quantities and their two masks, a row
 * each, X, Y and Z side by side in it (the settings design, 2026-09-26,
 * decision 3; the settings handoff, 2026-09-28, frame D2).
 *
 * One layout for every width. It was a table on a tablet and one axis at a
 * time under a choice of axis on a phone — a fourth bar of navigation above
 * the fields, which the handoff took away. The row lays itself out by its
 * own width: the name above the fields in a sheet or a narrow column, beside
 * them where there is room.
 */

const AXIS_LABELS = { x: 'axis.x', y: 'axis.y', z: 'axis.z' };

const byName = (rows) => Object.fromEntries(rows.map((row) => [row.name, row]));

const maskValue = (row, draft) => (draft ? Number(draft.text) : row.value);

/** One axis' bit of a mask, as a choice of two. */
const BitChoice = ({ row, draft, index, onDraft, optionKeys, disabled, label }) => {
  const value = maskValue(row, draft);
  return (
    <SegmentedChoice
      joined
      label={label}
      options={[0, 1]}
      value={bitOf(value, index)}
      was={bitOf(row.value, index)}
      disabled={disabled}
      onChange={(on) => onDraft(row.name, { text: String(withBit(value, index, on === 1)), raw: false })}
      format={(on) => t(optionKeys[on])}
    />
  );
};

/** X, Y and Z in three equal columns, each under its letter. */
const Axes = ({ children }) => (
  <div className="grid grid-cols-3 gap-2">
    {AXES.map((axis, i) => (
      <div key={axis} className="flex min-w-0 flex-col gap-1">
        <span className="font-num text-note text-mut">{t(AXIS_LABELS[axis])}</span>
        {children(axis, i)}
      </div>
    ))}
  </div>
);

const AxesSettings = ({ rows, drafts, onDraft, rule, disabled, flash }) => {
  const named = byName(rows);
  const quantities = AXIS_QUANTITIES.filter(({ first }) => named[`$${first}`]);
  const masks = AXIS_MASKS.filter(({ name }) => named[name]);
  const stepsChanged = [100, 101, 102].some((n) => named[`$${n}`] && isDirty(named[`$${n}`], drafts[`$${n}`], rule));
  const unitOf = (first) => settingFigure(named[`$${first}`].value, named[`$${first}`].unit, rule).unit;

  return (
    <div className="flex flex-col">
      {quantities.map(({ id, first, titleKey }) => (
        <SettingRow
          key={id}
          title={t(titleKey)}
          code={`$${first}–${first + 2}`}
          note={unitOf(first)}
          lit={[0, 1, 2].some((i) => flash === `$${first + i}`)}
        >
          <Axes>
            {(axis, i) => (named[`$${first + i}`]
              // A cell the controller did not report stays empty: a firmware
              // with fewer axes, or a report still arriving.
              ? <SettingControl bare row={named[`$${first + i}`]} draft={drafts[`$${first + i}`]} onDraft={onDraft} rule={rule} disabled={disabled} label={`${t(titleKey)} ${t(AXIS_LABELS[axis])}`} />
              : null)}
          </Axes>
        </SettingRow>
      ))}
      {masks.map(({ name, optionKeys }) => {
        const text = settingText(named[name]);
        return (
          <SettingRow key={name} title={text.title} code={name} note={text.note} lit={flash === name}>
            <Axes>
              {(axis, i) => (
                <BitChoice row={named[name]} draft={drafts[name]} index={i} onDraft={onDraft} optionKeys={optionKeys} disabled={disabled} label={`${text.title} ${t(AXIS_LABELS[axis])}`} />
              )}
            </Axes>
          </SettingRow>
        );
      })}
      {stepsChanged ? <Notice className="mt-4">{t('machine.stepsChanged')}</Notice> : null}
    </div>
  );
};

export default AxesSettings;
