import { canHome } from './homing';

/** What a reading says when there is nothing to say. Not "0", not an empty cell. */
export const NO_READING = '–';

const GRBL = 'Grbl';
const MARLIN = 'Marlin';
const SMOOTHIE = 'Smoothie';
const TINYG = 'TinyG';

/**
 * The firmwares this panel knows how to read, in the order the help lists
 * them.
 *
 * Named here rather than in the help sheet because this file is what actually
 * knows: `statesOf` below answers for each of them, and a list kept beside it
 * that says something different would be a list nobody notices going stale.
 *
 * Not the same question as `controllerChoices` in `ports.js`, which asks the
 * *server* what it can drive. What can be connected and what can be explained
 * are different lists, and the help has to explain a Marlin whether or not
 * this particular server was built with one.
 */
export const CONTROLLERS = [GRBL, MARLIN, SMOOTHIE, TINYG];

/**
 * The one state in which a written line does not arrive.
 *
 * Every controller the server drives gates its feeder the same way —
 * `if (this.runner.isAlarm()) { this.feeder.reset(); return; }` in each of
 * `Grbl`, `Marlin`, `Smoothie` and `TinyG` — so a line written while the
 * machine is in alarm is dropped by the *server*, before the cable, with a
 * warning in its log and nothing at all on the wire.
 *
 * Measured 2026-09-23, not reasoned about: pressing Zero Z on an alarmed
 * machine put `G10 L20 P1 Z0` on the socket, left `Stopped sending G-code
 * commands in Alarm mode` in the server log, and changed no offset. A control
 * that looks live and is silently swallowed is the shape this panel has been
 * bitten by before — see the jog step at the edge of travel.
 */
const ALARM = 'Alarm';

/**
 * The two states worth naming outside this file.
 *
 * Exported rather than written out again wherever they are needed. They are
 * the firmware's own words and go on screen exactly as it says them — rule 8
 * keys only the four states the panel invents for itself — so a second copy
 * in a component would be a literal that drifts from the one the panel
 * actually recognises, and a lint rule that cannot tell the difference would
 * be right to flag it.
 */
export const ALARM_STATE = ALARM;
export const DOOR_STATE = 'Door';

/**
 * Which tone a machine state is shown in.
 *
 * Grbl reports nine states and the panel shows three colours plus an absence
 * of one, so the mapping is a judgement and is written down rather than spread
 * through a view:
 *
 * - **running** — the tool is moving. Run, Jog and Home are all motion.
 * - **ready** — powered, holding position, one command away from moving. Hold
 *   belongs here: a feed hold is a pause someone asked for, and colouring it
 *   like an alarm spends the alarm colour on something working as intended.
 * - **stopped** — it will not move until someone deals with it. Alarm is the
 *   machine refusing; Door is the same refusal arriving from outside.
 * - **inactive** — nothing to report, and no colour to spend on it.
 */
const GRBL_TONES = {
  Run: 'running',
  Jog: 'running',
  Home: 'running',
  Idle: 'ready',
  Hold: 'ready',
  Alarm: 'stopped',
  Door: 'stopped',
  Check: 'inactive',
  Sleep: 'inactive',
};

// TinyG answers the same question with an integer. An operator should not have
// to know which firmware they are looking at in order to read the chip.
const TINYG_STATES = {
  0: { word: 'Initializing', tone: 'inactive' },
  1: { word: 'Ready', tone: 'ready' },
  2: { word: 'Alarm', tone: 'stopped' },
  3: { word: 'Stop', tone: 'ready' },
  4: { word: 'End', tone: 'ready' },
  5: { word: 'Run', tone: 'running' },
  6: { word: 'Hold', tone: 'ready' },
  7: { word: 'Probe', tone: 'running' },
  8: { word: 'Cycle', tone: 'running' },
  9: { word: 'Home', tone: 'running' },
  10: { word: 'Jog', tone: 'running' },
  11: { word: 'Interlock', tone: 'stopped' },
  12: { word: 'Shutdown', tone: 'stopped' },
  13: { word: 'Panic', tone: 'stopped' },
};

/**
 * Every state this controller type can report, in the order it reads in.
 *
 * Built from the same two maps the chip is coloured from, so the help sheet
 * cannot drift from what the panel actually recognises -- a list of states
 * maintained by hand beside a map of states is two lists, and the one nobody
 * is looking at goes stale first.
 *
 * Marlin answers with nothing, and that is the honest answer: it reports no
 * machine state at all, so a panel connected to one sits at `noReading` for
 * the whole session. Not a fault, and worth saying somewhere.
 */
