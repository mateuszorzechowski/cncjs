import library from '../services/library';
import analyse from '../services/library/analyse';
import { G_CODES, LETTERS, MAX_LINE, M_CODES, SEVERITY } from '../services/library/check';
import { BUILTIN_COMMAND_MSG, BUILTIN_COMMAND_WAIT } from '../controllers/constants';
import { ERR_BAD_REQUEST } from '../constants';

// A program is checked a line at a time, and a screen shows a few hundred
// of them; past this the editor says "and more" rather than drawing them.
const MAX_FINDINGS = 500;

/**
 * `GET /api/editor/words` — what the file check accepts, for the editor's
 * suggestions and its as-you-type check of a line: the G and M codes, the
 * letters, the longest line, and cncjs's own `%` commands.
 *
 * The server's lists, not a copy in the panel: the file check and the
 * editor then cannot disagree about whether `G7` is a code.
 */
export const words = (req, res) => {
  res.send({
    g: [...G_CODES],
    m: [...M_CODES],
    letters: [...LETTERS],
    builtins: [BUILTIN_COMMAND_WAIT, BUILTIN_COMMAND_MSG],
    maxLine: MAX_LINE,
  });
};

/**
 * `POST /api/editor/check` with `{ text }` — the file check over text that
 * has not been saved: every finding at its own line, not grouped, with its
 * severity. The same pass as on upload, so what the editor underlines is
 * what the file card will say once it is saved.
 */
export const check = async (req, res) => {
  const { text } = { ...req.body };

  if (typeof text !== 'string') {
    res.status(ERR_BAD_REQUEST).send({ msg: '`text` is the program' });
    return;
  }

  /*
   * The check counts lines as the sender does — blank ones are not sent —
   * so that "line 624" means the same on the file card, in the footer and in
   * the journal. The editor needs the file's own line, so it is turned into
   * that here, once, for the one reader that wants it.
   */
  const fileLine = [];
  text.split('\n').forEach((line, index) => {
    if (line.trim()) {
      fileLine.push(index + 1);
    }
  });

  const findings = [];
  await analyse(text, null, library.start, (line, said, finding) => {
    if (findings.length < MAX_FINDINGS) {
      findings.push({ line: fileLine[line - 1] ?? line, ...finding, severity: SEVERITY[finding.code] });
    }
  });
  res.send({ findings, more: findings.length >= MAX_FINDINGS });
};
