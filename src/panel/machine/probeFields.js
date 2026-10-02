import { settingFigure } from './units';

/*
 * The probing figures and how they are said, apart from the wizard's talk to
 * the server (`probe.js`), so the drawings that name them need no connection
 * to a machine — the design system renders them on their own.
 */

/** Each figure the server keeps: what it is called and whether it is a length or a rate (`kind`, the units' word). */
export const FIELDS = {
  plateThickness: { key: 'probe.field.plateThickness', kind: 'length' },
  cornerThickness: { key: 'probe.field.cornerThickness', kind: 'length' },
  wallX: { key: 'probe.field.wallX', kind: 'length' },
  wallY: { key: 'probe.field.wallY', kind: 'length' },
  toolDiameter: { key: 'probe.field.toolDiameter', kind: 'length' },
  holeSize: { key: 'probe.field.holeSize', kind: 'length' },
  bossSize: { key: 'probe.field.bossSize', kind: 'length' },
  // A count: said as it is, in no unit.
  holePasses: { key: 'probe.field.holePasses', kind: 'count' },
  ballDiameter: { key: 'probe.field.ballDiameter', kind: 'length' },
  paperThickness: { key: 'probe.field.paperThickness', kind: 'length' },
  stockThickness: { key: 'probe.field.stockThickness', kind: 'length' },
  paperLift: { key: 'probe.field.paperLift', kind: 'length' },
  clear: { key: 'probe.field.clear', kind: 'length' },
  travel: { key: 'probe.field.travel', kind: 'length' },
  depth: { key: 'probe.field.depth', kind: 'length' },
  maxZ: { key: 'probe.field.maxZ', kind: 'length' },
  maxXY: { key: 'probe.field.maxXY', kind: 'length' },
  retract: { key: 'probe.field.retract', kind: 'length' },
  lift: { key: 'probe.field.lift', kind: 'length' },
  fast: { key: 'probe.field.fast', kind: 'feed' },
  slow: { key: 'probe.field.slow', kind: 'feed' },
};

/** A kept figure in millimetres, as the text a field starts with: `12.7`, not `12.700`. */
export const fieldText = (mm, name, rule) => {
  const { value } = settingFigure(mm, FIELDS[name].kind, rule);
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : '';
};

/** The unit a field is typed in. */
export const fieldUnit = (name, rule) => settingFigure(0, FIELDS[name].kind, rule).unit;

/** A figure as a drawing's badge says it: a rate as `F100`, a length with its unit. */
export const figureSaid = (name, text, rule) => (FIELDS[name].kind === 'feed' ? `F${text}` : `${text} ${fieldUnit(name, rule)}`);
