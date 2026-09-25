import { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import FadeScroller from '../ui/FadeScroller';
import JournalDay, { dayOf } from '../ui/JournalDay';
import JournalFilters from '../ui/JournalFilters';
import JournalRow from '../ui/JournalRow';
import Sheet from '../ui/Sheet';
import TextField from '../ui/TextField';
import { useJournal } from '../machine/useJournal';
import { useJournalFilters } from '../machine/useJournalFilters';
import { t } from '../i18n';

/**
 * What happened, from the server's journal — in place of the Alarms item.
 *
 * *"Dziennik zamiast alarmów"* (Mateusz, 2026-09-24): a screen for the one
 * alarm that is current would say "no alarm" nearly all the time, while the
 * question actually asked at the machine — why did it stop — is answered by
 * what happened before. The current alarm belongs to the state sheet under
 * the chip.
 *
 * **Filters as drawn on 2026-09-24**, for a phone, a tablet and a desk: the
 * levels are picked one by one, and each says how many entries it stands
 * for; the two sources are a set; a time window a
 * press away; and text, which finds what was stored and what the panel says
 * about it. On a phone they live in a sheet behind one button, beside the
 * search, so the list keeps the screen. Newest on top, a heading per day,
 * more on request, and new entries arrive while the screen is open.
 *
 * What is kept at all is set in the settings (`debug` when looking for
 * something); a filter here can only narrow what was kept.
 */
const JournalScreen = () => {
  const filters = useJournalFilters();
  const [open, setOpen] = useState(null);
  const [sheet, setSheet] = useState(false);
  const { entries, counts, matched, kept, more, loading, error, loadMore } = useJournal(filters.query);

  return (
    <Card label={t('journal.title')} className="min-h-0 flex-1" bodyClassName="gap-3">
      {/* A rule under the filters, as drawn: they frame the list and are not
        * part of it. */}
      <div className="flex gap-2 border-b border-line pb-3 @3xl/shell:hidden">
        <TextField
          type="search"
          label={t('journal.filter.search')}
          placeholder={t('journal.filter.search')}
          value={filters.q}
          onChange={(e) => filters.setQ(e.target.value)}
          className="flex-1"
        />
        <Button className="h-chiph" onClick={() => setSheet(true)}>{t('journal.filter.open')}</Button>
      </div>
      <div className="hidden border-b border-line pb-3 @3xl/shell:block">
        <JournalFilters filters={filters} counts={counts} matched={matched} kept={kept} />
      </div>

      {sheet ? (
        <Sheet title={t('journal.filter.title')} onClose={() => setSheet(false)}>
          <JournalFilters sheet filters={filters} counts={counts} />
          <div className="flex gap-2">
            <Button className="h-ctl" onClick={filters.reset}>{t('journal.filter.reset')}</Button>
            <Button tone="primary" className="h-ctl flex-1" onClick={() => setSheet(false)}>
              {t('journal.show', { count: matched })}
            </Button>
          </div>
        </Sheet>
      ) : null}

      <FadeScroller className="min-h-0 flex-1">
        {error ? <p className="m-0 py-3 text-note text-red">{error}</p> : null}
        {!error && !loading && entries.length === 0 ? (
          <p className="m-0 py-3 text-note text-mut">{t('journal.empty')}</p>
        ) : null}
        <ul className="m-0 list-none p-0">
          {entries.flatMap((entry, index) => [
            index === 0 || dayOf(entries[index - 1].time) !== dayOf(entry.time)
              ? <JournalDay key={`day-${entry.id}`} time={entry.time} />
              : null,
            <JournalRow
              key={entry.id}
              entry={entry}
              open={open === entry.id}
              onToggle={() => setOpen(open === entry.id ? null : entry.id)}
            />,
          ])}
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
