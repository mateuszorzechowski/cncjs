import events from 'events';

/**
 * The units every panel shows and the machine goes back to — one setting for
 * the whole server (Mateusz, 2026-09-25: one setting, the server's, the
 * server responsible).
 *
 * Everything inside stays in millimetres. Grbl reports in them whatever the
 * parser's mode (`$13=0`, measured on COM3 the same day: a `G20 G1 X-1` moved
 * MPos by 25.400), the scene is drawn in them, and every line the server
 * writes says `G21`. What this holds is the *rule* for showing a millimetre
 * to a person and for reading one back from them: a factor, how many digits
 * mean something, and steps worth offering.
 *
 * A unit is an entry in `UNITS` and nothing else. The panel knows no unit by
 * name — it is handed this rule and formats with it.
 */

/*
 * Digits by what a figure is. A position to a thousandth of a millimetre is
 * the resolution the machine reports; the same in inches is a ten-thousandth,
 * and `1.000 in` would claim less than it knows. A program's size is read,
 * not set, so a tenth of a millimetre — the ruler's own figure.
 *
 * `step` is the one a jog starts on: 1 mm, and for inches the nearest step to
 * it on each axis — 0.1 in (2.54 mm) across the table, 0.01 in (0.25 mm) for
 * Z, where a step too coarse is the one that reaches the work.
 */
export const UNITS = {
  mm: {
    modal: 'G21',
    factor: 1,
    digits: { position: 3, size: 1, feed: 0 },
    jog: {
      xySteps: [0.1, 1, 10, 50],
      zSteps: [0.1, 1, 5],
      xy: { step: 1, rate: 1500, min: 100, max: 5000, fine: 100, coarse: 500 },
      z: { step: 1, rate: 600, min: 50, max: 2000, fine: 50, coarse: 200 },
    },
  },
  inch: {
    modal: 'G20',
    factor: 1 / 25.4,
    digits: { position: 4, size: 2, feed: 1 },
    jog: {
      xySteps: [0.001, 0.01, 0.1, 1],
      zSteps: [0.001, 0.01, 0.1],
      xy: { step: 0.1, rate: 60, min: 4, max: 195, fine: 4, coarse: 20 },
      z: { step: 0.01, rate: 24, min: 2, max: 80, fine: 2, coarse: 8 },
    },
  },
};

export const unitNames = Object.keys(UNITS);

export const isUnit = (name) => Object.prototype.hasOwnProperty.call(UNITS, name);

/**
 * A figure an operator gave, in millimetres. `undefined` units is
 * millimetres — every client from before this setting, and the console.
 *
 * To a ten-thousandth of a millimetre, because it goes into a line as it is:
 * the smallest inch step, 0.001, is `0.025400000000000002` in floating point,
 * and a jog line is no place for that. Rounded, it is 0.0254 and nothing is
 * lost.
 */
export const toMm = (value, name) => {
  if (!isUnit(name) || typeof value !== 'number') {
    return value;
  }
  return Math.round((value / UNITS[name].factor) * 1e4) / 1e4;
};

/** The most steps a list may offer: the jog card lays them out in one row. */
export const MOST_STEPS = 6;

/**
 * A list of jog steps as an operator gave it, or null when it is not one:
 * one to `MOST_STEPS` numbers, each above nought, each larger than the last.
 */
const stepList = (list) => {
  if (!Array.isArray(list) || list.length < 1 || list.length > MOST_STEPS) {
    return null;
  }
  const values = list.map(Number);
  const ok = values.every((v, i) => Number.isFinite(v) && v > 0 && v < 10000 && (i === 0 || v > values[i - 1]));
  return ok ? values : null;
};

/** The step a group starts on: the one asked for if offered, else the offered one nearest the default. */
const startingStep = (steps, asked, fallback) => {
  if (steps.includes(asked)) {
    return asked;
  }
  return steps.reduce((best, v) => (Math.abs(v - fallback) < Math.abs(best - fallback) ? v : best), steps[0]);
};

