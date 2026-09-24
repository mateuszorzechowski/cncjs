import { useEffect, useState } from 'react';
import SegmentedChoice from './SegmentedChoice';
import { LEVELS, fetchJournalLevel, saveJournalLevel } from '../machine/journal';
import { LEVEL_KEYS } from '../machine/journalWords';
import { t } from '../i18n';

/**
 * The lowest level the server's journal keeps — *"debug w ustawieniach"*
 * (Mateusz, 2026-09-24).
 *
 * The server's setting, not this panel's: it is kept in `.cncrc`, so every
 * device sees the same choice and a restart keeps it. Shown only once the
 * server has said what it is, so a choice is never drawn that is not the one
 * in force.
 */
const JournalLevelChoice = () => {
  const [level, setLevel] = useState(null);

  useEffect(() => {
    let live = true;
    fetchJournalLevel().then((current) => live && setLevel(current)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">
        {t('journal.keep.label')}
      </span>
      <SegmentedChoice
        label={t('journal.keep.label')}
        options={LEVELS}
        value={level}
        disabled={level === null}
        onChange={(chosen) => saveJournalLevel(chosen).then(setLevel).catch(() => {})}
        format={(id) => t(LEVEL_KEYS[id])}
      />
      <span className="text-note text-mut">{t('journal.keep.note')}</span>
    </div>
  );
};

export default JournalLevelChoice;
