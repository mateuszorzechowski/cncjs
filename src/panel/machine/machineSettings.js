import { grblUnit, settingFigure, settingInGrbl } from './units';
import { t } from '../i18n';

/**
 * Grbl's settings as the Sterownik tab shows and edits them — the words for
 * what the server sends (`machine:settings`, see
 * `controllers/Grbl/machine-settings.js`), and the drafts an operator has
 * typed but not yet saved.
 *
 * Laid out after the settings design of 2026-09-26 (`Ustawienia
 * sterownika`): groups in a menu, one group at a time; the axes as a table of
 * X, Y and Z; one set of values behind two views, the described one and
 * Grbl's own `$$`; nothing reaching the controller before the save bar's
 * button.
 *
 * The server says what a setting *is*: its group, its kind, its bounds, how
 * it converts. What it is called and what it does is here, in the panel's
 * language. Keys written out, one line a setting, so the resources test can
 * find every one.
 *
 * **A draft** is `{ text, raw }`: what was typed, and whether it was typed in
 * the raw view (Grbl's own figure, millimetres) or the described one (the
 * server's units). The same draft shows in the other view converted, so a
 * change made in one is there in the other.
 */

export const GROUPS = [
  { id: 'axes', titleKey: 'machine.group.axes.title', noteKey: 'machine.group.axes.note' },
  { id: 'homing', titleKey: 'machine.group.homing.title', noteKey: 'machine.group.homing.note' },
  { id: 'limits', titleKey: 'machine.group.limits.title', noteKey: 'machine.group.limits.note' },
  { id: 'spindle', titleKey: 'machine.group.spindle.title', noteKey: 'machine.group.spindle.note' },
  { id: 'signals', titleKey: 'machine.group.signals.title', noteKey: 'machine.group.signals.note' },
  { id: 'motion', titleKey: 'machine.group.motion.title', noteKey: 'machine.group.motion.note' },
  { id: 'other', titleKey: 'machine.group.other.title', noteKey: 'machine.group.other.note' },
  // No rows of its own: the server's summary of the ones above.
  { id: 'geo', titleKey: 'machine.group.geo.title', noteKey: 'machine.group.geo.note' },
];

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

/** The axes' twelve as four quantities of three, a row each in the table. */
export const AXIS_QUANTITIES = [
  { id: 'steps', first: 100, titleKey: 'machine.axes.steps' },
  { id: 'rate', first: 110, titleKey: 'machine.axes.rate' },
  { id: 'accel', first: 120, titleKey: 'machine.axes.accel' },
  { id: 'travel', first: 130, titleKey: 'machine.axes.travel' },
];

export const AXES = ['x', 'y', 'z'];

/*
 * The two axis masks in the table, one choice per axis rather than a number
 * 0-7 (the design's decision 3): which way the motor turns, and which side
 * the switch is on.
 */
export const AXIS_MASKS = [
  { name: '$3', optionKeys: ['machine.dir.normal', 'machine.dir.inverted'] },
  { name: '$23', optionKeys: ['machine.side.plus', 'machine.side.minus'] },
];

// `$10`'s four values, by what the report then carries.
export const REPORT_KEYS = ['machine.report.wpos', 'machine.report.mpos', 'machine.report.wposBuffer', 'machine.report.mposBuffer'];

/** A setting's name and what it does; one the panel does not know, its `$` alone. */
export const settingText = (row) => {
  const text = TEXT[row.name];
  return text ? { title: t(text.titleKey), note: t(text.noteKey) } : { title: row.name, note: '' };
};

/** Rows of a group, in the server's order; the axes' table rows are left to the table. */
export const groupRows = (rows, group) => rows.filter((row) => row.group === group &&
  !row.axis && !AXIS_MASKS.some(({ name }) => name === row.name));

/** The groups that have anything in them. */
export const groupsIn = (rows) => GROUPS.filter(({ id }) => rows.some((row) => row.group === id));

/** A figure as Grbl keeps it, to three decimals — how `$$` writes one. */
const grblText = (value) => String(Math.round(value * 1000) / 1000);

// Bool and mask values are whole numbers, and the same in both views.
const plain = (row) => row.kind !== 'float' && row.kind !== 'int';

/** What Grbl would keep for this draft, or the controller's value without one. */
export const grblOf = (row, draft, rule) => {
  if (!draft) {
    return row.value;
  }
  return settingInGrbl(draft.text, draft.raw || plain(row) ? undefined : row.unit, rule);
};

