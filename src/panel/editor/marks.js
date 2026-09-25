const SEVERITY_TONE = { incompatible: 'bad', warning: 'warn' };

/**
 * Where the checks found something, as lines to mark: the server's check
 * (each problem at its first line, in its severity) and what Grbl refused in
 * `$C` (always red — the machine said no).
 */
export const marksOf = (file) => [
  ...(file.analysis?.check?.issues || []).map((issue) => ({ line: issue.line, tone: SEVERITY_TONE[issue.severity] })),
  ...(file.controllerCheck?.errors || []).map((error) => ({ line: error.line, tone: 'bad' })),
].filter(({ line }) => Number.isInteger(line));
