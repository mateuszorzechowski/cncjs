import { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import FadeScroller from '../ui/FadeScroller';
import JournalRow from '../ui/JournalRow';
import SegmentedChoice from '../ui/SegmentedChoice';
import TextField from '../ui/TextField';
import { LEVELS, SOURCES } from '../machine/journal';
import { LEVEL_KEYS, SOURCE_KEYS } from '../machine/journalWords';
import { useJournal } from '../machine/useJournal';
import { t } from '../i18n';

/*
 * A `datetime-local` value is local time to the minute; the journal's times
 * are ISO in UTC. The upper end takes in the whole of its minute, so `do
 * 22:05` still shows what happened at 22:05:40.
 */
const since = (local) => (local ? new Date(local).toISOString() : undefined);
const until = (local) => (local ? new Date(new Date(local).getTime() + 59999).toISOString() : undefined);

/**
 * What happened, from the server's journal — in place of the Alarms item.
 *
 * *"Dziennik zamiast alarmów"* (Mateusz, 2026-09-24): a screen for the one
 * alarm that is current would say "no alarm" nearly all the time, while the
 * question actually asked at the machine — why did it stop — is answered by
 * what happened before. The current alarm belongs to the state sheet under
 * the chip.
 *
 * **The filters sit in one line**: a level is a floor, so `Warn` shows
 * warnings and errors; a source is the server's journal, the controller's, or
 * both; a time window; and text, which finds what was stored and what the
 * panel says about it. Newest on top, more on request, and new entries arrive
 * while the screen is open.
 *
 * What is kept at all is set in the settings (`debug` when looking for
 * something); a filter here can only narrow what was kept.
 */
const JournalScreen = () => {
  const [level, setLevel] = useState('info');
  const [source, setSource] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const { entries, more, loading, error, loadMore } = useJournal({
    level, source, since: since(from), until: until(to), q: q.trim(),
  });

  return (
    <Card label={t('journal.title')} className="min-h-0 flex-1" bodyClassName="gap-3">
      {/* One line where there is room for it, wrapping where there is not —
        * the filters are the frame of the list, not its content. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SegmentedChoice
          compact
          label={t('journal.filter.level')}
          options={LEVELS}
          value={level}
          onChange={setLevel}
          format={(id) => t(LEVEL_KEYS[id])}
        />
        <SegmentedChoice
          compact
          label={t('journal.filter.source')}
          options={SOURCES}
          value={source}
          onChange={setSource}
          format={(id) => t(SOURCE_KEYS[id])}
        />
        {/* The two ends of one window, so they wrap together. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <TextField caption type="datetime-local" label={t('journal.filter.from')} value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextField caption type="datetime-local" label={t('journal.filter.to')} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <TextField
          type="search"
          label={t('journal.filter.search')}
          placeholder={t('journal.filter.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-48 flex-1"
        />
      </div>

      <FadeScroller className="min-h-0 flex-1">
        {error ? <p className="m-0 py-3 text-note text-red">{error}</p> : null}
        {!error && !loading && entries.length === 0 ? (
          <p className="m-0 py-3 text-note text-mut">{t('journal.empty')}</p>
        ) : null}
        <ul className="m-0 list-none p-0">
          {entries.map((entry) => (
            <JournalRow
              key={entry.id}
              entry={entry}
              open={open === entry.id}
              onToggle={() => setOpen(open === entry.id ? null : entry.id)}
            />
          ))}
        </ul>
        {more ? (
          <Button onClick={loadMore} disabled={loading} className="mt-3 h-ctl w-full">
            {t('journal.more')}
          </Button>
        ) : null}
      </FadeScroller>
    </Card>
  );
};

export default JournalScreen;
