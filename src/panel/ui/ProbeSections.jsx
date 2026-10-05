import { useEffect } from 'react';
import Button from './Button';
import SettingRow from './SettingRow';
import SettingSummary from './SettingSummary';
import SettingsPlace from './SettingsPlace';
import TextField from './TextField';
import { FIELDS, fieldUnit } from '../machine/probeFields';
import { useIsPhone } from './shell';
import { useUnits } from './units';
import { t } from '../i18n';

// A figure and nothing else, a comma taken as a point — the jog steps' mask.
const figureOnly = (text) => text.replace(/[^0-9.,]/g, '');

// A figure's name: the section's own for it where it has one — a groove's rough size is its width.
const nameOf = (section, name) => t(section.names?.[name] ?? FIELDS[name].key);

// A field the server would not take, framed in red.
const BAD = 'bad';

const OPENS = { sheet: 'sheet', view: 'view' };

/**
 * One group's figures to set, a row per figure as the settings' rows. On a
 * PC a card of their own beside the list (as the controller's settings
 * are); elsewhere in the list's place or a sheet (`ProbeSections`).
 */
export const ProbeFields = ({
  section, texts, onText, bad, onField,
}) => {
  const units = useUnits();
  return (
    <div className="flex min-w-0 flex-col">
      {section.head}
      {section.fields.map((name) => (
        <SettingRow key={name} title={nameOf(section, name)}>
          <TextField
            label={nameOf(section, name)}
            inputMode="decimal"
            unit={fieldUnit(name, units.rule)}
            value={texts[name] ?? ''}
            state={bad === name ? BAD : undefined}
            onFocus={() => onField(name)}
            onBlur={() => onField(null)}
            onChange={(event) => onText(name, figureOnly(event.target.value))}
          />
        </SettingRow>
      ))}
    </div>
  );
};

/**
 * A method's figures in the stages of its drawing, as the controller's
 * settings are in groups (Mateusz, 2026-09-30): a line per stage with what
 * it holds, which opens the stage — in the list's place with a way back on a
 * wide screen, as a sheet on a phone, a row per figure as the settings'
 * rows. The drawing plays the stage open.
 *
 * `sections` is `[{ id, title, fields, head, summary, names }]` — `head` a
 * group's own controls above its figures, `summary` `[label, value]` lines
 * for them in its box, `names` a figure's own name here by its field; `open` the one open, or null;
 * `onField(name)` the figure being set, or null once it is left; `lit` the
 * figures the drawing's move uses. `selected`, on a PC: the list alone, the
 * group whose figures stand beside it lit — the fields are `ProbeFields`.
 */
const ProbeSections = ({
  sections, open, onOpen, texts, onText, bad, onField, lit = [], selected = null,
}) => {
  const units = useUnits();
  const phone = useIsPhone();
  const shown = sections.find((section) => section.id === open) || null;

  // A figure the server would not take is shown where it can be put right.
  useEffect(() => {
    const holding = bad && sections.find((section) => section.fields.includes(bad));
    if (holding && holding.id !== open) {
      onOpen(holding.id);
    }
  }, [bad]); // eslint-disable-line react-hooks/exhaustive-deps

  const fields = shown ? <ProbeFields section={shown} texts={texts} onText={onText} bad={bad} onField={onField} /> : null;

  const close = () => {
    onField(null);
    onOpen(null);
  };

  /*
   * Each group as a box of its figures, name and value on a line, the ones
   * the move playing uses lit (Claude Design, probe proposals, 2026-09-30); a
   * tap opens the group to set them.
   */
  const list = (
    <div className="flex min-w-0 flex-col gap-2">
      {sections.map((section) => (
        <SettingSummary
          key={section.id}
          title={section.title}
          onOpen={() => onOpen(section.id)}
          changed={section.fields.includes(bad)}
          selected={selected === section.id}
          opens={selected ? null : OPENS[phone ? 'sheet' : 'view']}
        >
          {(section.summary || []).map(([label, value]) => (
            <span key={label} className="flex justify-between gap-2.5 px-2 py-0.5 text-note">
              <span className="text-mut">{label}</span>
              <span className="whitespace-nowrap text-ink">{value}</span>
            </span>
          ))}
          {section.fields.map((name) => {
            const on = lit.includes(name);
            return (
              <span key={name} className={`flex justify-between gap-2.5 rounded-ctl px-2 py-0.5 text-note ${on ? 'bg-accS' : ''}`}>
                <span className={on ? 'font-semibold text-ink' : 'text-mut'}>{nameOf(section, name)}</span>
                <span className={`whitespace-nowrap font-num ${on ? 'font-semibold text-acc' : 'text-ink'}`}>{`${texts[name] ?? ''} ${fieldUnit(name, units.rule)}`}</span>
              </span>
            );
          })}
        </SettingSummary>
      ))}
    </div>
  );

  if (selected) {
    return list;
  }
  if (phone) {
    return (
      <>
        {list}
        {shown ? <SettingsPlace title={shown.title} onClose={close}>{fields}</SettingsPlace> : null}
      </>
    );
  }
  if (!shown) {
    return list;
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-cap font-semibold uppercase tracking-[0.08em] text-ink">{shown.title}</span>
        <Button className="h-chiph px-4" onClick={close}>{t('machine.back')}</Button>
      </div>
      {fields}
    </div>
  );
};

/**
 * The figures' side of a Setup: the instruction, the groups and the note —
 * and on a PC (`wide`) the group chosen, the first until another is,
 * standing as a column of its own (`third`), as the controller's settings
 * do (review note, 2026-09-30: *"ta sama reguła co w ustawieniach, 3
 * kolumny"*).
 */
export const figureColumns = ({
  wide, sections, open, onOpen, texts, onText, bad, onField, lit, intro, note,
}) => {
  const shown = wide ? sections.find((section) => section.id === open) || sections[0] : null;
  const list = (
    <ProbeSections
      sections={sections}
      open={open}
      onOpen={onOpen}
      texts={texts}
      onText={onText}
      bad={bad}
      onField={onField}
      lit={lit}
      selected={shown?.id ?? null}
    />
  );
  return {
    right: (
      <div className="flex min-w-0 flex-col gap-2.5">
        {intro}
        {list}
        {note}
      </div>
    ),
    third: shown ? (
      <div className="flex min-w-0 flex-col gap-3">
        <span className="text-cap font-semibold uppercase tracking-[0.08em] text-ink">{shown.title}</span>
        <ProbeFields section={shown} texts={texts} onText={onText} bad={bad} onField={onField} />
      </div>
    ) : null,
  };
};

export default ProbeSections;
