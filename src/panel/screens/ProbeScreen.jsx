import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import FadeScroller from '../ui/FadeScroller';
import CornerChooser from '../ui/CornerChooser';
import PaperChooser from '../ui/PaperChooser';
import useProbeStage from '../ui/useProbeStage';
import ProbeMoveStep from '../ui/ProbeMoveStep';
import {
  Foot, MeasureStep, MethodStep, PrepareStep, ResultStep, WireStep,
} from '../ui/ProbeSteps';
import StepTrack from '../ui/StepTrack';
import controller from '../machine/controller';
import { controlledStop } from '../machine/commands';
import {
  applyProbe, discardProbe, fetchProbe, methodOf, optionsFor, saveProbe, startProbe, stepBeside, stepsOf, wizardStep,
} from '../machine/probe';
import { fieldText } from '../machine/probeFields';
import { useIsPhone } from '../ui/shell';
import { useUnits } from '../ui/units';
import { t } from '../i18n';

// The methods whose one choice is a step of its own, and what it is picked on.
const CHOOSERS = { corner: CornerChooser, paper: PaperChooser };

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
const ProbeScreen = ({ machine, jogAsk = false, onJogAsked = () => {} }) => {
  const units = useUnits();
  const phone = useIsPhone();
  const { probe } = machine;
  const [local, setLocal] = useState('method');
  const [picked, setPicked] = useState(null);
  // The corner, the paper's surface: each method's one choice, kept per method.
  const [chosen, setChosen] = useState({});
  const [kept, setKept] = useState(null);
  const [texts, setTexts] = useState({});
  const [bad, setBad] = useState(null);
  const [touched, setTouched] = useState(false);
  // The jog's sheet open, on a phone.
  const [jogging, setJogging] = useState(false);

  useEffect(() => {
    fetchProbe().then(setKept).catch(() => setKept(null));
  }, []);

  // A measurement another device started is shown with its own method.
  const method = methodOf(probe?.method || picked);
  // With no method in hand — a page opened afresh — the wizard starts at the start.
  const step = wizardStep(method ? local : 'method', probe);
  const fields = kept?.methods?.[method?.id]?.fields ?? [];
  const choice = chosen[method?.id] ?? method?.choice?.first;
  const go = (by) => setLocal(stepBeside(method, step, by));
  const lit = typeof machine.inputs?.pins === 'string' ? machine.inputs.pins.includes('P') : null;
  // The paper is felt for by hand: its measuring is this device's, a step of jog buttons, until "here".
  const feeling = step === 'measure' && method && !method.touches && probe?.state !== 'running';

  const owner = useProbeStage({
    machine, method, choice, step, feeling, joined: Boolean(picked || probe),
    onJoin: (stage) => {
      const joined = methodOf(stage.method);
      setPicked(stage.method);
      if (joined?.choice) {
        setChosen((now) => ({ ...now, [stage.method]: stage.options?.[joined.choice.option] }));
      }
      setLocal(stage.step);
    },
    onFollow: setLocal,
  });
  // The top bar's way here asks for the jog open.
  useEffect(() => {
    if (jogAsk) {
      setJogging(true);
      onJogAsked();
    }
  }, [jogAsk]);

  useEffect(() => {
    if (step === 'wire' && lit) {
      setTouched(true);
    }
  }, [step, lit]);

  const pick = (id) => {
    const uses = kept?.methods?.[id]?.fields ?? [];
    owner.current = true;
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
        go(1);
      })
      .catch((error) => setBad(error.name || fields[0]));
  };

  const measure = () => startProbe(method.id, optionsFor(method, choice));

  const again = () => {
    if (machine.status?.word === 'Alarm') {
      controller.command('unlock');
    }
    // Tried again here even if it was started on another device: its method and choice, then.
    const again = methodOf(probe?.method ?? picked);
    setPicked(again?.id ?? null);
    if (again?.choice && probe?.options?.[again.choice.option]) {
      setChosen((now) => ({ ...now, [again.id]: probe.options[again.choice.option] }));
    }
    discardProbe();
    setLocal('position');
  };

  const finish = (write) => {
    if (write) {
      applyProbe();
    } else {
      discardProbe();
    }
    setPicked(null);
    setLocal('method');
  };

  const track = (
    // The card's caption, the steps and the method in one row when wide
    // (review note, 2026-09-30: *"dużo miejsca to zajmuje"*); on a phone the
    // steps under the other two.
    <Card>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h2 className="m-0 text-cap font-semibold uppercase tracking-[0.1em] text-mut">{t('probe.title')}</h2>
        <StepTrack
          steps={stepsOf(method).map((s) => ({ ...s, name: t(s.key) }))}
          current={step}
          label={t('probe.steps')}
          className="order-3 w-full @3xl/shell:order-none @3xl/shell:w-auto @3xl/shell:flex-1"
        />
        {method ? <span className="ml-auto font-num text-note text-mut @3xl/shell:ml-0">{t(method.key)}</span> : null}
      </div>
    </Card>
  );

  if (step === 'position' || feeling) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-gap">
        {track}
        <ProbeMoveStep
          machine={machine}
          method={method}
          choice={choice}
          feeling={feeling}
          lit={lit}
          jogging={jogging}
          onJogging={setJogging}
          onBack={() => go(-1)}
          onNext={() => go(1)}
          onMeasure={measure}
        />
      </div>
    );
  }

  let body = null;
  let foot = null;
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
    body = <MethodStep onPick={pick} />;
  } else if (step === 'choose') {
    const Chooser = CHOOSERS[method.id];
    body = <Chooser value={choice} onChange={(id) => setChosen((now) => ({ ...now, [method.id]: id }))} />;
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
    body = <WireStep lit={lit} touched={touched} plate={method.plate} />;
    foot = (
      <Foot back={() => go(-1)}>
        <Button tone="primary" onClick={() => go(1)} className="h-ctl">
          {t('probe.next')}
        </Button>
      </Foot>
    );
  } else if (step === 'measure') {
    body = <MeasureStep probe={probe} />;
    foot = (
      <Foot>
        <Button tone="stop" onClick={() => controlledStop(machine.type)} className="h-ctl">{t('probe.measure.abort')}</Button>
      </Foot>
    );
  } else if (probe?.state === 'failed') {
    body = <ResultStep probe={probe} plate={fieldText(kept?.params?.plateThickness, 'plateThickness', units.rule)} />;
    foot = (
      <Foot>
        <Button tone="outline" onClick={() => finish(false)} className="h-ctl">{t('probe.result.close')}</Button>
        <Button tone="primary" onClick={again} className="h-ctl">{t('probe.result.again')}</Button>
      </Foot>
    );
  } else {
    body = <ResultStep probe={probe} plate={fieldText(kept?.params?.plateThickness, 'plateThickness', units.rule)} />;
    foot = (
      <Foot>
        <Button tone="outline" onClick={() => finish(false)} className="h-ctl">{t('probe.result.discard')}</Button>
        <Button tone="primary" disabled={!machine.connected} onClick={() => finish(true)} className="h-ctl">{t('probe.result.save')}</Button>
      </Foot>
    );
  }

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
      {split ? (
        <div className="flex min-h-0 flex-1 gap-gap">{body}</div>
      ) : (
        <FadeScroller>
          <div className="flex min-h-full flex-col">
            <Card label={choosing ? t('probe.title') : null} className="flex-1" bodyClassName="gap-3">
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
