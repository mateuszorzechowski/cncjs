const fs = require('fs');
const os = require('os');
const path = require('path');
const { duplicateRoles, newestUnder } = require('../preflight');

/**
 * Telling one watcher from two.
 *
 * The only part of the preflight worth a unit test, and it earns one by having
 * been wrong twice in the same way: a wrapper process carries the whole command
 * line of the thing it is about to spawn, so counting command lines finds two
 * of everything. `npx` and `npm` were excluded when this check was written;
 * `cross-env` was not, and `cross-env` is how every dev script in this project
 * starts.
 *
 * The command lines below are copied from `Get-CimInstance Win32_Process` on
 * 2026-09-24 rather than invented, because the whole failure mode is a guess
 * about what a command line looks like.
 */
describe('duplicateRoles', () => {
  const NODE = '"C:\\Program Files\\nodejs\\node.exe"';
  const CONFIG = '"--watch" "--config" "webpack.config.panel.development.js"';

  const process_ = (pid, command) => ({ pid, mb: 100, command });

  // One panel watcher, as `yarn start-panel-dev` actually leaves it: the yarn
  // release, the cross-env wrapper, and the webpack that does the work.
  const oneWatcher = [
    process_(9044, `${NODE} .yarn/releases/yarn-3.3.1.cjs start-panel-dev`),
    process_(28604, `${NODE}  "E:\\projekty\\desktop\\cncjs\\node_modules\\cross-env\\dist\\bin\\cross-env.js" "NODE_ENV=development" "webpack" ${CONFIG}`),
    process_(25312, `${NODE}  "E:\\projekty\\desktop\\cncjs\\node_modules\\webpack\\bin\\webpack.js" ${CONFIG}`),
  ];

  it('counts a cross-env wrapper and its webpack as one watcher', () => {
    expect(duplicateRoles(oneWatcher)).toEqual([]);
  });

  it('counts an npx wrapper and its webpack as one watcher', () => {
    expect(duplicateRoles([
      process_(1, `${NODE} "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js" "webpack" ${CONFIG}`),
      process_(2, `${NODE} node_modules\\webpack\\bin\\webpack.js ${CONFIG}`),
    ])).toEqual([]);
  });

  // The finding this check exists for: two webpacks writing one bundle file,
  // where the loser's output is what gets served.
  it('reports two real watchers, oldest first in the kill advice', () => {
    const found = duplicateRoles([
      ...oneWatcher,
      process_(31000, `${NODE}  "E:\\projekty\\desktop\\cncjs\\node_modules\\webpack\\bin\\webpack.js" ${CONFIG}`),
    ]);

    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('the panel watcher');
    expect(found[0].running.map((one) => one.pid)).toEqual([25312, 31000]);
  });

  it('tells the two watchers apart rather than counting them together', () => {
    const found = duplicateRoles([
      process_(1, `${NODE} node_modules\\webpack\\bin\\webpack.js ${CONFIG}`),
      process_(2, `${NODE} node_modules\\webpack\\bin\\webpack.js "--watch" "--config" "webpack.config.development.js"`),
    ]);

    // One of each is not two of one, and `webpack.config.panel.development.js`
    // must not be read as the workspace config because it ends the same way.
    expect(found).toEqual([]);
  });

  it('reports a second dev server', () => {
    const found = duplicateRoles([
      process_(1, `${NODE} ./bin/cncjs --port 8000`),
      process_(2, `${NODE} ./bin/cncjs --port 8001`),
    ]);

    expect(found.map((one) => one.id)).toEqual(['the dev server']);
  });

  it('says nothing about a machine with nothing running', () => {
    expect(duplicateRoles([])).toEqual([]);
  });
});

/**
 * What counts as the panel's source, when asking whether its bundle is stale.
 *
 * Wrong once for a note (`server-backlog.md`) and once for a test: both sit
 * under `src/panel`, neither is read by webpack, and editing either refused a
 * run that could pass.
 */
describe('newestUnder', () => {
  const tree = () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-'));
    const at = (file, when) => {
      const full = path.join(root, file);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, '');
      fs.utimesSync(full, when / 1000, when / 1000);
    };
    return { root, at };
  };

  test('is the newest file webpack builds from', () => {
    const { root, at } = tree();
    at('machine/readings.js', 1000000);
    at('ui/Button.jsx', 2000000);

    expect(newestUnder(root)).toBe(2000000);
  });

  test('ignores a test, which is never bundled', () => {
    const { root, at } = tree();
    at('machine/readings.js', 1000000);
    at('machine/__tests__/readings.test.js', 9000000);

    expect(newestUnder(root)).toBe(1000000);
  });

  test('ignores a note', () => {
    const { root, at } = tree();
    at('machine/readings.js', 1000000);
    at('server-backlog.md', 9000000);

    expect(newestUnder(root)).toBe(1000000);
  });
});
