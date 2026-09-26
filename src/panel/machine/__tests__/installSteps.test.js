import { installSteps } from '../installSteps';

const UNTRUSTED = { key: 'connect.trust.untrusted' };

describe('the two install steps', () => {
  test('an untrusted page: the certificate to do, and installing dark until it is', () => {
    expect(installSteps({ trust: UNTRUSTED, installed: false, ready: false })).toEqual({ cert: 'todo', install: 'blocked' });
    // Even if the browser offered — it will not install over an untrusted connection.
    expect(installSteps({ trust: UNTRUSTED, installed: false, ready: true })).toEqual({ cert: 'todo', install: 'blocked' });
  });

  test('a secure page: step 1 done, step 2 waits for the browser to offer, then is ready', () => {
    expect(installSteps({ trust: null, installed: false, ready: false })).toEqual({ cert: 'done', install: 'waiting' });
    expect(installSteps({ trust: null, installed: false, ready: true })).toEqual({ cert: 'done', install: 'ready' });
  });

  test('installed is done, however the page was opened', () => {
    expect(installSteps({ trust: null, installed: true, ready: false }).install).toBe('done');
  });
});
