# End-to-end smoke tests

These specs exist to catch regressions that the Jest suite structurally cannot
see: a page in a real browser, the server's routes, and a controller on a
serial port.

The server serves the panel (`src/panel`) at the site root. The old
application in `src/app` is no longer served (2026-10-08), and its specs went
with it.

## Running

The smoke and hardware tiers test a server that is already running; they do not
start one. The auth tier starts its own, and the Electron tier launches the
packaged app.

```bash
yarn dev          # or: yarn win-dev on Windows
yarn test:e2e     # in another shell
```

The suite and `yarn dev` use **:8010**. :8000 and :8001 are the instances
behind `cnc.home.lan` and `sim.home.lan` — someone's machine and simulator,
not test servers — so nothing here starts on them or runs against them.

Point it at a different instance with `CNCJS_URL`:

```bash
CNCJS_URL=http://192.168.0.50:8000 yarn test:e2e
```

First run needs the browser binary:

```bash
npx playwright install chromium
```

The project pins the `chromium` channel rather than the default headless
shell, because the shell ships without WebGL and the panel's previews need it.

## What is covered

- **panel*.spec.js** — the panel with no machine: it loads, says there is no
  machine, its screens are addresses, back goes home, its manifest and icons
  are served, files and previews draw, it updates itself.
- **error-pages.spec.js** — the server's 404 view, for a file that is not
  there.
- **api-upload.spec.js** — the multipart parser accepts text fields and
  refuses files.

## What is not covered

Anything requiring a machine: jogging, G-code streaming, probing, homing. Those
need a controller on a serial port and, more importantly, they move real
hardware — they belong in a separate, explicitly opt-in tier.

## Console assertions

`fixtures.js` collects console errors, uncaught exceptions and failed requests,
and `expectNoPageErrors()` asserts all three are empty. Two filter lists keep
that assertion honest rather than permanently red:

- dev-server noise — the HMR client dials `:8000/ws` while webpack-dev-server
  listens on `:8080`, and `eslint-webpack-plugin` pipes lint warnings through
  the browser console;
- requests that may legitimately fail — chiefly `*.hot-update.json`, which a
  page already open requests after a rebuild has invalidated its hash.

Add to these lists only for noise that genuinely carries no application signal.
Everything else should be fixed in the app instead.

## Hardware tier

`e2e/hardware/` drives a real controller over a serial port. It is skipped
unless `CNCJS_TEST_PORT` names one, so `yarn test:e2e` stays runnable on a
machine with nothing plugged in.

```bash
CNCJS_TEST_PORT=COM3 yarn test:e2e --project=hardware
```

The fixture (`hardware/fixtures.js`) opens the port itself, through the
socket protocol and a token from `/api/signin`, and unlocks a Grbl that comes
up in alarm. The panel then loads against a machine already connected.

- `grbl.spec.js` — the port opens, the controller reports Idle, and the
  firmware settings were read.
- `panel.spec.js` — the panel with a controller answering. **These cases move
  the machine**: every jog returns the axis to where it started, and nothing
  touches the work coordinate system — but with a controller wired to a
  powered machine, the axes physically move. Check your clearances first.
- `teardown.spec.js` — closes the port once the whole tier is done.

This tier exists because the smoke tier structurally cannot see a whole class
of regression: it never opens a serial port, so every code path behind
`serialport:open` is invisible to it. The xterm upgrade that broke
`Console/Terminal.jsx` is the worked example — the widget threw inside the open
handler, and because `lib/controller/Controller.js` dispatches to listeners
with a plain `forEach`, the exception silenced every widget registered after
it. The workspace connected successfully and came up entirely unjoggable.

## Electron tier

`e2e/electron/` drives the packaged desktop app through Playwright's Electron
support, so it launches a real Electron process rather than a browser. It is
skipped until a build exists.

```bash
yarn build-prod
yarn test:e2e --project=electron
```

The client-mode specs also need a cncjs server to point at — `CNCJS_URL`,
defaulting to `http://localhost:8010`, the same as the smoke tier.

What it locks in:

- the app starts its own server on a random loopback port and mounts the
  panel;
- the renderer has no route into Node — `require`, `process`, `ipcRenderer` and
  `module` are all undefined. This is the assertion that matters most: the
  window loads its content over HTTP, from another machine once a server is
  configured, so anything reachable there is reachable by whoever serves that
  page;
- the preload bridge exposes exactly `readUserConfig` and `writeUserConfig`.
  Widening that list is a security decision, not a refactor, and this test is
  meant to make you argue for it;
- the user config round-trips over IPC, and the spec restores whatever it
  found;
- client mode loads the configured server, reaches its API, survives a restart,
  and releases back to the local server on an empty `--server-url`;
- the server picker rejects a malformed address instead of storing it. Storing
  it would relaunch the app pointed at a server that cannot exist, and the only
  way back would be the command line.

Specs that change the configured server write into `electron-store`, which
outlives the process. `afterEach` puts it back — if you add a spec that touches
it, keep that guarantee or the next run starts somewhere unexpected.

## Auth tier

`e2e/auth/` covers the API gate the way a deployment meets it. It starts its
own server rather than using the dev one, because `NODE_ENV=development`
bypasses JWT verification outright in `src/server/app.js` — every assertion
here would pass vacuously against `yarn win-dev`.

```bash
yarn build-prod
yarn test:e2e --project=auth
```

It needs no running server and no hardware. Each block spawns
`bin/cncjs` in production mode on a free port with its own temporary `.cncrc`,
so the accounts under test never touch your own config, and kills it afterwards.

What it locks in:

- with accounts configured, a request carrying no token is refused, a wrong
  password is refused, and the right password yields a token that works;
- **a token stops working when its account is deleted.** The token still
  verifies — it carries the server's signature and has not expired — so
  `expressjwt` passing is not the same question as "does this account still
  exist". Until this was fixed the two were conflated and deleting a user left
  their access intact for the lifetime of their token, 30 days by default;
- deleting one account does not disturb another;
- before any account exists, `/api/signin` hands a token to anyone and the
  server honours it. That is cncjs's first-run behaviour and the tier pins it
  so that tightening the gate cannot quietly break setting the machine up.

The specs assert on `/api/controllers`, which needs no machine attached and
answers `[]`.

## Running the dev server for long sessions

Two things worth knowing if you leave `yarn win-dev` up for hours while
iterating on these specs.

The webpack watcher grows. On a long session it has been observed past 10 GB
of resident memory — `eval-cheap-module-source-map` over a project this size
keeps a lot alive. Restart it occasionally rather than wondering where the RAM
went.

`win-dev` is a tree — `yarn` → `concurrently` → `npm` → `cross-env` → the
server and the webpack watcher. Killing whatever is listening on :8010 and
:8080 kills the leaves and orphans everything above them, and the orphaned
watcher keeps running and keeps growing. Kill the tree:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'cncjs|win-dev|start-app-dev|start-server-dev' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

Playwright itself cleans up after runs — leaked browsers have not been a
problem here. Check before blaming it: Playwright's Chromium lives under
`ms-playwright`, so anything running from `Program Files` is your own browser
and killing it will cost you your tabs.
