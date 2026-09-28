import machineSettings from '../services/machine-settings';
import { ERR_BAD_REQUEST } from '../constants';

/**
 * The controller's settings as a file, out and back in (settings handoff,
 * 2026-09-28, frame E4: "Eksportuj do pliku" / "Importuj z pliku").
 *
 * Both from the server's copy of what `$$` last said — see
 * `services/machine-settings` — so the file is the controller's memory as
 * the server last read it, and an import is compared with the same thing.
 * The server reads the file; the panel only puts what comes back among the
 * changes waiting to be saved, and they go the usual way, through the review.
 */

// One `$` setting on a line, as `$$` writes it; anything else in a file is ignored.
const LINE = /^\s*(\$\d+)\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:[;(].*)?$/;

const byNumber = (a, b) => Number(a.slice(1)) - Number(b.slice(1));

/**
 * `GET /api/machine-settings/export` — the settings as `$$` says them, one
 * a line in `$` order, under a comment saying when they were read.
 */
export const exportFile = (req, res) => {
  const { copy } = machineSettings.saved();
  const names = Object.keys(copy.values).sort(byNumber);
  const text = [
    `; cncjs $$ ${copy.time ?? ''}`.trimEnd(),
    ...names.map((name) => `${name}=${copy.values[name]}`),
    '',
  ].join('\n');
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="grbl-settings.txt"');
  res.send(text);
};

/**
 * `POST /api/machine-settings/import` — `{ text }`, a file's content. Answers
 * `{ changes, unknown, same }`: the settings whose value differs from the
 * controller's, as Grbl's figures (`{ name, value }`); the names the
 * controller did not report, left out; and how many already match.
 */
export const importFile = (req, res) => {
  const { text } = { ...req.body };
  if (typeof text !== 'string') {
    res.status(ERR_BAD_REQUEST).send({ msg: '`text` is the file\'s content' });
    return;
  }
  const { copy } = machineSettings.saved();
  const changes = [];
  const unknown = [];
  let same = 0;
  for (const line of text.split(/\r?\n/)) {
    const match = LINE.exec(line);
    if (match) {
      const [, name, value] = match;
      if (copy.values[name] === undefined) {
        unknown.push(name);
      } else if (Number(copy.values[name]) === Number(value)) {
        same += 1;
      } else {
        changes.push({ name, value });
      }
    }
  }
  res.send({ changes, unknown, same });
};
