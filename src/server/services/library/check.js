import { parseLine } from 'gcode-parser';

/**
 * Whether Grbl 1.1 will take a program, worked out from its text alone —
 * the server's half of the Pliki screen's check; the controller's own is `$C`.
 *
 * It judges what reaches the cable: the Grbl controller sends each line
 * without its comments, a `%` line is cncjs's own command and never sent,
 * and a line with `[…]` is an expression filled in only as it is sent, so
 * neither can be judged here.
 *
 * What it says is codes, not sentences — the panel words them. Each problem
 * is said once per code and word, at its first line, with how often it
 * comes; lines are counted as the sender counts them, so they match the
 * journal and `$C`. INCOMPATIBLE does not stop LOAD (Mateusz, 2026-09-25).
 */

/** Grbl 1.1's G-codes — gnea/grbl wiki, "Grbl v1.1 Commands". */
const G_CODES = new Set([
  'G0', 'G1', 'G2', 'G3', 'G4', 'G10', 'G17', 'G18', 'G19', 'G20', 'G21',
  'G28', 'G28.1', 'G30', 'G30.1', 'G38.2', 'G38.3', 'G38.4', 'G38.5', 'G40',
  'G43.1', 'G49', 'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G61',
  'G80', 'G90', 'G91', 'G91.1', 'G92', 'G92.1', 'G93', 'G94',
]);

/** And its M-codes, as the default build has them: no `M7`, no `M56`. */
const M_CODES = new Set(['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M8', 'M9', 'M30']);

/** The letters Grbl 1.1 reads; anything else is `error:20`. */
const LETTERS = new Set(['F', 'G', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'X', 'Y', 'Z']);

/**
 * Grbl's line buffer is 80 bytes and keeps one for the end, so a line of 80
 * characters — counted without spaces and comments, which Grbl drops as it
 * reads — is `error:11`.
 */
const MAX_LINE = 79;

/**
 * An arc whose end is not on its circle is `error:33` — Grbl's own rule, from
 * `gcode.c`: the two radii may differ by 0.005 mm, and past that by neither
 * 0.5 mm nor 0.1 % of the radius. An `R` arc's centre is worked out to fit,
 * so it passes — unless the radius is too short for the chord, when there is
 * no centre at all (`error:34`). The calibration file stopped five times on
 * one of these on 2026-09-25.
 */
const ARC_SLACK = 0.005;
const ARC_MAX = 0.5;
const ARC_SHARE = 0.001;
const PLANE_AXES = { G17: ['x', 'y'], G18: ['z', 'x'], G19: ['y', 'z'] };

/*
 * How far off its circle an arc ends — `{ radius, reach }`, the start's and
 * the end's distance from the centre, in mm — or null when it is on it. The
 * numbers are what the journal says when Grbl refuses the line.
 */
const offCircle = ({ modal, from, to, center }) => {
  const [a, b] = PLANE_AXES[modal.plane] || PLANE_AXES.G17;
  if (!Number.isFinite(center[a]) || !Number.isFinite(center[b])) {
    return { radius: null, reach: null };
  }
  const radius = Math.hypot(from[a] - center[a], from[b] - center[b]);
  const reach = Math.hypot(to[a] - center[a], to[b] - center[b]);
  const miss = Math.abs(reach - radius);
  return miss > ARC_SLACK && (miss > ARC_MAX || miss > ARC_SHARE * radius) ? { radius, reach } : null;
};

/**
 * The modal groups a program takes from whatever ran before it unless it
 * sets them, and each is a part cut wrong: 25.4 times too big, or off the
 * table. The plane only matters to a program with arcs. The coordinate
 * system, the feed mode and the tool length are left out: no program in the
 * library sets them, so the warning would be said of every file — and a
 * warning said of every file gets ignored.
 */
const UNITS = ['G20', 'G21'];
const DISTANCE = ['G90', 'G91'];
const PLANE = ['G17', 'G18', 'G19'];
const GROUPS = [UNITS, DISTANCE, PLANE];

const SEVERITY = {
  'unsupported': 'incompatible',
  'bad-word': 'incompatible',
  'too-long': 'incompatible',
  'arc': 'incompatible',
  'undeclared': 'warning',
  'tool-change': 'warning',
  'mist': 'warning',
};

const codeOf = ([letter, value]) => `${letter}${value}`;

/** The groups a set of lines sets — what a start event does before every program. */
const groupsSetBy = (text) => {
  const set = new Set();
  for (const line of String(text || '').split('\n')) {
    const { words } = parseLine(line.trim());
    for (const code of words.map(codeOf)) {
      GROUPS.filter(group => group.includes(code)).forEach(group => set.add(group));
    }
  }
  return set;
};

/**
 * `start` is the G-code the `gcode:start` events send before every program:
 * a group they set is set, whether the file says so or not.
 */
/*
 * `onFinding(number, text, finding)` hears every finding at the line it is
 * on, before grouping — `{ code, word, detail }`. It is how the server says
 * what it sees in a line Grbl refused (`Library.explain`); the file check
 * itself only keeps the grouped `result()`.
 */
export const createCheck = (start = '', onFinding = null) => {
  const issues = new Map();
  const declared = groupsSetBy(start);
  let moved = false;
  let arced = false;

  let text = '';

  const say = (code, word, line, detail = null) => {
    onFinding?.(line, text, { code, word, ...(detail ? { detail } : {}) });
    const key = `${code} ${word}`;
    const known = issues.get(key);
    if (known) {
      known.count++;
    } else {
      issues.set(key, { code, severity: SEVERITY[code], word, line, count: 1 });
    }
  };

  const undeclared = (group, line) => {
    if (!declared.has(group)) {
      say('undeclared', group.join('/'), line);
    }
  };

  /** One line of the program, with the moves it makes (`analyse`'s `pending`). */
  const line = (number, { line: said, words, cmds }, moves) => {
    text = said;
    if (cmds?.some(cmd => cmd.startsWith('%')) || text.includes('[')) {
      return;
    }

    for (const word of words) {
      const [letter] = word;
      const code = codeOf(word);
      if (!LETTERS.has(letter)) {
        say('bad-word', letter, number);
      } else if (letter === 'G' && !G_CODES.has(code)) {
        say('unsupported', code, number);
      } else if (code === 'M6') {
        say('tool-change', code, number);
      } else if (code === 'M7') {
        say('mist', code, number);
      } else if (letter === 'M' && !M_CODES.has(code)) {
        say('unsupported', code, number);
      }
      GROUPS.filter(group => group.includes(code)).forEach(group => declared.add(group));
    }

    // Most lines are short enough as they stand; only a long one is parsed again.
    if (text.replace(/\s+/g, '').length > MAX_LINE && parseLine(text, { lineMode: 'compact' }).line.length > MAX_LINE) {
      say('too-long', null, number);
    }

    moves.filter(move => move.kind === 'arc').forEach((move) => {
      const off = offCircle(move);
      if (off) {
        say('arc', move.modal.motion, number, off);
      }
    });

    if (!moved && moves.length > 0) {
      moved = true;
      undeclared(UNITS, number);
      undeclared(DISTANCE, number);
    }
    if (!arced && moves.some(move => move.kind === 'arc')) {
      arced = true;
      undeclared(PLANE, number);
    }
  };

  const result = () => {
    const list = [...issues.values()].sort((a, b) => a.line - b.line);
    const severities = list.map(issue => issue.severity);
    let verdict = 'ok';
    if (severities.includes('incompatible')) {
      verdict = 'incompatible';
    } else if (severities.includes('warning')) {
      verdict = 'warnings';
    }
    return { verdict, issues: list };
  };

  return { line, result };
};
