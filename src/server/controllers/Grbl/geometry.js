import { AXES, axisRange, setting } from './envelope';

/**
 * The machine's geometry as the settings screen's Geometria group shows it —
 * read-only, from what `$$` reported: a summary to check at a glance, the
 * rules the settings break together, and where homing leaves each axis.
 *
 * From the controller settings design, panel v2 (2026-09-26). Worked out here
 * rather than in the panel, which draws and words what it is given.
 *
 * Positions are machine coordinates in millimetres. Grbl 1.1 keeps every axis
 * in `[-travel, 0]` and, after homing, puts it at `-pull-off` when the switch
 * is at the top or `-travel + pull-off` when `$23` puts it at the bottom
 * (limits.c; see `envelope.js` for the measurement).
 */

const TRAVEL = { x: '$130', y: '$131', z: '$132' };
const BIT = { x: 1, y: 2, z: 4 };

const on = (settings, name) => setting(settings, name) === 1;
const bit = (settings, name, axis) => ((setting(settings, name) || 0) & BIT[axis]) !== 0;

/** Which end each axis homes to: `+` the top, `-` the bottom. */
const sides = (settings) => Object.fromEntries(AXES.map((axis) => [axis, bit(settings, '$23', axis) ? '-' : '+']));

/**
 * Where each axis stands after `$H`, or null with homing off or the travel
 * unknown; and where its switch is.
 */
export const homingTable = (settings) => {
  const pullOff = setting(settings, '$27') || 0;
  const homing = on(settings, '$22');
  return AXES.map((axis) => {
    const range = axisRange(axis, settings);
    const side = bit(settings, '$23', axis) ? '-' : '+';
    if (!range) {
      return { axis, side, range: null, after: null, switchAt: null };
    }
    const switchAt = side === '-' ? range.min : range.max;
    const after = side === '-' ? range.min + pullOff : range.max - pullOff;
    return { axis, side, range, after: homing ? after : null, switchAt };
  });
};

/**
 * The rules the settings break together, most serious first, three at most —
 * as codes; the panel words them. Each names the setting to go to.
 */
export const geometryChecks = (settings) => {
  const checks = [];
  if (on(settings, '$20') && !on(settings, '$22')) {
    checks.push({ level: 'error', code: 'soft-without-homing', name: '$22', group: 'homing' });
  }
  const travels = AXES.map((axis) => setting(settings, TRAVEL[axis])).filter((v) => v > 0);
  const pullOff = setting(settings, '$27');
  if (on(settings, '$22') && travels.length === 3 && pullOff > Math.min(...travels) * 0.1) {
    checks.push({ level: 'warn', code: 'pull-off-long', name: '$27', group: 'homing', value: pullOff });
  }
  const seek = setting(settings, '$25');
  const locate = setting(settings, '$24');
  if (on(settings, '$22') && seek !== null && locate !== null && seek < locate) {
    checks.push({ level: 'warn', code: 'seek-slower', name: '$25', group: 'homing' });
  }
  if (settings?.$21 !== undefined && !on(settings, '$21')) {
    checks.push({ level: 'info', code: 'hard-off', name: '$21', group: 'limits' });
  }
  return checks.slice(0, 3);
};

/** The summary rows: what, from which settings, in which group. */
export const geometrySummary = (settings) => {
  const travel = Object.fromEntries(AXES.map((axis) => [axis, setting(settings, TRAVEL[axis])]));
  let soft = 'off';
  if (on(settings, '$20')) {
    soft = on(settings, '$22') ? 'on' : 'inactive';
  }
  return [
    { id: 'travel', names: ['$130', '$131', '$132'], group: 'axes', value: travel },
    { id: 'direction', names: ['$3'], group: 'axes', value: AXES.filter((axis) => bit(settings, '$3', axis)) },
    { id: 'homingSide', names: ['$23'], group: 'axes', value: sides(settings) },
    { id: 'homing', names: ['$22', '$27'], group: 'homing', value: { on: on(settings, '$22'), pullOff: setting(settings, '$27') } },
    { id: 'softLimits', names: ['$20'], group: 'limits', value: soft },
    { id: 'hardLimits', names: ['$21'], group: 'limits', value: on(settings, '$21') },
  ];
};

/** All of it, or null before `$$` has said anything. */
export const machineGeometry = (settings) => {
  if (!settings || Object.keys(settings).length === 0) {
    return null;
  }
  return {
    summary: geometrySummary(settings),
    checks: geometryChecks(settings),
    homing: homingTable(settings),
  };
};
