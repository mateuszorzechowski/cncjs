import { failureKey, methodOf, phaseWords } from '../machine/probe';
import { t } from '../i18n';

/**
 * A probe's journal entries in words (Mateusz, 2026-10-03): the server keeps
 * the method, its choice and the figures in millimetres; here they become a
 * sentence in the panel's language and units — `units` is `useUnits()`.
 */

const AXES = ['x', 'y', 'z'];
// A size's figures: a circle's diameter, or each axis.
const SIZES = ['d', ...AXES];
const sizeName = (key) => (key === 'd' ? 'Ø' : key.toUpperCase());

// The method by its name, and its one choice where it has one: "Szerokość · listwa X".
const methodName = (data) => {
  const method = methodOf(data?.method);
  if (!method) {
    return data?.method ?? '';
  }
  const choice = method.choice && method.choice.list.find((one) => one.id === data?.[method.choice.option]);
  return choice ? `${t(method.key)} · ${t(choice.key)}` : t(method.key);
};

const signed = (text) => (text.startsWith('-') ? text : `+${text}`);

// "X 24.012 · Y 18.003" (or "Ø 24.012"): each axis there is, as `say` puts its figure.
const axesSaid = (values, say) => SIZES.filter((axis) => Number.isFinite(values?.[axis]))
  .map((axis) => `${sizeName(axis)} ${say(axis)}`).join(' · ');

const zeroSaid = (data, units) => {
  // Entries before 2026-10-03 kept the offset's axes bare in `data`.
  const offset = data.offset ?? data;
  return axesSaid(offset, (axis) => {
    const shift = data.shift?.[axis];
    const at = units.figure(offset[axis]);
    return Number.isFinite(shift) ? `${at} (${t('journal.probe.by', { shift: signed(units.figure(shift)) })})` : at;
  });
};

const SAID = {
  start: (data) => t('journal.probe.start', { method: methodName(data) }),
  measured: (data, units) => (Number.isFinite(data.points)
    ? t('journal.probe.mapped', { method: methodName(data), points: data.points })
    : t('journal.probe.measured', { method: methodName(data), axes: zeroSaid(data, units), unit: units.length })),
  applied: (data) => (data.method === 'height-map'
    ? t('journal.probe.mapSaved')
    : t('journal.probe.applied', { method: methodName(data), wcs: data.wcs ?? '' })),
  size: (data, units) => t('journal.probe.size', {
    method: methodName(data),
    sizes: axesSaid(data.size, (axis) => units.figure(data.size[axis])),
    unit: units.length,
    spread: data.spread ? t('journal.probe.spread', { list: axesSaid(data.spread, (axis) => units.figure(data.spread[axis])), n: data.passes ?? '' }) : '',
    ball: units.figure(data.ball),
  }),
};

/** The line a probe entry reads as; null for any other entry. */
export const probeLine = (entry, units) => {
  if (entry.event !== 'probe') {
    return null;
  }
  const data = entry.data || {};
  const said = SAID[entry.code];
  if (said) {
    return said(data, units);
  }
  // Anything else is how a measurement failed: the code, as the result screen says it.
  const why = t(failureKey(entry.code), { code: entry.code, axis: phaseWords(data.phase).axis });
  return t('journal.probe.failed', { method: methodName(data), why });
};

/** A probe entry's fields when opened, `[label, value]`: the method, and a size's figures. */
export const probeDetails = (entry, units) => {
  if (entry.event !== 'probe') {
    return [];
  }
  const data = entry.data || {};
  const rows = [[t('journal.detail.method'), methodName(data)]];
  if (entry.code === 'size' && data.size) {
    const mm = (value) => `${units.figure(value)} ${units.length}`;
    SIZES.filter((axis) => Number.isFinite(data.size[axis])).forEach((axis) => rows.push([sizeName(axis), mm(data.size[axis])]));
    if (data.spread) {
      rows.push([t('journal.detail.spread'), `${axesSaid(data.spread, (axis) => units.figure(data.spread[axis]))} ${units.length}`]);
    }
    if (Number.isFinite(data.off)) {
      rows.push([t('journal.detail.off'), mm(data.off)]);
    }
    if (data.centre) {
      rows.push([t('journal.detail.centre', { wcs: data.wcs ?? '' }), `${axesSaid(data.centre, (axis) => units.figure(data.centre[axis]))} ${units.length}`]);
    }
    if (data.passes) {
      rows.push([t('journal.detail.passes'), String(data.passes)]);
    }
    rows.push([t('journal.detail.ball'), mm(data.ball)]);
  }
  return rows;
};
