import { currentToken } from './session';
import { NO_READING } from './readings';
import i18next, { t } from '../i18n';

/**
 * The server's units, as the panel uses them: the one place a millimetre
 * becomes something an operator reads, and the one place a figure an
 * operator gave is sent back.
 *
 * The rule is the server's (`services/units`): a factor, how many digits
 * each kind of figure carries, and jog steps in those units. The panel keeps
 * everything else in millimetres — the scene, the envelope, the toolpath,
 * the tool's place on it — because that is what Grbl reports whatever the
 * parser's mode, and turns a figure into text only here, at the edge.
 *
 * Nothing on a screen formats a length any other way. `toFixed` on a length
 * outside this file is a figure that will stay in millimetres when the
 * server says inches.
 */

/*
 * The labels, by the unit's name. The only thing here that knows a unit by
 * name, and only because a label is a translation the panel has to carry.
 */
const LABELS = {
  mm: { length: 'units.mm', feed: 'units.mmPerMin' },
  inch: { length: 'units.inch', feed: 'units.inPerMin' },
};

const usable = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * A length in millimetres, as text in the server's units.
 *
 * `kind` is `position` (the machine's resolution), `size` (a program's
 * extent, read not set) or `feed` (a rate, per minute). A dash when there is
 * no figure, or no rule yet — never a millimetre dressed as an inch.
 */
export const figure = (mm, rule, kind = 'position') => {
  if (!usable(mm) || !rule) {
    return NO_READING;
  }
  const value = mm * rule.factor;
  /*
   * Two kinds of figure, and they read differently on purpose.
   *
   * A reading — a position, a feed — is fixed-width, with a point: it is a
   * number that changes under the operator's eye, and digits that shift or a
   * separator that differs from the controller's own console would both be
   * noise. A size is read once, in a sentence, so it is written the way the
   * panel's language writes a number (`-6 mm`, `1,97 in` in Polish) with no
   * zeros it does not need — the file card as it was agreed on 2026-09-25.
   */
  if (kind === 'size') {
    return new Intl.NumberFormat(i18next.language, { maximumFractionDigits: rule.digits.size }).format(value);
  }
  return value.toFixed(rule.digits[kind]);
};

/**
 * A figure the operator set, in millimetres — for the few sums the panel
 * still does itself in them: how far a jog travels before it stops, and the
 * lines it composes for firmwares the server has no jog for. Null with no
 * rule, so nothing is worked out from a unit nobody has named.
 */
export const inMm = (value, rule) => (usable(value) && rule ? value / rule.factor : null);

/** The unit of a length, `mm` or `in`; a dash before the server has said. */
export const lengthLabel = (rule) => (rule && LABELS[rule.name] ? t(LABELS[rule.name].length) : NO_READING);

/** The unit of a rate, `mm/min` or `in/min`. */
export const feedLabel = (rule) => (rule && LABELS[rule.name] ? t(LABELS[rule.name].feed) : NO_READING);

/**
 * Changing the server's units.
 *
 * Only the change goes this way. What the units *are* arrives over the socket
 * (`units:change`), to every panel at once — this one included — so the
 * screen that pressed the button learns the result the same way as the
 * phone in the workshop, and neither can show a choice the server did not
 * make.
 */
export const saveUnits = async (change) => {
  const token = currentToken();
  const res = await fetch('/api/units', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(change),
  });
  if (!res.ok) {
    throw new Error(`PUT /api/units: ${res.status}`);
  }
  return res.json();
};
