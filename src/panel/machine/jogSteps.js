/**
 * The jog steps as typed in Settings, read the way the server will take them
 * (`services/units` — `stepList`): blank fields dropped, a comma as a
 * decimal point, one to `MOST_STEPS` numbers above nought, each larger than
 * the last. Null when they are not, so Save can be dark before the server
 * has to refuse.
 */
export const MOST_STEPS = 6;

export const readSteps = (fields) => {
  const values = fields
    .map((field) => String(field).trim().replace(',', '.'))
    .filter((field) => field.length > 0)
    .map(Number);
  if (values.length < 1 || values.length > MOST_STEPS) {
    return null;
  }
  const rising = values.every((v, i) => Number.isFinite(v) && v > 0 && (i === 0 || v > values[i - 1]));
  return rising ? values : null;
};

export default readSteps;
