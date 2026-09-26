import Icon from './Icon';
import MachinePreview from './MachinePreview';
import { useUnits } from './units';
import { NO_READING } from '../machine/readings';
import { t } from '../i18n';

/**
 * The Geometria group: the machine's geometry to check at a glance — read
 * only, every line taking you to the setting behind it, where it lights up
 * (the controller settings design, panel v2, 2026-09-26).
 *
 * Left, a summary and the checks the settings fail together; right, the
 * travel in 3D with HOME, and where homing leaves each axis.
 * All of it the server's (`geometry.js`); here only words and units.
 */

const AXIS_KEYS = { x: 'axis.x', y: 'axis.y', z: 'axis.z' };
const SIDE_KEYS = { '+': 'machine.side.plus', '-': 'machine.side.minus' };

const SUMMARY_KEYS = {
  travel: 'machine.geo.travel',
  direction: 'machine.geo.direction',
  homingSide: 'machine.geo.homingSide',
  homing: 'machine.geo.homing',
  softLimits: 'machine.geo.softLimits',
  hardLimits: 'machine.geo.hardLimits',
};

const SOFT_KEYS = { on: 'machine.geo.on', off: 'machine.geo.off', inactive: 'machine.geo.inactive' };

const CHECKS = {
  'soft-without-homing': 'machine.geo.check.softWithoutHoming',
  'pull-off-long': 'machine.geo.check.pullOffLong',
  'seek-slower': 'machine.geo.check.seekSlower',
  'hard-off': 'machine.geo.check.hardOff',
};

const LEVELS = {
  error: 'border-red bg-redS text-red',
  warn: 'border-amb bg-ambS text-ambT',
  info: 'border-line bg-surf text-ink',
  ok: 'border-grn bg-grnS text-grn',
};

// A summary line's value in words, with the server's units where it is a length.
const valueText = ({ id, value }, units) => {
  const length = (mm) => units.figure(mm, 'extent');
  switch (id) {
  case 'travel':
    return t('machine.geo.box', { x: length(value.x), y: length(value.y), z: length(value.z), unit: units.length });
  case 'direction':
    return value.length ? t('machine.geo.inverted', { axes: value.map((a) => t(AXIS_KEYS[a])).join(' ') }) : t('machine.geo.normal');
  case 'homingSide':
    return Object.entries(value).map(([a, side]) => `${t(AXIS_KEYS[a])}${t(SIDE_KEYS[side])}`).join(' ');
  case 'homing':
    return value.on ? t('machine.geo.homingOn', { pullOff: length(value.pullOff), unit: units.length }) : t('machine.geo.off');
  case 'softLimits':
    return t(SOFT_KEYS[value]);
  default:
    return t(value ? 'machine.geo.on' : 'machine.geo.off');
  }
};

const Summary = ({ rows, pending, units, onJump }) => (
  <div className="flex flex-col rounded-ctl border border-line">
    {rows.map((row) => (
      <button
        key={row.id}
        type="button"
        onClick={() => onJump(row.group, row.names[0])}
        className="flex items-center gap-3 border-b border-line px-3 py-1.5 text-left last:border-b-0 hover:bg-accS"
      >
        <span className="flex w-36 shrink-0 flex-col items-start">
          <span className="text-note font-semibold text-ink">{t(SUMMARY_KEYS[row.id])}</span>
          <span className="font-num text-cap text-mut">{row.names.join(' ')}</span>
        </span>
        <span className="min-w-0 flex-1 font-num text-note text-ink">{valueText(row, units)}</span>
        {row.names.some((name) => pending.has(name)) ? <span aria-hidden="true" className="size-1.5 rounded-full bg-amb" /> : null}
        <Icon name="chevron" className="size-4 shrink-0 -rotate-90 text-acc" weight={2} />
      </button>
    ))}
  </div>
);

const Checks = ({ checks, units, onJump }) => (
  <div className="flex flex-col gap-2">
    <span className="text-cap font-semibold uppercase tracking-[0.1em] text-mut">{t('machine.geo.checks')}</span>
    {checks.length === 0 ? (
      <p className={`m-0 rounded-ctl border px-3 py-2 text-note ${LEVELS.ok}`}>{t('machine.geo.check.none')}</p>
    ) : null}
    {checks.map((check) => (
      <button
        key={check.code}
        type="button"
        onClick={() => onJump(check.group, check.name)}
        className={`flex items-start gap-3 rounded-ctl border px-3 py-2 text-left text-note ${LEVELS[check.level]}`}
      >
        <span className="flex-1">{t(CHECKS[check.code], { value: units.figure(check.value, 'size'), unit: units.length })}</span>
        <span className="shrink-0 font-num">{t('machine.geo.goTo', { name: check.name })}</span>
      </button>
    ))}
  </div>
);

export const HomingTable = ({ homing, units }) => (
  <table className="w-full border-collapse text-note">
    <thead>
      <tr className="text-cap uppercase tracking-[0.08em] text-mut">
        <th className="py-1.5 text-left font-semibold" aria-label={t('machine.geo.axis')} />
        <th className="py-1.5 text-left font-semibold">{t('machine.geo.side')}</th>
        <th className="py-1.5 text-left font-semibold">{t('machine.geo.range')}</th>
        <th className="py-1.5 text-left font-semibold">{t('machine.geo.after')}</th>
      </tr>
    </thead>
    <tbody className="font-num text-ink">
      {homing.map((row) => (
        <tr key={row.axis} className="border-t border-line">
          <td className="py-1.5 font-semibold">{t(AXIS_KEYS[row.axis])}</td>
          <td className="py-1.5">{t(SIDE_KEYS[row.side])}</td>
          <td className="py-1.5">
            {row.range ? t('machine.geo.span', { min: units.figure(row.range.min, 'size'), max: units.figure(row.range.max, 'size') }) : NO_READING}
          </td>
          <td className="py-1.5">{row.after === null ? NO_READING : units.figure(row.after, 'size')}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const GeometrySettings = ({ geometry, envelope, pending, onJump }) => {
  const units = useUnits();
  return (
    <div className="grid grid-cols-1 gap-6 @3xl/shell:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <Summary rows={geometry.summary} pending={pending} units={units} onJump={onJump} />
        <Checks checks={geometry.checks} units={units} onJump={onJump} />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <MachinePreview className="h-60" envelope={envelope} homing={geometry.homing} />
        <HomingTable homing={geometry.homing} units={units} />
      </div>
    </div>
  );
};

export default GeometrySettings;
