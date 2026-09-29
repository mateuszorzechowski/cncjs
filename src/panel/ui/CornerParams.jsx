import { useState } from 'react';
import CornerCycle from './CornerCycle';
import TextField from './TextField';
import { FIELDS, fieldUnit } from '../machine/probe';
import { useUnits } from './units';
import { t } from '../i18n';

// A figure and nothing else, a comma taken as a point — the jog steps' mask.
const figureOnly = (text) => text.replace(/[^0-9.,]/g, '');

// A field the server would not take, framed in red.
const BAD = 'bad';

/**
 * The L plate's figures beside its drawing, laid out as the Z plate's
 * (review notes, 2026-09-29): the cycle from above and from the side on the
 * left with `intro` under it, the fields in two columns on the right. The
 * whole loop plays; the field being set plays the part it acts in.
 */
const CornerParams = ({ fields, texts, onText, bad, corner, intro = null }) => {
  const units = useUnits();
  const [picked, setPicked] = useState(null);
  return (
    <div className="grid gap-4 @3xl/shell:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-3 self-start">
        <CornerCycle corner={corner} field={picked} />
        {intro}
      </div>
      <div className="grid min-w-0 content-start gap-2 self-start @xl/shell:grid-cols-2">
        {fields.map((name) => (
          <div key={name} className="flex flex-col gap-1">
            <span className={`text-note ${name === picked ? 'font-semibold text-acc' : 'text-mut'}`}>{t(FIELDS[name].key)}</span>
            <TextField
              label={t(FIELDS[name].key)}
              inputMode="decimal"
              unit={fieldUnit(name, units.rule)}
              value={texts[name] ?? ''}
              state={bad === name ? BAD : undefined}
              onFocus={() => setPicked(name)}
              onBlur={() => setPicked(null)}
              onChange={(event) => onText(name, figureOnly(event.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CornerParams;
