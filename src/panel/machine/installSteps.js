/**
 * Where this device is in putting the panel on its home screen — the two
 * steps of the settings design's Install tab (variant 2b): trust the
 * certificate, then install. They are a sequence, not a list of settings:
 * a browser installs only a secure page, so step 2 waits on step 1.
 *
 * @param {object} state `trust` from `machine/trust` (null once the page is
 *   secure), `installed` and `ready` from `machine/install`
 * @returns {{ cert: string, install: string }} `cert`: `done` or `todo`;
 *   `install`: `done`, `ready`, `waiting` (secure, and the browser has not
 *   offered yet) or `blocked` (step 1 first)
 */
export const installSteps = ({ trust, installed, ready }) => {
  const cert = trust ? 'todo' : 'done';
  let install = 'blocked';
  if (installed) {
    install = 'done';
  } else if (cert === 'done') {
    install = ready ? 'ready' : 'waiting';
  }
  return { cert, install };
};

export default installSteps;