export const statesOf = (type) => {
  if (type === GRBL || type === SMOOTHIE) {
    return Object.entries(GRBL_TONES).map(([word, tone]) => ({ word, tone }));
  }
  if (type === TINYG) {
    return Object.values(TINYG_STATES);
  }
  return [];
};

const activeStateOf = (type, state) => {
  if (type === GRBL || type === SMOOTHIE) {
    const word = state?.status?.activeState;
    return word ? { word, tone: GRBL_TONES[word] || 'inactive' } : null;
  }
  if (type === TINYG) {
    return TINYG_STATES[state?.sr?.machineState] || null;
  }
  // Marlin has no machine state at all, and anything unrecognised must not
  // inherit somebody else's vocabulary.
  return null;
};

/** One axis of a position, or nothing. `which` is `wpos` or `mpos`. */
const positionOf = (type, state, axis, which = 'wpos') => {
  const from = type === TINYG ? state?.sr?.[which] : state?.status?.[which];
  const value = from?.[axis];
  return value === undefined || value === null ? null : Number(value);
};

const positions = (type, state, which) => ({
  x: positionOf(type, state, 'x', which),
  y: positionOf(type, state, 'y', which),
  z: positionOf(type, state, 'z', which),
});

/**
 * The modal state, which is where the active work coordinate system lives.
 *
 * Needed by anything that writes an offset: `G10 L20 P<n>` has to name the
 * coordinate system the machine is currently working in, and guessing it is a
 * silent way to send a tool somewhere it should not be.
 */
const modalOf = (type, state) => (
  type === TINYG ? state?.sr?.modal : state?.parserstate?.modal
) || {};

/**
 * The three override percentages, in the order the controller sends them.
 *
 * Grbl's `Ov:` is feed, rapid, spindle — not the order a panel draws them in
 * and not the order anyone would guess. Unpacking it in one named place is
 * what stops a view from pairing the spindle figure with the rapid control.
 */
const overridesOf = (type, state) => {
  const ov = (type === TINYG ? state?.sr?.ov : state?.status?.ov) || [];
  const [feed = 100, rapid = 100, spindle = 100] = ov;
  return { feed, rapid, spindle };
};

/** What is in the spindle and how fast it is turning. */
const toolOf = (type, state) => {
  const parser = type === TINYG ? state?.sr : state?.parserstate;
  return {
    tool: parser?.tool ?? null,
    spindle: state?.status?.spindle ?? null,
    feedrate: state?.status?.feedrate ?? null,
  };
};

/**
 * The sender's own report, as a job a screen can draw.
 *
 * Null unless `total > 0`, which is the test for "there is a job" rather than
 * the presence of the object: the sender reports its status continuously and
 * reports zeroes when nothing is loaded, and a panel that read that as a job
 * would offer Start for a file that does not exist.
 *
 * **The interesting part is what happens when a program ends.** The server
 * decides that explicitly — `Sender.next()` sets `finishTime` and emits `end`
 * the moment `received` reaches `total` — and then `workflow.stop()` rewinds
 * the sender, which puts `sent` and `received` back to nought so the program
 * can be run again. Both halves are right on their own, and together they mean
 * the counters a second after a finished run are indistinguishable from the
 * counters of a program that was loaded and never started.
 *
 * Measured on the machine, 2026-09-24: at t+3.6s `running, 31/31, 100%`; at
 * t+4.0s `idle, 0/31, 0%`. On screen that was a file name, an empty bar and a
 * live Start — a job that had just run to the end, reading as one that had not
 * begun.
 *
 * So the decision is read from `finishTime` rather than inferred from the
 * counters, and it survives the rewind because the rewind does not touch it.
 * It is also the *right* decision rather than a near one: `finishTime` is set
 * only on the path where the last line came back, so a program stopped half
 * way leaves it at nought, and starting again clears it.
 */
const readJob = (job) => {
  if (!job || !(job.total > 0)) {
    return null;
  }

  const finished = Boolean(job.finishTime);
  // What was actually got through. After the rewind the counter is nought and
  // the truth is "all of it"; a bar that dropped to empty at the finish line
  // would be the panel reporting the counter rather than the run.
  const received = finished ? job.total : (job.received || 0);

  return {
    name: job.name || '',
    total: job.total,
    sent: job.sent || 0,
    received,
    remaining: job.remainingTime || 0,
    percent: Math.min(100, Math.round((received / job.total) * 100)),
    /** Whether this program ran to its last line. Not "is it stopped". */
    finished,
  };
};

/**
 * Everything on screen, derived in one place.
 *
 * The views take what this returns and arrange it. Nothing downstream reaches
 * into a controller payload, so the four firmwares' disagreements are settled
 * here and only here.
 */
