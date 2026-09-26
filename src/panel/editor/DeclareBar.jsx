import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { declarationLine } from './declarations';
import { t } from '../i18n';

/**
 * Over the foot of the editor, when the check finds a program leaving a
 * modal group to whatever ran before it: which declarations to add, all
 * chosen to start with, and one press to put them at the head of the file.
 * Each warning's own message offers its one fix as well.
 *
 * A small note laid over the text rather than a band above it — the band
 * pushed the editor down whenever it came and went (Mateusz, 2026-09-26:
 * *"mniejsze i jak dymek, nakładka na dole edytora, żeby nie rozjeżdżać
 * layoutu"*). And the choices read as choices: a box ticked or not beside
 * the code; the one action is the filled button under them, in line with the
 * text — not chips and a button in the same face (*"ciężko rozróżnić, co jest
 * opcją, a co akcją"*). The cross, at the right and centred on the note, puts it away
 * until the findings change.
 *
 * `missing` is `missingDeclarations`' answer; `onInsert` gets the line.
 */
const DeclareBar = ({ missing, onInsert }) => {
  const [chosen, setChosen] = useState({});
  const [hidden, setHidden] = useState(false);
  const codes = missing.map(({ code }) => code).join(' ');

  // A new set of findings starts with every one of them chosen, and shown.
  useEffect(() => {
    setChosen(Object.fromEntries(missing.map(({ code }) => [code, true])));
    setHidden(false);
  }, [codes]);

  if (hidden) {
    return null;
  }

  const picked = missing.map(({ code }) => code).filter((code) => chosen[code]);

  return (
    <div className="flex max-w-full items-center gap-3 rounded-ctl border border-amb bg-panel py-2 pl-3 pr-1.5 text-note">
      <div className="flex min-w-0 flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-ink">{t('editor.fix.missing')}</span>
          <div className="flex items-center gap-2.5" role="group" aria-label={t('editor.fix.missing')}>
            {missing.map(({ code, group }) => (
              <button
                key={code}
                type="button"
                role="checkbox"
                aria-checked={Boolean(chosen[code])}
                title={group}
                onClick={() => setChosen({ ...chosen, [code]: !chosen[code] })}
                className="flex items-center gap-1.5 font-num text-ink"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-4 items-center justify-center rounded-ctl border text-cap leading-none ${
                    chosen[code] ? 'border-acc bg-acc text-white' : 'border-line bg-field text-transparent'
                  }`}
                >
                  ✓
                </span>
                {code}
              </button>
            ))}
          </div>
        </div>
        <Button
          tone="primary"
          compact
          disabled={picked.length === 0}
          onClick={() => onInsert(declarationLine(picked))}
          className="h-8 px-3 text-note"
        >
          {t('editor.fix.insert')}
        </Button>
      </div>
      <button
        type="button"
        aria-label={t('editor.fix.hide')}
        title={t('editor.fix.hide')}
        onClick={() => setHidden(true)}
        className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-ctl text-mut hover:bg-field hover:text-ink"
      >
        <Icon name="cross" className="size-5" weight={2} />
      </button>
    </div>
  );
};

export default DeclareBar;
