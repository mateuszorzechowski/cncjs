import { useEffect, useState } from 'react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import FadeScroller from '../../ui/FadeScroller';
import HeightMapArea from '../ui/HeightMapArea';
import { HeightMapColumns } from '../ui/HeightMapSteps';
import useProbeJoin from '../ui/useProbeJoin';
import useHeightMapAsk from '../ui/useHeightMapAsk';
import useProbeWizard from '../ui/useProbeWizard';
import { useBackSteps } from '../../ui/backStack';
import ProbeJoin from '../ui/ProbeJoin';
import ProbeMoveStep from '../ui/ProbeMoveStep';
import SurfaceWarning from '../ui/SurfaceWarning';
import {
  AfterFoot, ChoiceStep, Foot, MeasureStep, MethodStep, PrepareStep, ResultStep, WireStep,
} from '../ui/ProbeSteps';
import ProbeTrack from '../ui/ProbeTrack';
import controller from '../../machine/controller';
import { controlledStop } from '../../machine/commands';
import {
  SURFACE, applyProbe, choiceOf, discardProbe, fetchProbe, figuresOf, methodOf, methodOfRun, nextProbe, optionsFor, saveProbe, serverOf, startProbe, stepBeside, stepIdsOf, wireOf, wizardStep,
} from '../machine/probe';
import { fieldText } from '../machine/probeFields';
import { useIsPhone } from '../../ui/shell';
import { useUnits } from '../../ui/units';
import { t } from '../../i18n/index';

/**
 * Sonda: a wizard, one step after another, across the whole screen
 * (Mateusz, 2026-09-29) — which method, the plate and its figures, the wire,
 * the tool over the plate, the measurement, and the zero it found.
 *
 * The first four are this device's. The last two are the server's: it runs
 * the measurement (`services/probe`), and while it runs or waits for its zero
 * to be confirmed every device shows it. **Nothing is written until Zapisz**
 * — the zero goes into the system it was measured in, and into the journal.
 *
 * The figures are the server's, shown again every time and changed here
 * (*"pamiętaj parametry, przypominaj"*). The travel limit among them is the
 * fence: a probe that touches nothing goes that far and stops in an alarm.
 */
