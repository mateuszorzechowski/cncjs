import { useCallback, useEffect, useState } from 'react';
import controller from './controller';
import { fetchFiles } from './files';

/**
 * The library as the server has it, kept current.
 *
 * Read once, and again on every `files:change` — which the server says when
 * a file comes or goes, from any device or by hand, and when an analysis is
 * ready. The listener binds once and asks afresh rather than patching, so
 * the list is always the server's and never a guess about what it did.
 */
export const useFiles = () => {
  const [listing, setListing] = useState({ files: [], disk: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => fetchFiles()
    .then((next) => {
      setListing(next);
      setError(null);
    })
    .catch((e) => setError(e))
    .finally(() => setLoading(false)), []);

  useEffect(() => {
    refresh();
    controller.addListener('files:change', refresh);
    return () => controller.removeListener('files:change', refresh);
  }, [refresh]);

  return { ...listing, loading, error, refresh };
};

export default useFiles;
