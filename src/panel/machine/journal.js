import { currentToken } from './session';
import { t } from '../i18n';

/**
 * The server's journal, read and configured from the panel.
 *
 * `GET /api/journal` pages newest first; `journal:entry` on the socket brings
 * what happens next. See `src/server/services/journal`.
 */

export const LEVELS = ['debug', 'info', 'warn', 'error'];

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

const values = (value) => (value && typeof value === 'object' ? Object.values(value).flatMap(values) : [value]);

const stores = (entry, q) => values([entry.event, entry.code, entry.port, entry.device, entry.program, entry.data])
  .filter((v) => v !== undefined && v !== null)
  .join('\n')
  .toLowerCase()
  .includes(q.toLowerCase());

/**
 * Whether a live entry belongs in what is on screen.
 *
 * The same test the server applies to a page — a level is a floor, a source
 * is exact, times are ISO strings, text is in a stored value or in one of the
 * `said` codes — so an entry that arrives on the socket lands exactly where
 * the next page would have put it.
 */
export const passes = (entry, { level, levels, source, since, until, q, said = [] }) => (
  (!level || rank(entry.level) >= rank(level)) &&
  (!levels || levels.includes(entry.level)) &&
  (source === 'all' || entry.source === source) &&
  (!since || entry.time >= since) &&
  (!until || entry.time <= until) &&
  (!q || said.includes(entry.code) || stores(entry, q))
);

export const fetchJournal = ({ level, levels, source, since, until, q, said = [], before, limit = 100 }) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (level) {
    params.set('level', level);
  }
  if (levels) {
    params.set('levels', levels.join(','));
  }
  if (source !== 'all') {
    params.set('source', source);
  }
  if (since) {
    params.set('since', since);
  }
  if (until) {
    params.set('until', until);
  }
  if (q) {
    params.set('q', q);
  }
  if (said.length) {
    params.set('said', said.join(','));
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
