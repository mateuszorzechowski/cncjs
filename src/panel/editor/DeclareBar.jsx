import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import ToggleChips from '../ui/ToggleChips';
import { declarationLine } from './declarations';
import { t } from '../i18n';

/**
 * Over the editor, when the check finds a program leaving a modal group to
 * whatever ran before it: which declarations to add, all chosen to start
 * with, and one press to put them at the head of the file (Mateusz,
 * 2026-09-26 — the bar over the editor he agreed to). Each warning's own
 * message offers its one fix as well.
 *
 * `missing` is `missingDeclarations`' answer; `onInsert` gets the line.
 */
const DeclareBar = ({ missing, onInsert }) => {
  const [chosen, setChosen] = useState({});
  const codes = missing.map(({ code }) => code).join(' ');

  // A new set of findings starts with every one of them chosen.
  useEffect(() => {
    setChosen(Object.fromEntries(missing.map(({ code }) => [code, true])));
  }, [codes]);

  const picked = missing.map(({ code }) => code).filter((code) => chosen[code]);

  return (
    <div className="flex shrink-0 flex-col gap-2 rounded-ctl border border-amb bg-ambS px-3 py-2.5">
      <span className="text-note text-ink">{t('editor.fix.missing')}</span>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleChips
          label={t('editor.fix.missing')}
          options={missing.map(({ code, group }) => ({ id: code, label: code, note: group }))}
          value={chosen}
          onChange={setChosen}
        />
        {/* An outline, apart from the chips: chosen chips are filled, and a
          * filled button beside them read as one more of them. */}
        <Button
          tone="outline"
          disabled={picked.length === 0}
          onClick={() => onInsert(declarationLine(picked))}
          className="h-chiph px-4"
        >
          {t('editor.fix.insert')}
        </Button>
      </div>
    </div>
  );
};

export default DeclareBar;
