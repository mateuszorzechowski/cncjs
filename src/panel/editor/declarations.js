/**
 * The modal groups a program leaves to whatever ran before it, and the fix:
 * a line at its head that declares them (Mateusz, 2026-09-26: *"czy dla tych
 * ostrzeżeń możemy mieć przycisk fix i wybór poleceń, które trzeba dodać?"*).
 * Pure, so Jest reads it.
 *
 * What goes in for each group is the usual answer, and for the units the
 * server's own — a program checked against a machine kept in inches is
 * offered `G20`. The operator chooses which to add; nothing is added unasked.
 */

/** The file check's group names (`check.js` — `undeclared`) to the code offered for each. */
export const offerFor = (group, units = 'G21') => ({
  'G20/G21': units,
  'G90/G91': 'G90',
  'G17/G18/G19': 'G17',
}[group] || null);

/** The groups the findings say are undeclared, each once, with the code offered — in the file's order. */
export const missingDeclarations = (findings, units = 'G21') => {
  const seen = new Set();
  const missing = [];
  for (const finding of findings) {
    const code = finding.code === 'undeclared' ? offerFor(finding.word, units) : null;
    if (code && !seen.has(finding.word)) {
      seen.add(finding.word);
      missing.push({ group: finding.word, code });
    }
  }
  return missing;
};

/**
 * Where a declaration goes: the very top, or after the program's opening
 * `%` when it has one — Grbl-style files start with that line, and nothing
 * is to come before it.
 */
export const headAt = (text) => {
  const first = text.match(/^\s*%[^\n]*\n/);
  return first ? first[0].length : 0;
};

/** The line to insert, for these codes. */
export const declarationLine = (codes) => `${codes.join(' ')}\n`;
