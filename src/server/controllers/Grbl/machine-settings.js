/**
 * Grbl's own settings — `$0` to `$132` — as the panel's Sterownik tab shows
 * them and as a write to one is checked before it reaches the EEPROM.
 *
 * Asked for by Mateusz on 2026-09-26: settings grouped by topic and each one
 * described, a raw `$x` view beside them, every write confirmed. And on the
 * same day: the figures follow the server's mm/inch switch like every other
 * figure, and a write goes through the server, which keeps a copy and the
 * history.
 *
 * **What a setting is, not what it says.** A row is a name, a group, a kind
 * and a unit; the sentence describing it is the panel's, by name, in the
 * panel's language — the same rule as the journal's codes.
 *
 * `unit` is how the value converts when the server says inches:
 * - `length` — millimetres (`$11`, `$12`, `$27`, `$130`-`$132`)
 * - `feed` — millimetres a minute (`$24`, `$25`, `$110`-`$112`)
 * - `accel` — millimetres a second squared (`$120`-`$122`)
 * - `perLength` — steps a millimetre (`$100`-`$102`), the one that divides
 * - anything else is shown and written as Grbl has it: µs, ms, RPM.
 *
 * `kind` is what may be written: `bool` 0 or 1, `mask` a whole number of
 * bits up to `max`, `int` a whole number within `min`..`max`, `float` a
 * number above `min` (Grbl stores three decimals). `bits` names what a
 * mask's bits are: `axes` X, Y, Z, or `report` for `$10`.
 */

const axes = (first, group, unit, extra = {}) => ['x', 'y', 'z'].map((axis, i) => ({
  name: `$${first + i}`, group, kind: 'float', unit, min: 0, axis, ...extra,
}));

/*
 * In the groups and the order of the settings design (`Ustawienia
 * sterownika`, 2026-09-26): the axes with their direction and homing-side
 * masks, then homing, limits, spindle, the motors' signals, and motion with
 * the report.
 */
export const SETTINGS = [
  { name: '$3', group: 'axes', kind: 'mask', max: 7, bits: 'axes' },
  { name: '$23', group: 'axes', kind: 'mask', max: 7, bits: 'axes' },
  ...axes(100, 'axes', 'perLength'),
  ...axes(110, 'axes', 'feed'),
  ...axes(120, 'axes', 'accel'),
  ...axes(130, 'axes', 'length'),
  { name: '$22', group: 'homing', kind: 'bool' },
  { name: '$25', group: 'homing', kind: 'float', unit: 'feed', min: 0 },
  { name: '$24', group: 'homing', kind: 'float', unit: 'feed', min: 0 },
  { name: '$26', group: 'homing', kind: 'int', unit: 'ms', min: 0, max: 65535 },
  { name: '$27', group: 'homing', kind: 'float', unit: 'length', min: 0 },
  // Grbl turns `$20` off by itself when `$22` is turned off (measured on
  // COM3, 2026-09-26) and refuses `$20=1` without homing: `needs` says so.
  { name: '$20', group: 'limits', kind: 'bool', needs: '$22' },
  { name: '$21', group: 'limits', kind: 'bool' },
  { name: '$5', group: 'limits', kind: 'bool' },
  { name: '$30', group: 'spindle', kind: 'float', unit: 'rpm', min: 0 },
  { name: '$31', group: 'spindle', kind: 'float', unit: 'rpm', min: 0 },
  { name: '$32', group: 'spindle', kind: 'bool' },
  { name: '$0', group: 'signals', kind: 'int', unit: 'us', min: 3, max: 255 },
  { name: '$1', group: 'signals', kind: 'int', unit: 'ms', min: 0, max: 255 },
  { name: '$2', group: 'signals', kind: 'mask', max: 7, bits: 'axes' },
  { name: '$4', group: 'signals', kind: 'bool' },
  { name: '$6', group: 'signals', kind: 'bool' },
  { name: '$11', group: 'motion', kind: 'float', unit: 'length', min: 0 },
  { name: '$12', group: 'motion', kind: 'float', unit: 'length', min: 0 },
  { name: '$10', group: 'motion', kind: 'mask', max: 3, bits: 'report' },
  /*
   * Locked at the value the server needs. Every figure the server hands out
   * is in millimetres because Grbl reports in them with `$13=0` (measured on
   * COM3, 2026-09-25); `$13=1` would turn every position into inches
   * underneath a server that reads them as millimetres. The mm/inch switch
   * is the server's, one level up. `required` is the one value that may be
   * written — the panel's fix when a controller has the other.
   */
  { name: '$13', group: 'motion', kind: 'bool', locked: 'units', required: 0 },
];

