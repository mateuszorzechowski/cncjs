import library from '../services/library';
import store from '../store';
import units from '../services/units';
import analyse from '../services/library/analyse';
import { G_CODES, LETTERS, MAX_LINE, M_CODES, SEVERITY } from '../services/library/check';
import { BUILTIN_COMMAND_MSG, BUILTIN_COMMAND_WAIT } from '../controllers/constants';
import { ERR_BAD_REQUEST } from '../constants';

// A program is checked a line at a time, and a screen shows a few hundred
// of them; past this the editor says "and more" rather than drawing them.
const MAX_FINDINGS = 500;

/**
 * Which words each code takes, for the editor to suggest first after it: an
 * arc's end, centre or radius, a dwell's seconds, a spindle's speed. Grbl's
 * own reading of them (its `gc_execute_line`), not every word it would let
 * through.
 */
const ARC = ['X', 'Y', 'Z', 'I', 'J', 'K', 'R', 'F', 'P'];
const PROBE = ['X', 'Y', 'Z', 'F'];
const AXES = ['X', 'Y', 'Z'];
export const PARAMS = {
  G0: AXES,
  G1: [...AXES, 'F'],
  G2: ARC,
  G3: ARC,
  G4: ['P'],
  G10: ['L', 'P', ...AXES],
  G28: AXES,
  G30: AXES,
  'G38.2': PROBE,
  'G38.3': PROBE,
  'G38.4': PROBE,
  'G38.5': PROBE,
  'G43.1': ['Z'],
  G53: AXES,
  G92: AXES,
  M3: ['S'],
  M4: ['S'],
};

/** The top of Z on the machine that is connected, in its own coordinates — or null. */
const zTop = () => {
  const controllers = store.get('controllers') || {};
  const found = Object.values(controllers).find((controller) => controller?.envelope);
  return found ? found.envelope.max.z : null;
};

/**
 * Ready blocks, as lines. The retract goes to the top of Z **in machine
 * coordinates** (`G53`), worked out from the connected machine's travel and
 * homing direction (`envelope.js`): `G53 G0 Z0` is the top only on a machine
 * that homes Z up, and the bottom on one that homes it down. With no machine
 * to ask there is no retract, rather than a guessed one.
 */
export const readyBlocks = (top) => {
  const retract = top === null ? [] : [`G53 G0 Z${Number(top.toFixed(3))}`];
  return [
    { id: 'header', lines: [`${units.modal()} G90 G17 G94`] },
    ...(retract.length ? [{ id: 'retract', lines: retract }] : []),
    { id: 'toolChange', lines: ['M5', ...retract, 'T1 M6'] },
    { id: 'end', lines: ['M5', ...retract, 'M30'] },
  ];
};

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
    params: PARAMS,
    blocks: readyBlocks(zTop()),
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