const ProbeScreen = ({ machine, ask = null, onAsked = () => {} }) => {
  const units = useUnits();
  const phone = useIsPhone();
  const { probe } = machine;
  const {
    local, setLocal, picked, setPicked, chosen, setChosen, texts, setTexts, bad, setBad, touched, setTouched, surface, setSurface,
  } = useProbeWizard();
  const [kept, setKept] = useState(null);
  // The jog's sheet open, on a phone.
  const [jogging, setJogging] = useState(false);

  useEffect(() => {
    fetchProbe().then(setKept).catch(() => setKept(null));
  }, []);

  // A measurement another device started is shown with its own method.
  const method = probe ? methodOfRun(probe.method, probe.options) : methodOf(picked);
  // With no method in hand — a page opened afresh — the wizard starts at the start.
  const step = wizardStep(method ? local : 'method', probe);
  const fields = kept?.methods?.[serverOf(method)]?.fields ?? [];
  const choice = chosen[method?.id] ?? method?.choice?.first;
  const go = (by) => setLocal(stepBeside(method, step, by, choice));
  // Each step on into history, back by the gesture; none while the server's measurement is on the screen.
  useBackSteps(probe ? 0 : Math.max(0, (method ? stepIdsOf(method, choice) : []).indexOf(step)), () => go(-1));
  const lit = typeof machine.inputs?.pins === 'string' ? machine.inputs.pins.includes('P') : null;
  // The paper is felt for by hand: its measuring is this device's, a step of jog buttons, until "here".
  const feeling = step === 'measure' && method && !method.touches && probe?.state !== 'running';

  // The height map's area and grid (`useHeightMapAsk`): asked with its choice, shared with a device that joins.
  const heightMap = useHeightMapAsk({ machine, method, rule: units.rule });
  const {
    shared, mine, mode, setMode, takenBy, setTakenBy, declined, setDeclined, join, leave,
  } = useProbeJoin({
    machine, method, choice, surface, area: heightMap.area, onArea: heightMap.join, step, feeling, ask, onAsked, setPicked, setChosen, setSurface, setLocal, setJogging,
  });

  // The wire seen lit — the plate touched to the tool, the stylus pushed — on its step or into place (a device that joined).
  useEffect(() => {
    if ((step === 'wire' || step === 'position') && lit) {
      setTouched(true);
    }
  }, [step, lit]);
  // Tested: seen lit, and clear again. A firmware that reports no pins cannot be tested, and is said so on the wire step.
  const tested = lit === null || (touched && lit === false);

  const pick = (id) => {
    const uses = kept?.methods?.[serverOf(methodOf(id))]?.fields ?? [];
    setMode('own');
    setTakenBy(null);
    setPicked(id);
    setTexts(Object.fromEntries(uses.map((name) => [name, fieldText(kept.params[name], name, units.rule)])));
    setBad(null);
    // The corner's own step first, where a method has one.
    setLocal(stepBeside(methodOf(id), 'method', 1));
  };

  const confirmFigures = () => {
    saveProbe(texts, units.rule)
      .then((next) => {
        setKept(next);
        setBad(null);
        setTouched(false);
        setTakenBy(null);
        go(1);
      })
      .catch((error) => setBad(error.name || fields[0]));
  };

  // A distance's first end measured, the second goes on from it (`between`).
  const between = probe?.state === 'between';
  // Back from over a distance's second end: the first measured again, from its own place (`again`, below).
  const backFromPlace = () => (between ? again() : go(-1));
  // With the figures the operator confirmed: refused if another device changed one since (audit K8).
  const measure = () => (between ? nextProbe() : startProbe(serverOf(method), optionsFor(method, choice, surface, heightMap.area), units.rule?.name, figuresOf(kept, fields)));

  // In an alarm, unlocked only when asked (audit K10, I12): see `AfterFoot`.
  const alarm = machine.status?.word === 'Alarm';
  const unlock = () => controller.command('unlock');

  const again = () => {
    // Tried again here even if it was started on another device: its method and choice, then.
    const again = probe ? methodOfRun(probe.method, probe.options) : methodOf(picked);
    setMode('own');
    setPicked(again?.id ?? null);
    if (again?.choice && probe?.options?.[again.choice.option]) {
      setChosen((now) => ({ ...now, [again.id]: choiceOf(again, probe.options) }));
    }
    discardProbe();
    setLocal('position');
  };

  /*
   * Written or put away. `next`: written, and straight back into place for
   * the next one — the next tool of a program — with the same method,
   * figures and tested wire (audit 2026-10-05, M3: four tools were four
   * times five taps and four wire steps learnt to be tapped through).
   */
  const finish = (write, next = false) => {
    if (write) {
      applyProbe();
    } else {
      discardProbe();
    }
    // Where Z0 goes, back to where it is measured: a choice for one measurement, not for the next (audit K9).
    setSurface(SURFACE);
    if (next) {
      setLocal('position');
      return;
    }
    setMode(null);
    setPicked(null);
    setLocal('method');
  };

  const surfaceWarning = <SurfaceWarning method={method} choice={choice} surface={surface} />;

  const track = <ProbeTrack method={method} choice={choice} step={step} takenBy={takenBy} />;

  // The steps with the jog beside them: the height map's area, and into place (or the paper felt for).
  if (step === 'area' || step === 'position' || feeling) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-gap">
        {track}
        {step === 'area' ? <HeightMapArea machine={machine} map={heightMap} onBack={() => go(-1)} onNext={() => go(1)} /> : (
          <ProbeMoveStep
            machine={machine}
            method={method}
            choice={choice}
            feeling={feeling}
            lit={lit}
            jogging={jogging}
            onJogging={setJogging}
            onBack={mode === 'joined' ? leave : backFromPlace}
            leaving={mode === 'joined' ? shared?.owner?.name || t('probe.join.elsewhere') : null}
            onNext={() => go(1)}
            onMeasure={measure}
            texts={texts}
            part={probe?.part}
            tested={tested}
            warning={surfaceWarning}
          />
        )}
      </div>
    );
  }

  let body = null;
  let foot = null;
  // The plate the measurement ran with, as the server says — not this device's copy, which another may have changed (K8).
  const plate = fieldText(probe?.params?.plateThickness ?? kept?.params?.plateThickness, 'plateThickness', units.rule);
  /*
   * Wide, the figures are a card of their own beside the drawing's, standing
   * at the top and running out under a fade at the foot (review note,
   * 2026-09-30: *"prawa kolumna to osobna karta, cień zamknięty z góry,
   * otwarty z dołu"*). On a phone they are three lines that open a sheet,
   * and stay in the one card. On a PC the group chosen stands in a third,
   * as the controller's settings (review note, 2026-09-30).
   */
  const split = step === 'prepare' && !phone;
  if (step === 'method') {
    body = (
      <>
        {!mode && shared && !mine && !declined ? <ProbeJoin stage={shared} onJoin={join} onOwn={() => setDeclined(true)} /> : null}
        <MethodStep onPick={pick} />
      </>
    );
  } else if (step === 'choose' || step === 'areaWay' || step === 'lie') {
    body = <ChoiceStep step={step} method={method} value={choice} onChange={(id) => setChosen((now) => ({ ...now, [method.id]: id }))} map={heightMap} />;
    foot = (
      <Foot back={() => go(-1)}>
        <Button tone="primary" onClick={() => go(1)} className="h-ctl">{t('probe.next')}</Button>
      </Foot>
    );
  } else if (step === 'prepare') {
    body = (
      <PrepareStep
        method={method}
        chosen={choice}
        surface={surface}
        onSurface={setSurface}
        fields={fields}
        texts={texts}
        onText={(name, text) => setTexts((now) => ({ ...now, [name]: text }))}
        bad={bad}
        wcs={machine.modal?.wcs}
        split={split ? (left, right, third) => (
          <>
            <div className="flex min-h-0 min-w-0 flex-[7_7_0] flex-col">
              <FadeScroller>
                <div className="flex min-h-full flex-col">
                  <Card className="flex-1" bodyClassName="gap-3">
                    {left}
                    {foot}
                  </Card>
                </div>
              </FadeScroller>
            </div>
            <Card scrolls className={`min-h-0 min-w-0 ${third ? 'flex-[4_4_0]' : 'flex-[5_5_0]'}`}>{right}</Card>
            {third ? <Card scrolls className="min-h-0 min-w-0 flex-[4_4_0]">{third}</Card> : null}
          </>
        ) : null}
      />
    );
    foot = (
      <Foot back={() => go(-1)}>
        <Button tone="primary" onClick={confirmFigures} className="h-ctl">{t('probe.next')}</Button>
      </Foot>
    );
  } else if (step === 'wire') {
    const wire = wireOf(method, choice);
    body = <WireStep lit={lit} touched={touched} plate={wire.plate} how={wire.how} stuck={wire.stuck} />;
    foot = (
      <Foot back={() => go(-1)}>
        <Button tone="primary" disabled={!tested} onClick={() => go(1)} className="h-ctl">
          {t('probe.next')}
        </Button>
      </Foot>
    );
  } else if (step === 'measure') {
    body = <MeasureStep probe={probe} machine={machine} />;
    foot = (
      <Foot>
        <Button tone="stop" onClick={() => controlledStop(machine.type)} className="h-ctl">{t('probe.measure.abort')}</Button>
      </Foot>
    );
  } else if (probe?.state === 'failed' || probe?.result?.size) {
    body = <ResultStep probe={probe} machine={machine} plate={plate} />;
    foot = <AfterFoot probe={probe} connected={machine.connected} alarm={alarm} onClose={() => finish(false)} onAgain={again} onZero={() => finish(true)} onUnlock={unlock} />;
  } else {
    body = (
      <>
        {surfaceWarning}
        <ResultStep probe={probe} machine={machine} plate={plate} />
      </>
    );
    foot = (
      <Foot>
        <Button tone="outline" onClick={() => finish(false)} className="h-ctl">{t('probe.result.discard')}</Button>
        {probe?.result?.map ? null : <Button tone="outline" disabled={!machine.connected} onClick={() => finish(true, true)} className="h-ctl">{t('probe2.result.saveNext')}</Button>}
        <Button tone="primary" disabled={!machine.connected} onClick={() => finish(true)} className="h-ctl">{t(probe?.result?.map ? 'probe.map.save' : 'probe.result.save')}</Button>
      </Foot>
    );
  }

  /*
   * The height map measuring and measured, where there is the width (Mateusz,
   * 2026-10-03): the drawing a column of its own, the figures and the
   * buttons in the other.
   */
  const mapColumns = !phone && method?.id === 'height-map' && (step === 'measure' || (step === 'result' && probe?.state !== 'failed' && probe?.result?.map));
  body = mapColumns ? <HeightMapColumns measuring={step === 'measure'} probe={probe} machine={machine} foot={foot} /> : body;

  // The track only once there is a method to follow (review note, 2026-09-29):
  // before that the choice is the whole screen, under the screen's name.
  const choosing = step === 'method';
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-gap">
      {choosing ? null : track}
      {/*
        * The card scrolls whole, its top edge too, and fades into the page as
        * it goes under the steps — an open shadow, the Diagnostyka screen's —
        * rather than its contents sliding under its own standing edge
        * (review note, 2026-09-29: *"na górze cień otwarty"*).
        */}
      {split || mapColumns ? (
        <div className="flex min-h-0 flex-1 gap-gap">{body}</div>
      ) : (
        // A new step starts at its top, not where the last one was scrolled to — a method low in the list on a phone.
        <FadeScroller key={step}>
          <div className="flex min-h-full flex-col">
            <Card label={choosing ? t('nav.probe') : null} className="flex-1" bodyClassName="gap-3">
              {body}
              {foot}
            </Card>
          </div>
        </FadeScroller>
      )}
    </div>
  );
};

export default ProbeScreen;
