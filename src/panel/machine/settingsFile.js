import { currentToken } from './session';

/**
 * The controller's settings as a file, out and back in — the history
 * sheet's two buttons (settings handoff, 2026-09-28, frame E4). The server
 * writes the file and reads it back (`api/machine-settings/*`); here only
 * the trip there and back.
 */

const auth = () => {
  const token = currentToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Save the settings `$$` last said as a text file on this device. */
export const exportSettings = async () => {
  const res = await fetch('/api/machine-settings/export', { headers: auth() });
  if (!res.ok) {
    throw new Error(String(res.status));
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = 'grbl-settings.txt';
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * A file's settings compared with the controller's, by the server:
 * `{ changes: [{ name, value }], unknown: [name], same }`.
 */
export const importSettings = async (text) => {
  const res = await fetch('/api/machine-settings/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth() },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(String(res.status));
  }
  return res.json();
};

/** The drafts an import makes: Grbl's own figures, as the raw view types them. */
export const importDrafts = ({ changes }) => Object.fromEntries(changes.map(({ name, value }) => [name, { text: value, raw: true }]));
