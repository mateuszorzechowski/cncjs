// Screenshots of the panel's screens on a phone, a tablet and a PC, for the
// design system's guidelines (src/panel/DESIGN.md is the text beside them).
//
//   node .design-sync/capture-screens.cjs [http://localhost:8001] [outDir]
//
// Runs against a panel server with no machine attached (the second server on
// :8001 — never the one driving the machine). The controller is faked the way
// e2e/panel-preview.spec.js does it: the client's port and commands are
// replaced and what the server would say is fired at the panel. The Grbl
// settings, geometry and envelope come from the server's own modules
// (output/cncjs/server — run the babel build first).
const fs = require('fs');
const path = require('path');
const { chromium } = require('../node_modules/playwright');
const { describeSettings, groupSummaries } = require('../output/cncjs/server/controllers/Grbl/machine-settings.js');
const { machineGeometry } = require('../output/cncjs/server/controllers/Grbl/geometry.js');
const { machineEnvelope } = require('../output/cncjs/server/controllers/Grbl/envelope.js');

const BASE = process.argv[2] || 'http://localhost:8010';
const OUT = process.argv[3] || path.join(__dirname, '.cache', 'screens');
fs.mkdirSync(OUT, { recursive: true });

const DEVICES = {
  phone: { width: 390, height: 844 },
  tablet: { width: 1024, height: 768 },
  pc: { width: 1920, height: 1080 },
};

// The bench's Grbl, as `$$` says it.
const REPORTED = {
  $0: '10', $1: '25', $2: '0', $3: '0', $4: '0', $5: '0', $6: '0', $10: '1', $11: '0.010', $12: '0.002', $13: '0',
  $20: '1', $21: '1', $22: '1', $23: '0', $24: '25.000', $25: '500.000', $26: '250', $27: '1.000',
  $30: '1000.000', $31: '0.000', $32: '0',
  $100: '800.000', $101: '800.000', $102: '800.000', $110: '5000.000', $111: '5000.000', $112: '600.000',
  $120: '500.000', $121: '500.000', $122: '100.000', $130: '1000.000', $131: '700.000', $132: '150.000',
};

// A pocket with a contour, small enough to read on every screen.
const PROGRAM = [
  'G21 G90 G17', 'G0 Z5', 'G0 X10 Y10', 'G1 Z-2 F300', 'G1 X90 F800', 'G1 Y60', 'G1 X10', 'G1 Y10',
  'G0 Z5', 'G0 X30 Y30', 'G1 Z-4 F300', 'G2 X70 Y30 I20 J0 F600', 'G2 X30 Y30 I-20 J0', 'G0 Z5', 'M30',
].join('\n');

const state = (activeState) => ({
  status: {
    activeState, subState: 0,
    mpos: { x: '-512.300', y: '-348.120', z: '-95.000' },
    wpos: { x: '12.300', y: '1.880', z: '5.000' },
    wco: { x: '-524.600', y: '-350.000', z: '-100.000' },
    ov: [100, 100, 100], feedrate: 0, spindle: 0,
  },
  parserstate: { modal: { wcs: 'G54', units: 'G21', distance: 'G90', plane: 'G17' }, tool: '1', feedrate: '800', spindle: '12000' },
});

// Each shot: the screen kept in localStorage, and optionally a settings tab
// to open, a text to press (a file in the list), or buttons to press in turn
// (`clicks`, the probe wizard's steps).
const SHOTS = [
  { name: 'dashboard', screen: 'dashboard' },
  { name: 'jog', screen: 'jog' },
  { name: 'zero', screen: 'zero' },
  { name: 'files', screen: 'files' },
  { name: 'files-selected', screen: 'files', pick: /\.nc$/ },
  { name: 'path', screen: 'path' },
  { name: 'journal', screen: 'journal' },
  { name: 'settings-connection', screen: 'settings', tab: 'Połączenie' },
  { name: 'settings-controller', screen: 'settings', tab: 'Sterownik' },
  { name: 'settings-preferences', screen: 'settings', tab: 'Preferencje' },
  { name: 'settings-install', screen: 'settings', tab: 'Instalacja' },
  // Sonda: the wizard's method cards, each method's Setup step, and the wire test.
  { name: 'probe-method', screen: 'probe' },
  { name: 'probe-z-setup', screen: 'probe', clicks: [/Płytka Z/] },
  { name: 'probe-corner-setup', screen: 'probe', clicks: [/Narożnik XYZ/, 'Dalej'] },
  { name: 'probe-z-wire', screen: 'probe', clicks: [/Płytka Z/, 'Dalej'] },
];

