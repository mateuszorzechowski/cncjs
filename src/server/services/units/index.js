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
 */
export const UNITS = {
  mm: {
    modal: 'G21',
    factor: 1,
    digits: { position: 3, size: 1, feed: 0 },
    jog: {
      xySteps: [0.1, 1, 10, 50],
      zSteps: [0.1, 1, 5],
      xy: { rate: 1500, min: 100, max: 5000, fine: 100, coarse: 500 },
      z: { rate: 600, min: 50, max: 2000, fine: 50, coarse: 200 },
    },
  },
  inch: {
    modal: 'G20',
    factor: 1 / 25.4,
    digits: { position: 4, size: 2, feed: 1 },
    jog: {
      xySteps: [0.001, 0.01, 0.1, 1],
      zSteps: [0.001, 0.01, 0.1],
      xy: { rate: 60, min: 4, max: 195, fine: 4, coarse: 20 },
      z: { rate: 24, min: 2, max: 80, fine: 2, coarse: 8 },
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

class Units extends events.EventEmitter {
  name = 'mm';

  // Whether the machine is put back into these units after a program: M2
  // and M30 leave G20 in force, and the console after it reads inches.
  restore = false;

  open({ name, restore } = {}) {
    this.name = isUnit(name) ? name : 'mm';
    this.restore = Boolean(restore);
  }

  /** What a panel is sent: the rule, whole, with the choices that made it. */
  rule() {
    return { name: this.name, restore: this.restore, ...UNITS[this.name] };
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
}

const units = new Units();

export default units;