/**
 * Whether a program under way leaves nothing to this panel but stopping it.
 *
 * The server's rule (`program-gate.js`), read here so a key is dark before it
 * is pressed. Running, the job owns the machine. Paused with the firmware
 * standing still is a tool change, and the operator may jog, touch off and
 * zero; paused in `Hold` — a feed hold, an `M0` — is as good as running,
 * since Grbl refuses a jog there itself.
 */
export const programHolds = (workflow, word) => (
  workflow === 'running' || (workflow === 'paused' && word !== 'Idle')
);

/**
 * Why this panel may not move the machine, or null when it may.
 *
 * **One reading for two refusals, because they grey out the same keys.** The
 * server decides both — a program owns the planner while it runs, and the
 * device that last moved the machine holds it for a moment afterwards — and
 * this is the panel reading that decision rather than predicting it.
 *
 * It is deliberately not folded into `canSendGcode`. Zeroing writes an offset
 * and moves nothing, so the server does not arbitrate it, and a panel that
 * greyed the zero buttons out while somebody else jogged would be inventing a
 * restriction the machine does not have — the same mistake as reading `Door`
 * as an alarm. A program is another matter — see `programHolds`.
 */
export const movementHeld = (workflow, motion, device, word) => {
  if (programHolds(workflow, word)) {
    return 'program-running';
  }
  if (motion && motion !== device) {
    return 'held-elsewhere';
  }
  return null;
};

