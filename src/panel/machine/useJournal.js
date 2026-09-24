import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import controller from './controller';
import { fetchJournal, passes } from './journal';
import { codesSaying } from './journalWords';
import { t } from '../i18n';

/**
 * The journal as a list that fills in both directions.
 *
 * Down, a page at a time, when asked. Up, as things happen: every
 * `journal:entry` that passes the filter goes on top. A change of filter
 * starts again from the newest page.
 *
 * The filter is read through a ref inside the listener, which binds once — a
 * listener rebuilt on every change would drop the entries that arrive while it
 * is being swapped.
 */
export const useJournal = ({ level, source, since, until, q }) => {
  // Which codes the panel's own sentences for `q` belong to — the half of
  // the search the server cannot do, since it never has the words.
  const said = useMemo(() => (q ? codesSaying(q, t) : []), [q]);
  const filter = { level, source, since, until, q, said };
  const [entries, setEntries] = useState([]);
  const [next, setNext] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tally, setTally] = useState({ counts: null, matched: 0, kept: 0 });
  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    fetchJournal({ level, source, since, until, q, said })
      .then((page) => {
        if (live) {
          setEntries(page.records);
          setNext(page.next);
          setTally({ counts: page.counts, matched: page.matched, kept: page.kept });
        }
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [level, source, since, until, q, said]);

  useEffect(() => {
    // Counted the way the server counts: per level with the rest of the
    // filter applied, matched with all of it, kept regardless.
    const arrived = (entry) => {
      const shown = passes(entry, filterRef.current);
      const levelled = passes(entry, { ...filterRef.current, level: 'debug' });
      setTally((was) => ({
        counts: was.counts && levelled ? { ...was.counts, [entry.level]: (was.counts[entry.level] || 0) + 1 } : was.counts,
        matched: was.matched + (shown ? 1 : 0),
        kept: was.kept + 1,
      }));
      if (shown) {
        setEntries((list) => (list.some((e) => e.id === entry.id) ? list : [entry, ...list]));
      }
    };
    controller.addListener('journal:entry', arrived);
    return () => controller.removeListener('journal:entry', arrived);
  }, []);

  const loadMore = useCallback(() => {
    if (!next) {
      return;
    }
    setLoading(true);
    fetchJournal({ ...filterRef.current, before: next })
      .then((page) => {
        setEntries((shown) => [...shown, ...page.records]);
        setNext(page.next);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [next]);

  return { entries, ...tally, more: Boolean(next), loading, error, loadMore };
};

export default useJournal;
