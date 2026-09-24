import { currentToken } from './session';
import { t } from '../i18n';

/**
 * The server's journal, read and configured from the panel.
 *
 * `GET /api/journal` pages newest first; `journal:entry` on the socket brings
 * what happens next. See `src/server/services/journal`.
 */

export const LEVELS = ['debug', 'info', 'warn', 'error'];
export const SOURCES = ['all', 'server', 'controller'];

const rank = (level) => LEVELS.indexOf(level);

const headers = () => {
  const token = currentToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const request = async (url, options) => {
  const res = await fetch(url, { headers: headers(), ...options });
  if (!res.ok) {
    throw new Error(t('journal.failed', { status: res.status }));
  }
  return res.json();
};

/**
 * Whether a live entry belongs in what is on screen.
 *
 * The same test the server applies to a page — a level is a floor, a source
 * is exact — so an entry that arrives on the socket lands exactly where the
 * next page would have put it.
 */
export const passes = (entry, { level, source }) => (
  rank(entry.level) >= rank(level) && (source === 'all' || entry.source === source)
);

export const fetchJournal = ({ level, source, before, limit = 100 }) => {
  const params = new URLSearchParams({ level, limit: String(limit) });
  if (source !== 'all') {
    params.set('source', source);
  }
  if (before) {
    params.set('before', String(before));
  }
  return request(`/api/journal?${params}`);
};

export const fetchJournalLevel = () => request('/api/journal/settings').then(({ level }) => level);

export const saveJournalLevel = (level) => request('/api/journal/settings', {
  method: 'PUT',
  body: JSON.stringify({ level }),
}).then((saved) => saved.level);