/** The text a field shows: the draft as typed in its own view, converted in the other. */
export const fieldText = (row, draft, raw, rule) => {
  if (draft && (Boolean(draft.raw) === raw || plain(row))) {
    return draft.text;
  }
  const value = grblOf(row, draft, rule);
  if (Number.isNaN(value)) {
    return draft.text;
  }
  if (raw) {
    return draft ? grblText(value) : row.raw ?? String(row.value);
  }
  return plain(row) ? String(value) : settingFigure(value, row.unit, rule).value;
};

/** Whether a draft is not a value this setting can hold — the server's bounds, checked early. */
export const isBad = (row, draft, rule) => {
  if (!draft) {
    return false;
  }
  const value = grblOf(row, draft, rule);
  const max = row.kind === 'bool' ? 1 : row.max;
  return Number.isNaN(value) ||
    (row.kind !== 'float' && !Number.isInteger(value)) ||
    value < (row.min ?? 0) ||
    (max !== undefined && value > max) ||
    (Boolean(row.positive) && value === 0);
};

/** Whether a draft would change what the controller holds. */
export const isDirty = (row, draft, rule) => {
  if (!draft) {
    return false;
  }
  const value = grblOf(row, draft, rule);
  return Number.isNaN(value) || Math.abs(value - row.value) > 0.0005;
};

/** A setting that does nothing while another is off — `$20` without `$22`. */
export const isInactive = (row, rows, drafts, rule) => {
  const needed = row.needs && rows.find(({ name }) => name === row.needs);
  return Boolean(needed) && grblOf(needed, drafts[needed.name], rule) === 0;
};

/** The drafts that would change something, as rows. */
export const pendingRows = (rows, drafts, rule) => rows.filter((row) => isDirty(row, drafts[row.name], rule));

/** How many changes each group holds, for the menu. */
export const pendingCounts = (pending) => pending.reduce((counts, row) => ({ ...counts, [row.group]: (counts[row.group] ?? 0) + 1 }), {});

/** What the server is sent: each change as typed, with the units it was shown in. */
export const changesOf = (pending, drafts, rule) => pending.map((row) => {
  const draft = drafts[row.name];
  return { name: row.name, value: draft.text, units: draft.raw || plain(row) ? undefined : rule?.name };
});

/** One bit of a mask, 0 or 1. */
export const bitOf = (value, index) => (value >> index) & 1;

/** A mask with one bit set to `on`. */
export const withBit = (value, index, on) => (on ? value | (1 << index) : value & ~(1 << index));

/** The rows a raw-view filter keeps: by `$`, name, Grbl's unit or group. */
export const filterRows = (rows, query) => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return rows;
  }
  const groupTitle = (row) => t(GROUPS.find(({ id }) => id === row.group)?.titleKey ?? 'machine.group.other.title');
  return rows.filter((row) => row.name.includes(q) ||
    rowTitle(row).toLowerCase().includes(q) ||
    grblUnit(row.unit).toLowerCase().includes(q) ||
    groupTitle(row).toLowerCase().includes(q));
};

const AXIS_KEYS = ['axis.x', 'axis.y', 'axis.z'];

/** What a value means, for the raw view's right-hand column: a switch, the axes of a mask, `$10`'s report. */
export const decoded = (row) => {
  if (row.kind === 'bool') {
    return t(row.value ? 'machine.on' : 'machine.off');
  }
  if (row.bits === 'report') {
    return REPORT_KEYS[row.value] ? t(REPORT_KEYS[row.value]) : '';
  }
  if (row.bits === 'axes') {
    const set = AXIS_KEYS.filter((key, i) => bitOf(row.value, i) === 1).map((key) => t(key));
    return set.length ? set.join(' · ') : t('machine.none');
  }
  return '';
};

/** A setting's name as a list of changes gives it — an axis' quantity with its axis. */
export const rowTitle = (row) => {
  const n = Number(row.name.slice(1));
  const quantity = row.axis && AXIS_QUANTITIES.find(({ first }) => n >= first && n < first + AXES.length);
  return quantity ? t('machine.axisTitle', { title: t(quantity.titleKey), axis: t(AXIS_KEYS[AXES.indexOf(row.axis)]) }) : settingText(row).title;
};

/** A value as a list of changes shows it: a switch or a mask by what it means, a figure as the field has it. */
export const valueText = (row, draft, raw, rule) => (plain(row)
  ? decoded({ ...row, value: grblOf(row, draft, rule) })
  : fieldText(row, draft, raw, rule));
