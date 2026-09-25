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

  // The control alone: its name and note are the settings row's.
  //
  // Every level kept is lit, not only the one pressed: this is a floor —
  // `Uwaga` keeps warnings and errors — unlike the journal's own filter,
  // where levels are picked one by one (*"poziom logowania może zaznaczać
  // wszystkie poziomy, które się zawierają"*, 2026-09-25). The one pressed
  // filled, the ones above it in a wash, so it still reads as one choice.
  return (
    <SegmentedChoice
      joined
      fitWide
      label={t('journal.keep.label')}
      options={LEVELS}
      value={level}
      covers={(id) => level !== null && LEVELS.indexOf(id) > LEVELS.indexOf(level)}
      disabled={level === null}
      onChange={(chosen) => saveJournalLevel(chosen).then(setLevel).catch(() => {})}
      format={(id) => t(LEVEL_KEYS[id])}
    />
  );
};

export default JournalLevelChoice;
