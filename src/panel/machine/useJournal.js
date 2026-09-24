import { useCallback, useEffect, useRef, useState } from 'react';
import controller from './controller';
import { fetchJournal, passes } from './journal';

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
export const useJournal = (filter) => {
  const { level, source } = filter;
  const [entries, setEntries] = useState([]);
  const [next, setNext] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    fetchJournal({ level, source })
      .then((page) => {
        if (live) {
          setEntries(page.records);
          setNext(page.next);
        }
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [level, source]);

  useEffect(() => {
    const arrived = (entry) => {
      if (passes(entry, filterRef.current)) {
        setEntries((shown) => (shown.some((e) => e.id === entry.id) ? shown : [entry, ...shown]));
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

  return { entries, more: Boolean(next), loading, error, loadMore };
};

export default useJournal;