/**
 * The jog rule of a unit with the operator's own steps and rates over it
 * (Mateusz, 2026-09-24: *"w ustawieniach się dorobi"*). Only what was set is
 * kept, so a default changed here reaches every server that did not.
 */
export const jogRule = (name, own = {}) => {
  const base = UNITS[name].jog;
  const xySteps = own.xySteps || base.xySteps;
  const zSteps = own.zSteps || base.zSteps;
  const group = (key, steps) => ({
    ...base[key],
    step: startingStep(steps, own[key]?.step, base[key].step),
    rate: own[key]?.rate ?? base[key].rate,
  });
  return { xySteps, zSteps, xy: group('xy', xySteps), z: group('z', zSteps) };
};

/**
 * What of `patch` may be kept for `name`, or a reason it may not: the
 * steps as `stepList` has them, a starting step among them, a rate within
 * the unit's own bounds. Null in `patch` is "back to the default".
 */
export const jogPatch = (name, patch, current = {}) => {
  if (patch === null) {
    return { own: {} };
  }
  if (typeof patch !== 'object') {
    return { error: '`jog` is an object' };
  }
  const own = { ...current };
  for (const key of ['xySteps', 'zSteps']) {
    if (patch[key] !== undefined) {
      const steps = stepList(patch[key]);
      if (!steps) {
        return { error: `\`${key}\`: 1 to ${MOST_STEPS} rising numbers above 0` };
      }
      own[key] = steps;
    }
  }
  for (const key of ['xy', 'z']) {
    const given = patch[key];
    if (given !== undefined) {
      const { min, max } = UNITS[name].jog[key];
      const rate = given.rate === undefined ? undefined : Number(given.rate);
      if (rate !== undefined && !(rate >= min && rate <= max)) {
        return { error: `\`${key}.rate\`: ${min} to ${max}` };
      }
      const step = given.step === undefined ? undefined : Number(given.step);
      own[key] = { ...own[key], ...(rate !== undefined ? { rate } : {}), ...(step !== undefined ? { step } : {}) };
    }
  }
  return { own };
};

class Units extends events.EventEmitter {
  name = 'mm';

  // The operator's own jog steps and rates, by unit — see `jogRule`.
  jog = {};

  // Whether the machine is put back into these units after a program: M2
  // and M30 leave G20 in force, and the console after it reads inches.
  restore = false;

  open({ name, restore, jog } = {}) {
    this.name = isUnit(name) ? name : 'mm';
    this.restore = Boolean(restore);
    // What `.cncrc` holds is trusted no further than a request would be.
    this.jog = {};
    for (const unit of unitNames) {
      const { own } = jogPatch(unit, jog?.[unit] ?? null);
      if (own && Object.keys(own).length > 0) {
        this.jog[unit] = own;
      }
    }
  }

  /** What a panel is sent: the rule, whole, with the choices that made it. */
  rule() {
    return { name: this.name, restore: this.restore, ...UNITS[this.name], jog: jogRule(this.name, this.jog[this.name]) };
  }

  /** The line that puts the machine into these units. */
  modal() {
    return UNITS[this.name].modal;
  }

  set({ name = this.name, restore = this.restore } = {}) {
    this.name = isUnit(name) ? name : this.name;
    this.restore = Boolean(restore);
    this.emit('change', this.rule());
    return this.rule();
  }

  /** The operator's jog steps and rates for the units in force; a reason when refused. */
  setJog(patch) {
    const { own, error } = jogPatch(this.name, patch, this.jog[this.name]);
    if (error) {
      return { error };
    }
    this.jog = { ...this.jog, [this.name]: own };
    if (Object.keys(own).length === 0) {
      delete this.jog[this.name];
    }
    this.emit('change', this.rule());
    return { rule: this.rule() };
  }

  /** What `.cncrc` keeps. */
  saved() {
    return { name: this.name, restore: this.restore, ...(Object.keys(this.jog).length ? { jog: this.jog } : {}) };
  }
}

const units = new Units();

export default units;
