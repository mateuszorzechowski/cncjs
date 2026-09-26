import { useState } from 'react';
import AxisControls from '../ui/AxisControls';
import SettingSummary from '../ui/SettingSummary';
import Card from '../ui/Card';
import FadeScroller from '../ui/FadeScroller';
import JogPad from '../ui/JogPad';
import JogPadTall from '../ui/JogPadTall';
import SegmentedChoice from '../ui/SegmentedChoice';
import Sheet from '../ui/Sheet';
import Stepper from '../ui/Stepper';
import controller from '../machine/controller';
import { canGoToWorkZero, goToWorkZero } from '../machine/goto';
import { home } from '../machine/homing';
import { useIsPhone } from '../ui/shell';
import { jog, jogStart, jogStop } from '../machine/jog';
import { inMm } from '../machine/units';
import { useUnits } from '../ui/units';
import ShortcutHelp from '../ui/ShortcutHelp';
import { useHeaderHelp } from '../ui/headerSlot';
import useHoldToJog from '../ui/useHoldToJog';
import useJogKeys from '../ui/useJogKeys';
import useJogStream from '../ui/useJogStream';
import { t } from '../i18n';

/**
 * Moving the machine by hand.
 *
 * Two arrangements of the same controls, and the difference is not spacing —
 * it is what a phone is for. At the panel there is room for the keys and both
 * axis groups at once, so nothing is hidden and nothing is folded. On a phone
 * the keys are the screen: Z moves from beside the XY cross to underneath it,
 * which buys every key a third more width, and the step and feed rate fold
 * into a line each because they are set once and then left alone for a long
 * stretch of work.
 *
 * Both are rendered and one is hidden by a container query rather than one
 * being chosen in JavaScript. Two reasons. A media query would measure the
 * window, which is the wrong number inside a scaled preview frame; and the
 * step and speed are held here, above both, so changing size never loses the
 * setting the way two separately mounted widgets would.
 *
 * Neither arrangement has a branch inside it. What they share is this widget:
 * the state, the machine, and what a key press means.
 */