// Lower case: `react-refresh/babel` takes a capitalised name set by a call
// for a component, and the server then dies on `$RefreshReg$` at start.
const byName = Object.fromEntries(SETTINGS.map((s) => [s.name, s]));

/** One inch in millimetres — the only factor there is between the two. */
const INCH = 25.4;

/**
 * A figure an operator gave, in what Grbl stores. `inch` is whether it was
 * shown in inches; only the four units that convert do.
 */
const fromShown = (value, unit, inch) => {
  if (!inch) {
    return value;
  }
  if (unit === 'perLength') {
    return value / INCH;
  }
  if (unit === 'length' || unit === 'feed' || unit === 'accel') {
    return value * INCH;
  }
  return value;
};

/** What Grbl is sent: whole numbers bare, the rest to its three decimals. */
const written = (value, kind) => (kind === 'float' ? (Math.round(value * 1000) / 1000).toFixed(3) : String(value));

/**
 * Every setting the controller reported, in the table's order, then any it
 * reported that the table does not know (grblHAL has hundreds) as raw ones.
 * `value` is a number — Grbl's, in millimetres; the panel converts it with
 * the units rule. `raw` is the text `$$` said, for the panel's `$x` view.
 * `wrong` marks a locked setting holding anything but its `required` value.
 */
export const describeSettings = (reported = {}) => {
  const known = SETTINGS
    .filter((s) => reported[s.name] !== undefined)
    .map((s) => {
      const value = Number(reported[s.name]);
      return { ...s, value, raw: reported[s.name], ...(s.required !== undefined ? { wrong: value !== s.required } : {}) };
    });
  const unknown = Object.keys(reported)
    .filter((name) => !byName[name])
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
    .map((name) => ({ name, group: 'other', kind: 'float', value: Number(reported[name]), raw: reported[name] }));
  return [...known, ...unknown];
};

/**
 * The line that writes what an operator asked, or the reason it may not.
 *
 * `{ name, value, units }` — `units` the server's unit the value was shown
 * in, `inch` or anything else for millimetres, so a figure read off a
 * screen in inches is written in millimetres.
 *
 * Only a setting the controller reported may be written: a name it never
 * said is one this firmware may not have.
 */
export const settingWrite = ({ name, value, units } = {}, reported = {}) => {
  if (reported[name] === undefined) {
    return { refusal: 'unknown-setting' };
  }
  const setting = byName[name] || { kind: 'float' };
  const given = typeof value === 'string' ? Number(value.trim().replace(',', '.')) : value;
  // A locked setting takes its required value and nothing else.
  if (setting.locked && given !== setting.required) {
    return { refusal: 'setting-locked' };
  }
  if (typeof given !== 'number' || !Number.isFinite(given)) {
    return { refusal: 'bad-value' };
  }
  const grbl = fromShown(given, setting.unit, units === 'inch');
  const whole = setting.kind !== 'float';
  const max = setting.kind === 'bool' ? 1 : setting.max;
  const ok = (!whole || Number.isInteger(grbl)) &&
    grbl >= (setting.min ?? 0) &&
    (max === undefined || grbl <= max) &&
    // A rate, an acceleration, steps: nought stops the axis for good.
    !(setting.unit && ['perLength', 'feed', 'accel'].includes(setting.unit) && grbl === 0);
  if (!ok) {
    return { refusal: 'bad-value' };
  }
  const text = written(grbl, setting.kind);
  return { line: `${name}=${text}`, value: text };
};
