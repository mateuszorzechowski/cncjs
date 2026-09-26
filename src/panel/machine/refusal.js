/**
 * What to say when the server will not do what it was asked.
 *
 * **This is the second half of greying a button out, and it is the half that
 * was missing.** Every control that writes is dark before it is pressed —
 * `canSendGcode`, `canHome`, `canGoToWorkZero` — and that covers the ordinary
 * case completely. What it cannot cover is the race: a button that was live
 * when the thumb came down and is not by the time the command lands. Before
 * `command:refused` the panel had no way to know that had happened, and the
 * press simply vanished.
 *
 * So this is for the exception, not the rule. A panel that talked about every
 * refusal would be talking about things the operator can already see.
 *
 * The reason is a code and the sentence is here, because what a refusal reads
 * like is the panel's business and which refusal it is is the server's. Keys
 * are written out rather than assembled from the code: `t(`refusal.${reason}`)`
 * would be shorter and would be a key nothing can grep for — the resources
 * test looks for quoted dotted literals, so four real keys would read as four
 * nobody asks for and a misspelt one would reach an operator.
 */

const KEYS = {
  // The one state where every control looks alive and the server drops the
  // line before the cable. Measured at the machine, not reasoned about.
  alarm: 'refusal.alarm',
  // No parser state, so there is no coordinate system to name. Zeroing the
  // wrong one is silent and is found by a tool moving under power.
  'no-wcs': 'refusal.noWcs',
  // The machine has not reported `$130`-`$132`, so there is no box to plan a
  // move inside and no known top of the travel to retract to.
  'no-travel': 'refusal.noTravel',
  // A point outside that box. With `$20=1` the firmware refuses such a line
  // outright rather than clipping it, so this used to be a button that simply
  // did nothing.
  'out-of-envelope': 'refusal.outOfEnvelope',
  // Nothing left in that direction. Not the same as a step being shortened —
  // a shortened step still moves and is nobody's business.
  'no-room': 'refusal.noRoom',
  // The planner belongs to the job while one is running, and two sources of
  // motion in one planner is not something to sort out afterwards.
  'program-running': 'refusal.programRunning',
  // Somebody is holding a jog key. The other half of `program-running`, and
  // the one with an action in it: let go.
  jogging: 'refusal.jogging',
  // The machine is under way — another client's travel, most likely.
  'machine-moving': 'refusal.machineMoving',
  // Movement belongs to another device for a moment. The lease that lets two
  // pendants share one machine; the keys are dark for as long as it is held,
  // so this only ever arrives for a press that beat the news of it.
  'held-elsewhere': 'refusal.heldElsewhere',
  // The server ended a held jog because this panel stopped confirming it. The
  // only entry here that is not about a command somebody just sent — see
  // `sayJogWasCut` on the server.
  'not-confirmed': 'refusal.notConfirmed',
  // A panel newer than the server it is talking to. The only refusal here
  // that is about the installation rather than about the machine.
  'unknown-command': 'refusal.unknownCommand',
  // `$C`: one check at a time, from a firmware standing Idle, of a file that is there.
  checking: 'refusal.checking',
  'not-idle': 'refusal.notIdle',
  'not-found': 'refusal.notFound',
  // A line the start events or the server's units send before a program was
  // refused by Grbl, so the program was not started. Which line is in the journal.
  'start-failed': 'refusal.startFailed',
};

/**
 * The key and its values, or null when there is nothing to show.
 *
 * An unrecognised code still gets said. A server that grows a reason this
 * panel has not been taught about is exactly when silence is least
 * affordable, and the code itself is worth more to whoever is reading it than
 * a shrug — so it goes in the sentence, the way a port name does.
 */
/** The same words, for the journal, which reads refusals back later. */
export const REFUSAL_KEYS = KEYS;

export const refusalMessage = (refusal) => {
  if (!refusal || !refusal.reason) {
    return null;
  }

  const key = KEYS[refusal.reason];
  return key
    ? { key, values: { cmd: refusal.cmd } }
    : { key: 'refusal.other', values: { cmd: refusal.cmd, reason: refusal.reason } };
};

export default refusalMessage;
