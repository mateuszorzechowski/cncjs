import { settingFigure } from './units';
import { t } from '../i18n';

/**
 * Grbl's settings as the Maszyna tab shows them — the words for what the
 * server sends (`machine:settings`, see `controllers/Grbl/machine-settings.js`).
 *
 * The server says what a setting *is*: its group, its kind, how it converts,
 * its value in what Grbl keeps. What it is *called* and what it does is
 * here, because a sentence is the panel's, in the panel's language.
 *
 * Keys written out, one line a setting, so the resources test can find
 * every one — the same reason `refusal.js` does not build its keys.
 */

const TEXT = {
  $0: { titleKey: 'machine.s0.title', noteKey: 'machine.s0.note' },
  $1: { titleKey: 'machine.s1.title', noteKey: 'machine.s1.note' },
  $2: { titleKey: 'machine.s2.title', noteKey: 'machine.s2.note' },
  $3: { titleKey: 'machine.s3.title', noteKey: 'machine.s3.note' },
  $4: { titleKey: 'machine.s4.title', noteKey: 'machine.s4.note' },
  $5: { titleKey: 'machine.s5.title', noteKey: 'machine.s5.note' },
  $6: { titleKey: 'machine.s6.title', noteKey: 'machine.s6.note' },
  $10: { titleKey: 'machine.s10.title', noteKey: 'machine.s10.note' },
  $11: { titleKey: 'machine.s11.title', noteKey: 'machine.s11.note' },
  $12: { titleKey: 'machine.s12.title', noteKey: 'machine.s12.note' },
  $13: { titleKey: 'machine.s13.title', noteKey: 'machine.s13.note' },
  $20: { titleKey: 'machine.s20.title', noteKey: 'machine.s20.note' },
  $21: { titleKey: 'machine.s21.title', noteKey: 'machine.s21.note' },
  $22: { titleKey: 'machine.s22.title', noteKey: 'machine.s22.note' },
  $23: { titleKey: 'machine.s23.title', noteKey: 'machine.s23.note' },
  $24: { titleKey: 'machine.s24.title', noteKey: 'machine.s24.note' },
  $25: { titleKey: 'machine.s25.title', noteKey: 'machine.s25.note' },
  $26: { titleKey: 'machine.s26.title', noteKey: 'machine.s26.note' },
  $27: { titleKey: 'machine.s27.title', noteKey: 'machine.s27.note' },
  $30: { titleKey: 'machine.s30.title', noteKey: 'machine.s30.note' },
  $31: { titleKey: 'machine.s31.title', noteKey: 'machine.s31.note' },
  $32: { titleKey: 'machine.s32.title', noteKey: 'machine.s32.note' },
};

/*
 * The axes' twelve, as four quantities of three: one row each with X, Y and
 * Z beside one another, rather than twelve rows that say the same thing.
 */
export const AXIS_QUANTITIES = [
  { id: 'steps', first: 100, titleKey: 'machine.axes.steps.title', noteKey: 'machine.axes.steps.note' },
  { id: 'rate', first: 110, titleKey: 'machine.axes.rate.title', noteKey: 'machine.axes.rate.note' },
  { id: 'accel', first: 120, titleKey: 'machine.axes.accel.title', noteKey: 'machine.axes.accel.note' },
  { id: 'travel', first: 130, titleKey: 'machine.axes.travel.title', noteKey: 'machine.axes.travel.note' },
];

const AXES = ['x', 'y', 'z'];

const GROUPS = {
  axes: 'machine.group.axes',
  motion: 'machine.group.motion',
  limits: 'machine.group.limits',
  homing: 'machine.group.homing',
  spindle: 'machine.group.spindle',
  report: 'machine.group.report',
  motors: 'machine.group.motors',
  other: 'machine.group.other',
};

/*
 * What each bit of a mask stands for. An axis mask is X, Y, Z in bits 0-2;
 * `$10` is the machine position (rather than the work one) and the planner's
 * buffer in the report.
 */
const BITS = {
  axes: [{ bit: 1, key: 'axis.x' }, { bit: 2, key: 'axis.y' }, { bit: 4, key: 'axis.z' }],
  report: [{ bit: 1, key: 'machine.bits.mpos' }, { bit: 2, key: 'machine.bits.buffer' }],
};

/** The bits of a mask as choices: `{ id, label }`, `id` the bit's value. */
export const maskOptions = (bits) => (BITS[bits] || []).map(({ bit, key }) => ({ id: String(bit), label: t(key) }));

/** Which bits are set, as `ToggleChips` holds them. */
export const maskValue = (value) => Object.fromEntries([1, 2, 4].map((bit) => [String(bit), (value & bit) !== 0]));

/** The number `ToggleChips`' value stands for. */
export const maskNumber = (chosen) => Object.entries(chosen)
  .filter(([, on]) => on)
  .reduce((sum, [bit]) => sum + Number(bit), 0);

/** A setting's name and what it does; a raw one has only its `$`. */
export const settingText = (row, axisQuantity) => {
  if (axisQuantity) {
    return { title: t(axisQuantity.titleKey), note: t(axisQuantity.noteKey) };
  }
  const text = TEXT[row.name];
  return text ? { title: t(text.titleKey), note: t(text.noteKey) } : { title: row.name, note: '' };
};

/** The quantity an axis setting belongs to, or null. */
export const axisQuantityOf = (name) => {
  const n = Number(name.slice(1));
  return AXIS_QUANTITIES.find(({ first }) => n >= first && n < first + AXES.length) || null;
};

/**
 * A value as the described view shows it, `{ value, unit }`: a switch in
 * words, a mask as what its bits stand for, a figure in the server's units.
 */
export const shownSetting = (row, rule) => {
  if (row.kind === 'bool') {
    return { value: t(row.value ? 'machine.on' : 'machine.off'), unit: '' };
  }
  if (row.kind === 'mask' && BITS[row.bits]) {
    const set = BITS[row.bits].filter(({ bit }) => (row.value & bit) !== 0);
    return { value: set.length ? set.map(({ key }) => t(key)).join(' · ') : t('machine.none'), unit: '' };
  }
  return settingFigure(row.value, row.unit, rule);
};

/**
 * The rows in the tab's order: a group at a time, each group's rows in the
 * order the server listed them; the axes as four quantities of three.
 */
export const settingGroups = (rows = []) => Object.keys(GROUPS)
  .map((group) => {
    const own = rows.filter((row) => row.group === group);
    if (group !== 'axes') {
      return { group, title: t(GROUPS[group]), rows: own, quantities: [] };
    }
    const quantities = AXIS_QUANTITIES
      .map((quantity) => ({
        ...quantity,
        rows: AXES.map((axis, i) => own.find((row) => row.name === `$${quantity.first + i}`)).filter(Boolean),
      }))
      .filter(({ rows: found }) => found.length > 0);
    return { group, title: t(GROUPS[group]), rows: [], quantities };
  })
  .filter(({ rows: own, quantities }) => own.length > 0 || quantities.length > 0);