const open = async (browser, device, shot) => {
  const page = await browser.newPage({ viewport: DEVICES[device] });
  await page.addInitScript(({ screen }) => {
    window.localStorage.setItem('panel.screen', screen);
    let client = null;
    Object.defineProperty(window, '__panelController', {
      configurable: true,
      get: () => client,
      set: (value) => {
        client = value;
        client.openPort = (port, options, done) => { client.port = port; client.type = 'Grbl'; done(null); };
        ['write', 'writeln', 'closePort', 'command'].forEach((name) => { client[name] = () => {}; });
      },
    });
    window.__fire = (name, ...args) => {
      if (name === 'controller:state') {
        client.state = { ...args[1] };
      }
      (client.listeners[name] || []).slice().forEach((listener) => listener(...args));
    };
  }, { screen: shot.screen });
  await page.route('**/api/controllers', (route) => route.fulfill({
    json: [{ port: 'COM3', baudrate: 115200, rtscts: false, controller: { type: 'Grbl', state: state('Idle'), settings: { settings: REPORTED } } }],
  }));
  await page.goto(`${BASE}/?lng=pl`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__panelController?.port), null, { timeout: 45000 });
  await page.evaluate(({ reported, view, envelope, st, program }) => {
    window.__fire('controller:state', 'Grbl', st);
    window.__fire('controller:settings', 'Grbl', { settings: reported });
    window.__fire('controller:envelope', envelope);
    window.__fire('machine:settings', view);
    window.__fire('gcode:load', 'kieszen-kontur.nc', program);
    // Loaded, not started: what the sender reports for a program waiting to run.
    window.__fire('sender:status', { name: 'kieszen-kontur.nc', total: program.split('\n').length, sent: 0, received: 0 });
  }, {
    reported: REPORTED,
    // What the server sends as `machine:settings`: the firmware and each group's line besides the rows.
    view: {
      firmware: { name: 'Grbl', version: '1.1h' },
      rows: describeSettings(REPORTED),
      groups: groupSummaries(REPORTED),
      geometry: machineGeometry(REPORTED),
      history: [],
      readAt: new Date().toISOString(),
    },
    envelope: machineEnvelope(REPORTED),
    st: state('Idle'),
    program: PROGRAM,
  });
  if (shot.pick) {
    await page.getByText(shot.pick).first().click();
  }
  if (shot.tab) {
    await page.getByRole('button', { name: shot.tab, exact: true }).first().click();
  }
  for (const name of shot.clicks || []) {
    await page.getByRole('button', typeof name === 'string' ? { name, exact: true } : { name }).first().click();
    await page.waitForTimeout(600);
  }
  // The scene draws on demand; give it and the fades a moment.
  await page.waitForTimeout(2500);
  return page;
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const device of Object.keys(DEVICES)) {
    for (const shot of SHOTS) {
      const page = await open(browser, device, shot);
      page.on('pageerror', (e) => errors.push(`${device}/${shot.name}: ${e}`));
      await page.screenshot({ path: path.join(OUT, `${shot.name}-${device}.png`) });
      await page.close();
      process.stdout.write('.');
    }
  }
  console.log(`\n${Object.keys(DEVICES).length * SHOTS.length} shots in ${OUT}`);
  if (errors.length) console.log('page errors:\n' + errors.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
