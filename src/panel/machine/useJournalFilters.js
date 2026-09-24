import { useState } from 'react';

/** The windows a press away, besides `custom`. */
export const RANGES = ['m15', 'h1', 'today', 'all'];

/*
 * Where a window starts, worked out when it is chosen rather than at every
 * render: a start that moved with the clock would be a new filter on each
 * render and a request each time.
 */
const startOf = (range, now = new Date()) => {
  if (range === 'm15') {
    return new Date(now.getTime() - 15 * 60000).toISOString();
  }
  if (range === 'h1') {
    return new Date(now.getTime() - 60 * 60000).toISOString();
  }
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  return undefined;
};

/*
 * A `datetime-local` value is local time to the minute; the journal's times
 * are ISO in UTC. The upper end takes in the whole of its minute, so `do
 * 22:05` still shows what happened at 22:05:40.
 */
const fromLocal = (local) => (local ? new Date(local).toISOString() : undefined);
const toLocal = (local) => (local ? new Date(new Date(local).getTime() + 59999).toISOString() : undefined);

const START = {
  level: 'info',
  sources: { server: true, controller: true },
  range: 'all',
  since: undefined,
  from: '',
  to: '',
  q: '',
};

/**
 * What the journal is filtered by, and the ways to change it.
 *
 * One hook for the bar and the phone's sheet, so the two cannot disagree.
 * `query` is the part the server reads.
 *
 * Sources are a set with at least one in it: both is everything, and turning
 * the last one off would be a filter that shows nothing on purpose.
 */
export const useJournalFilters = () => {
  const [filters, setFilters] = useState(START);
  const set = (change) => setFilters((previous) => ({ ...previous, ...change }));

  const { level, sources, range, since, from, to, q } = filters;
  const source = sources.server && sources.controller ? 'all' : (sources.server ? 'server' : 'controller');

  return {
    ...filters,
    query: {
      level,
      source,
      since: range === 'custom' ? fromLocal(from) : since,
      until: range === 'custom' ? toLocal(to) : undefined,
      q: q.trim(),
    },
    setLevel: (next) => set({ level: next }),
    toggleSource: (id) => {
      const next = { ...sources, [id]: !sources[id] };
      if (next.server || next.controller) {
        set({ sources: next });
      }
    },
    chooseRange: (next) => set({ range: next, since: startOf(next) }),
    setFrom: (value) => set({ from: value }),
    setTo: (value) => set({ to: value }),
    setQ: (value) => set({ q: value }),
    reset: () => setFilters(START),
  };
};

export default useJournalFilters;