export const readMachine = ({
  connection, error, port, type, baudrate, state, settings, attached, job, gcode, timing, linkMs, refusal,
  envelope, motion, workflow, device,
}) => {
  // "Connected" means *able to send*, not "a port is open somewhere". The
  // socket has to attach to the port before `Controller.command()` will do
  // anything at all — it begins `if (!this.port) return` and fails silently —
  // so a panel that enabled its controls on the snapshot alone would have a
  // window in which every jog key looked pressable and did nothing.
  const connected = Boolean(port) && connection === 'open' && Boolean(attached);
  const active = connected ? activeStateOf(type, state) : null;
  const held = movementHeld(workflow, motion, device, active?.word);

  // Two kinds of word, and only one of them is language. The four states the
  // panel invents for itself are keys, translated where the chip is drawn;
  // `Idle`, `Run` and `Alarm` are the firmware's own vocabulary, reported over
  // the wire and shown exactly as it says them. This file stays free of
  // i18next either way — it is the tier that runs with no browser.
  /*
   * One word, and it names its own layer.
   *
   * There are three things between an operator and a machine -- the link to
   * the server, the port the server holds, and the machine on the end of it
   * -- and this chip used to answer for all three in vocabulary that
   * overlapped. `Laczenie` meant both "the socket is coming up" and "the port
   * is open and we are attaching", which are different failures with
   * different fixes. `Rozlaczony` read as "the panel is disconnected" and
   * meant "the server is fine, no port is open". `Polaczony` was not about a
   * connection at all: it meant the machine had not reported yet. Mateusz
   * read the chip and asked which of the three it was about (2026-09-23); the
   * honest answer was "whichever got there first".
   *
   * So the three missing-things are named as a ladder -- no server, no port,
   * no reading -- and the two in-progress ones are told apart by what they
   * are waiting for. Nothing here says "connected": once there is a reading,
   * the firmware's own word is the reading, and that is what the chip shows.
   */
  let key = 'status.noPort';
  let word = null;
  let tone = 'inactive';
  if (connection === 'failed') {
    key = 'status.noServer';
    tone = 'stopped';
  } else if (connection === 'connecting') {
    key = 'status.connecting';
    tone = 'inactive';
  } else if (port && !attached) {
    key = 'status.attaching';
    tone = 'inactive';
  } else if (connected) {
    key = active ? null : 'status.noReading';
    word = active ? active.word : null;
    tone = active ? active.tone : 'inactive';
  }

  return {
    connected,
    /**
     * Whether the *server* is reachable, which is a different question from
     * whether a machine is.
     *
     * Everything else on the panel cares only about `connected`, because a
     * panel that cannot reach its machine is equally dead either way. The
     * connection screen is the one place the difference is the subject: with
     * no server there is no list of ports to show and nothing to press, and
     * saying "no ports found" there would blame the wrong thing.
     */
    linked: connection === 'open',
    error,
    port,
    type,
    /*
     * What the open port is running at.
     *
     * Carried through rather than derived, and null when nothing is open. The
     * connection screen shows it beside the controller now that both stay on
     * screen after connecting, and the honest answer is the rate the *server*
     * has the port at -- which is not always the rate this panel asked for.
     * Another client can have opened it first.
     */
    baudrate: connected ? (baudrate ?? null) : null,
    // What a jog costs on this installation, measured by the server. Passed
    // through rather than interpreted: turning it into a stopping distance
    // needs the feed rate, which belongs to whoever is driving. See
    // `machine/stopping`.
    timing,
    // How far away the server is, in one-way milliseconds. Part of how long
    // a jog takes to stop when the server is not this computer.
    linkMs,
    status: { word, key, tone, known: Boolean(active) },
    /**
     * Whether a G-code line written now would reach the firmware.
     *
     * Not the same question as `connected`, and the gap between them is where
     * a button lies: in alarm the socket is up, the port is open, every
     * reading is live, and the server throws the line away. See `ALARM`
     * above.
     *
     * Only the machine's own word is trusted for it. `tone` would be shorter
     * and would also catch `Door`, which the server does *not* gate — a hold
     * for an open guard resumes, and disabling zeroing through one would be
     * the panel inventing a restriction the machine does not have.
     */
    canSendGcode: connected && active?.word !== ALARM,
    /**
     * Whether a work offset may be written now.
     *
     * A line that reaches the firmware, and no program for it to land in the
     * middle of: a `G10 L20` between two lines of a job moves every cut still
     * to come, so the server refuses it (`program-running`). The lease is not
     * part of it — zeroing moves nothing.
     */
    canZero: connected && active?.word !== ALARM && held !== 'program-running',
    /**
     * Whether this panel may set the machine moving.
     *
     * `canSendGcode` and then some. A line that reaches the firmware is the
     * first condition and the one alarm decides; the second is whether
     * movement belongs to this device at all, which is the server's lease and
     * its running program. Both are read rather than guessed — see
     * `movementHeld`.
     */
    canMove: connected && active?.word !== ALARM && !held,
    /**
     * Why movement is not this panel's to ask for, or null when it is.
     *
     * `canMove` is what a control is greyed out by; this is what a screen with
     * room for a sentence says instead of leaving the operator to guess which
     * of the two it is. Never shown as a refusal — a refusal is for a press
     * that lost a race, and this is the state before the press.
     */
    held,
    overrides: overridesOf(type, state),
    tool: toolOf(type, state),
    position: positions(type, state, 'wpos'),
    // Machine coordinates matter in two places only — homing and "why is the
    // work zero where it is" — so they are a quiet second reading rather than
    // a tile of their own.
    machinePosition: positions(type, state, 'mpos'),
    modal: modalOf(type, state),
    // Whether this machine can be sent home. Not a preference — whether
    // limit switches exist and are turned on, which only the firmware
    // knows. See `homing.js`.
    //
    // Held like every other move, and *unlike* every other move it survives
    // an alarm: homing is what clears one. So it is composed from `canHome`
    // and the lease rather than from `canMove`.
    canHome: connected && canHome(type, settings) && !held,
    // Carried whole because more than one thing needs it: homing reads
    // `$22`, a held jog reads the axis travel so it cannot ask for more
    // than the machine has.
    settings: settings || {},
    /**
     * The loaded program as text, or nothing.
     *
     * Separate from `job` on purpose. `job` is the sender's progress through
     * a program and is reported continuously; this is the program itself and
     * arrives once. The toolpath screen wants the second and the status bar
     * wants the first, and a machine with a program loaded but not started has
     * one without the other.
     */
    gcode: gcode || null,
    /**
     * The last command the server refused, and why.
     *
     * Carried through untouched rather than turned into a sentence here: this
     * tier runs with no browser and no i18next, and the words live where the
     * notice is drawn. See `machine/refusal`.
     *
     * It is not gated on `connected`. A refusal is evidence about a press that
     * has already happened, and a panel that dropped it because the link went
     * down a moment later would be hiding the answer to the question the
     * operator is about to ask.
     */
    refusal: refusal || null,
    /**
     * The box the machine can reach, in machine coordinates, or null.
     *
     * Not derived here. It comes off `controller:envelope`, which the server
     * works out from `$130`-`$132` and `$23` — the same four registers it
     * bounds a jog with. The panel used to read them a second time, and a
     * second reading of the numbers somebody else enforces is a drawing that
     * can disagree with the machine.
     *
     * Gated on being connected for the same reason the readings are: an
     * outline left on screen for a machine that is no longer there is the
     * panel answering for a controller it cannot hear.
     */
    envelope: connected ? (envelope || null) : null,
    job: readJob(job),
  };
};

/** A position in millimetres, fixed to three decimals so digits do not move. */
export const formatPosition = (value) => (
  value === null || Number.isNaN(value) ? NO_READING : value.toFixed(3)
);
