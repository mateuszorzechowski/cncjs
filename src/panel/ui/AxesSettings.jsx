import { useState } from 'react';
import Notice from './Notice';
import SegmentedChoice from './SegmentedChoice';
import SettingControl from './SettingControl';
import { CodeTag } from './SettingRow';
import { useIsPhone } from './shell';
import useLitIntoView from './useLitIntoView';
import {
  AXES, AXIS_MASKS, AXIS_QUANTITIES, bitOf, isDirty, settingText, withBit,
} from '../machine/machineSettings';
import { settingFigure } from '../machine/units';
import { t } from '../i18n';

/**
 * The Osie group: the axes' four quantities and their two masks as a table
 * of X, Y and Z (the settings design, 2026-09-26, decision 3) — on a phone,
 * one axis at a time under a choice of axis, a dot on an axis that holds a
 * change.
 *
 * The 3D view of the travel and the homing table beside it are the design's
 * second stage.
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

// The name, then its unit and its `$` — in this column, so the fields beside
// it hold the figure alone (panel v2: `5000.000` fits a 95 px field).
const Label = ({ title, code, unit, note, lit = false }) => {
  const ref = useLitIntoView(lit);
  return (
  <div ref={ref} className={`-mx-2 flex min-w-0 flex-col items-start gap-1 rounded-ctl px-2 py-1 transition-colors duration-700 ${lit ? 'bg-accS' : ''}`}>
    <span className="text-base font-semibold text-ink">{title}</span>
    {note ? <span className="text-cap text-mut">{note}</span> : null}
    {unit ? <span className="font-num text-cap text-mut">{unit}</span> : null}
    <CodeTag code={code} />
  </div>
  );
};

const AxesSettings = ({ rows, drafts, onDraft, rule, disabled, flash }) => {
  const phone = useIsPhone();
  const [axis, setAxis] = useState(0);
  const named = byName(rows);
  const quantities = AXIS_QUANTITIES.filter(({ first }) => named[`$${first}`]);
  const masks = AXIS_MASKS.filter(({ name }) => named[name]);
  const stepsChanged = [100, 101, 102].some((n) => named[`$${n}`] && isDirty(named[`$${n}`], drafts[`$${n}`], rule));
  const axisChanged = (i) => quantities.some(({ first }) => named[`$${first + i}`] && isDirty(named[`$${first + i}`], drafts[`$${first + i}`], rule)) ||
    masks.some(({ name }) => bitOf(maskValue(named[name], drafts[name]), i) !== bitOf(named[name].value, i));
  const unitOf = (first) => settingFigure(named[`$${first}`].value, named[`$${first}`].unit, rule).unit;

  // A cell the controller did not report stays empty: a firmware with fewer
  // axes, or a report still arriving.
  const cell = (name, label) => (named[name]
    ? <SettingControl bare={!phone} row={named[name]} draft={drafts[name]} onDraft={onDraft} rule={rule} disabled={disabled} label={label} />
    : null);

  return (
    <div className="flex flex-col gap-3">
      {phone ? (
        <>
          <SegmentedChoice
            joined
            label={t('machine.axisPick')}
            options={[0, 1, 2]}
            value={axis}
            onChange={setAxis}
            format={(i) => t(AXIS_LABELS[AXES[i]])}
            counts={Object.fromEntries([0, 1, 2].map((i) => [i, axisChanged(i) ? '•' : undefined]))}
          />
          {quantities.map(({ id, first, titleKey }) => (
            <div key={id} className="flex flex-col gap-2 border-b border-line pb-3">
              <Label title={t(titleKey)} code={`$${first + axis}`} />
              {cell(`$${first + axis}`, `${t(titleKey)} ${t(AXIS_LABELS[AXES[axis]])}`)}
            </div>
          ))}
          {masks.map(({ name, optionKeys }) => (
            <div key={name} className="flex flex-col gap-2 border-b border-line pb-3">
              <Label title={settingText(named[name]).title} code={t('machine.bitCode', { name, bit: axis })} />
              <BitChoice row={named[name]} draft={drafts[name]} index={axis} onDraft={onDraft} optionKeys={optionKeys} disabled={disabled} label={settingText(named[name]).title} />
            </div>
          ))}
        </>
      ) : (
        <div className="grid grid-cols-[minmax(10rem,14rem)_repeat(3,minmax(0,1fr))] items-center gap-x-3 gap-y-3">
          <span />
          {AXES.map((id) => (
            <span key={id} className="text-cap font-semibold uppercase tracking-[0.1em] text-mut">{t(AXIS_LABELS[id])}</span>
          ))}
          {quantities.map(({ id, first, titleKey }) => (
            <div key={id} className="contents">
              <Label title={t(titleKey)} unit={unitOf(first)} code={`$${first}–${first + 2}`} lit={[0, 1, 2].some((i) => flash === `$${first + i}`)} />
              {AXES.map((a, i) => (
                <div key={a} className="min-w-0">{cell(`$${first + i}`, `${t(titleKey)} ${t(AXIS_LABELS[a])}`)}</div>
              ))}
            </div>
          ))}
          {masks.map(({ name, optionKeys }) => (
            <div key={name} className="contents">
              <Label title={settingText(named[name]).title} note={settingText(named[name]).note} code={name} lit={flash === name} />
              {AXES.map((a, i) => (
                <BitChoice
                  key={a}
                  row={named[name]}
                  draft={drafts[name]}
                  index={i}
                  onDraft={onDraft}
                  optionKeys={optionKeys}
                  disabled={disabled}
                  label={`${settingText(named[name]).title} ${t(AXIS_LABELS[a])}`}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {stepsChanged ? <Notice>{t('machine.stepsChanged')}</Notice> : null}
    </div>
  );
};

export default AxesSettings;
