/**
 * What the editor can say about the word being typed beyond its name —
 * pure, so Jest reads it without CodeMirror: which code the line's words
 * belong to, the words that code takes (the server's `params`), and what the
 * connected machine says about a figure (`$110`, `$30`, `G54`…).
 *
 * Nothing here works anything out: the letters per code are the server's
 * list, the figures are the machine's own settings, read as they came.
 */

/** The last G or M code in `text` — the line before the cursor — as the server names it, or null. */
export const codeBefore = (text) => {
  const bare = String(text).replace(/\([^)]*\)|;.*$/g, '').toUpperCase();
  const codes = bare.match(/[GM]\s*\d+(\.\d+)?/g);
  if (!codes) {
    return null;
  }
  const last = codes[codes.length - 1].replace(/\s+/g, '');
  return `${last[0]}${Number(last.slice(1))}`;
};

/** The words `code` takes, from the server's `params`; empty for a code with none listed. */
export const wordsFor = (params, code) => (code && params?.[code]) || [];

const setting = (settings, name) => {
  const value = Number(settings?.settings?.[name]);
  return Number.isFinite(value) ? settings.settings[name] : null;
};

/**
 * The machine's figures worth offering while typing: its fastest feed per
 * axis group (`$110`/`$111` for X and Y, `$112` for Z), its top spindle speed
 * (`$30`), and where each coordinate system is (`G54`…`G59`). Only what the
 * machine has said; an empty object with no machine.
 */
export const machineFigures = (settings) => {
  const figures = {};
  const xy = setting(settings, '$110');
  const z = setting(settings, '$112');
  const spindle = setting(settings, '$30');
  if (xy !== null) {
    figures.F = { value: xy, from: '$110', z, zFrom: z === null ? null : '$112' };
  }
  if (spindle !== null) {
    figures.S = { value: spindle, from: '$30' };
  }
  const parameters = settings?.parameters || {};
  for (const wcs of ['G54', 'G55', 'G56', 'G57', 'G58', 'G59']) {
    const at = parameters[wcs];
    if (at) {
      figures[wcs] = { x: at.x, y: at.y, z: at.z };
    }
  }
  return figures;
};