const JogWidget = ({ machine, className = '' }) => {
  const phone = useIsPhone();
  const { connected, type } = machine;
  const units = useUnits();
  const offer = units.rule?.jog;

  /*
   * The step and the speed, in the server's units — a step of `0.01` means
   * a hundredth of whatever the panel is showing, and that is what goes to
   * the server with the units named (`machine/jog`).
   *
   * Held with the units they were chosen in, and back to the rule's own
   * starting point when the units change: `10` chosen in millimetres is not
   * a thing to carry into inches as `10`, and converting it would land on a
   * step the rule does not offer.
   */
  const [chosen, setChosen] = useState(null);
  const current = chosen && chosen.units === units.rule?.name
    ? chosen
    : {
      units: units.rule?.name,
      xyStep: offer?.xy.step ?? null,
      zStep: offer?.z.step ?? null,
      xySpeed: offer?.xy.rate ?? null,
      zSpeed: offer?.z.rate ?? null,
    };
  const { xyStep, zStep, xySpeed, zSpeed } = current;
  const choose = (field) => (value) => setChosen({ ...current, [field]: value });
  const setXyStep = choose('xyStep');
  const setZStep = choose('zStep');
  const setXySpeed = choose('xySpeed');
  const setZSpeed = choose('zSpeed');
  // Which axis group is being set, on a phone. Nothing on the panel, where
  // both are open on the screen already.
  const [editing, setEditing] = useState(null);
  const [helping, setHelping] = useState(false);
  /*
   * **In the top bar, right after the state chip** — the help design's
   * variant 1a (2026-09-26). It was a KEYBOARD SHORTCUTS button at the foot
   * of this card, then a `?` beside the chip on a phone only; now the same
   * `?` in the same place on every screen that has help and at every width,
   * away from STOP, and the card keeps its height for the keys.
   */
  useHeaderHelp(t('shortcuts.title'), () => setHelping(true));

  /*
   * A direction is Z or it is not. The corners of the cross move X and Y
   * together, so "which axis is this" has no answer — but "is this the Z
   * decision or the table decision" does, and that is the only thing the step
   * and the feed rate are chosen by.
   */
  const isZ = (dir) => 'z' in dir;
  const rateFor = (dir) => (isZ(dir) ? zSpeed : xySpeed);

  /*
   * A tap is one step, a hold keeps going. Both are the same intent at two
   * scales — dial onto an edge, or cross the bed — and an operator should
   * not have to pick a different button before knowing how far they want to
   * go.
   */
  const stepFor = (dir, coarse) => {
    const steps = isZ(dir) ? offer.zSteps : offer.xySteps;
    // Shift is the coarse step: the largest the axis offers, which is what
    // "get across the work" means without asking anyone to change a setting
    // they will have to change back.
    return coarse ? steps[steps.length - 1] : (isZ(dir) ? zStep : xyStep);
  };

  /*
   * The same step on every axis the direction names, so a corner tap moves at
   * 45° — the direction its arrow is drawn in. It travels the step's diagonal
   * rather than the step, which is what "one step that way" means when "that
   * way" is a corner, and is what the old application's keypad has always
   * sent.
   */
  const stepJog = (dir, coarse) => jog({
    type,
    dir,
    distance: stepFor(dir, coarse),
    feedrate: rateFor(dir),
    units: units.rule,
    envelope: machine.envelope,
    position: machine.machinePosition,
  });

  /*
   * **One stream, shared by the keys and the pad**, so a direction held with
   * the mouse and one held on the keyboard cannot end up as two jogs fighting
   * each other. The moving itself is the server's loop, driven by `ok` — see
   * `machine/jog.js` and `src/server/controllers/Grbl/jog.js`.
   */
  const stream = useJogStream({
    // The link goes with it: how long the panel may go without confirming the
    // hold is partly how long a confirmation takes to arrive. See
    // `machine/deadman`.
    start: (dir) => jogStart(type, dir, rateFor(dir), machine.linkMs, units.rule),
    stop: () => jogStop(type),
  });

  /*
   * Live only while the machine will actually take a move.
   *
   * In alarm both halves of this control are dead and neither used to look
   * it: a step goes through the feeder, which throws every line away there,
   * and a held jog is refused by Grbl itself. The keys stayed blue and the
   * machine stayed still. Same gate the zeroing screen and the travels have —
   * see `readings.canSendGcode`.
   *
   * And since the lease, one condition more: movement may belong to another
   * device or to a running program, in which case the server refuses it and
   * these keys have to say so before they are pressed rather than after.
   */
  const canMove = connected && machine.canMove && Boolean(offer);

  const holdToJog = useHoldToJog({
    step: (dir) => stepJog(dir),
    stream,
    enabled: canMove,
  });

  /*
   * The same two behaviours from the keyboard. Arrows are XY because that is
   * what they look like on a bed seen from above; Page Up and Page Down are Z
   * because they are the only keys that already mean up and down without also
   * meaning a direction on the table.
   */
  useJogKeys({
    step: stepJog,
    stream,
    enabled: canMove,
    onHelp: () => setHelping(true),
  });

  const keys = {
    onJog: holdToJog,
    onHome: () => home(controller),
    onGoZero: () => goToWorkZero(),
    /* The whole pad, and only for the reason the whole pad shares: there is
     * no machine. Whether *this* machine will take a move is `canJog`, and
     * homing is deliberately outside both — it is what clears an alarm. */
    disabled: !connected,
    canJog: machine.canMove,
    canHome: machine.canHome,
    canGoZero: canGoToWorkZero(machine.envelope),
  };

  // The two axis groups, one description each. Both arrangements show the same
  // two; only the shape they are drawn in differs.
  const xy = {
    title: t('axis.xy'),
    steps: offer?.xySteps ?? [],
    step: xyStep,
    onStep: setXyStep,
    speed: xySpeed,
    onSpeed: setXySpeed,
    fine: offer?.xy.fine,
    coarse: offer?.xy.coarse,
    min: offer?.xy.min,
    max: offer?.xy.max,
    disabled: !connected || !offer,
  };
  const z = {
    title: t('axis.z'),
    steps: offer?.zSteps ?? [],
    step: zStep,
    onStep: setZStep,
    speed: zSpeed,
    onSpeed: setZSpeed,
    fine: offer?.z.fine,
    coarse: offer?.z.coarse,
    min: offer?.z.min,
    max: offer?.z.max,
    disabled: !connected || !offer,
  };

  const open = editing === 'xy' ? xy : (editing === 'z' ? z : null);

  return (
    <Card className={`group relative min-h-0 overflow-hidden ${className}`} bodyClassName="gap-0">
      {/* At the panel: the keys at their drawn size, both groups open below
        * them, nothing folded away. */}
      {phone ? null : (
        <FadeScroller className="flex flex-col gap-gap">

        <div className="shrink-0">
          <JogPad {...keys} />
        </div>
        {/* XY and Z are the same decision asked twice, so they stay together:
          * split across a fold, the second one is easy to miss. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap">
            <AxisControls {...xy} />
            <AxisControls {...z} />
          </div>
        </FadeScroller>
      )}

      {/* On a phone: the keys take the height, the settings take a line each.
        * Tapping a line opens a sheet rather than unfolding in place, because
        * unfolding shrinks the pad and the keys are then somewhere else — and
        * they are hit by a thumb while the eyes are on the cutter. A wider gap
        * than the one between the keys, so the settings read as a separate
        * block rather than a fifth row of the pad. */}
      {phone ? (
        <div className="flex min-h-0 flex-1 flex-col gap-gap">
        <JogPadTall {...keys} />
        <SettingSummary
          title={xy.title}
          values={[
            { value: xyStep, unit: units.length },
            { value: xySpeed, unit: units.feed },
          ]}
          onOpen={() => setEditing('xy')}
          disabled={!connected}
        />
        <SettingSummary
          title={z.title}
          values={[
            { value: zStep, unit: units.length },
            { value: zSpeed, unit: units.feed },
          ]}
          onOpen={() => setEditing('z')}
          disabled={!connected}
        />
        </div>
      ) : null}

      {helping ? (
        <ShortcutHelp
          onClose={() => setHelping(false)}
          xyStep={xyStep}
          zStep={zStep}
          xyCoarse={offer?.xySteps.at(-1)}
          zCoarse={offer?.zSteps.at(-1)}
          xySpeedMm={inMm(xySpeed, units.rule)}
          zSpeedMm={inMm(zSpeed, units.rule)}
          timing={machine.timing}
          settings={machine.settings}
          linkMs={machine.linkMs}
          beatMs={machine.beatMs}
        />
      ) : null}

      {open ? (
        <Sheet title={t('jog.sheet', { axes: open.title })} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-2.5">
            <span className="text-label font-semibold uppercase leading-none text-ink">
              {t('jog.step')} <span className="normal-case text-mut">{units.length}</span>
            </span>
            <SegmentedChoice
              options={open.steps}
              value={open.step}
              onChange={open.onStep}
              label={t('jog.stepFor', { axes: open.title })}
              unit={units.length}
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-label font-semibold uppercase leading-none text-ink">
              {t('jog.speed')} <span className="normal-case text-mut">{units.feed}</span>
            </span>
            <Stepper
              value={open.speed}
              onChange={open.onSpeed}
              fine={open.fine}
              coarse={open.coarse}
              min={open.min}
              max={open.max}
              label={t('jog.speedFor', { axes: open.title })}
            />
          </div>
        </Sheet>
      ) : null}
    </Card>
  );
};

export default JogWidget;
