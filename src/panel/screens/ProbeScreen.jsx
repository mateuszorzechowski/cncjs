import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import FadeScroller from '../ui/FadeScroller';
import HeightMapArea from '../ui/HeightMapArea';
import { HeightMapColumns } from '../ui/HeightMapSteps';
import useProbeJoin from '../ui/useProbeJoin';
import useHeightMapAsk from '../ui/useHeightMapAsk';
import ProbeJoin from '../ui/ProbeJoin';
import Notice from '../ui/Notice';
import ProbeMoveStep from '../ui/ProbeMoveStep';
import {
  AreaWayStep, ChooseStep, Foot, MeasureStep, MethodStep, PrepareStep, ResultStep, WireStep,
} from '../ui/ProbeSteps';
import StepTrack from '../ui/StepTrack';
import controller from '../machine/controller';
import { controlledStop } from '../machine/commands';
import {
  SURFACE, applyProbe, discardProbe, fetchProbe, methodOf, optionsFor, saveProbe, startProbe, stepBeside, stepsOf, wireOf, wizardStep,
} from '../machine/probe';
import { fieldText } from '../machine/probeFields';
import { useIsPhone } from '../ui/shell';
import { useUnits } from '../ui/units';
import { t } from '../i18n';

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
  const [local, setLocal] = useState('method');
  const [picked, setPicked] = useState(null);
  // The corner, the paper's surface: each method's one choice, kept per method.
  const [chosen, setChosen] = useState({});
  const [kept, setKept] = useState(null);
  const [texts, setTexts] = useState({});
  const [bad, setBad] = useState(null);
  const [touched, setTouched] = useState(false);
  // Where Z0 goes against where it is measured — per measurement, as the corner is.
  const [surface, setSurface] = useState(SURFACE);
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

  // The height map's area and grid (`useHeightMapAsk`): asked with its choice, shared with a device that joins.
  const heightMap = useHeightMapAsk({ machine, method, rule: units.rule });
  const {
    shared, mine, mode, setMode, takenBy, setTakenBy, declined, setDeclined, join, leave,
  } = useProbeJoin({
    machine, method, choice, surface, area: heightMap.area, onArea: heightMap.join, step, feeling, ask, onAsked, setPicked, setChosen, setSurface, setLocal, setJogging,
  });

  useEffect(() => {
    if (step === 'wire' && lit) {
      setTouched(true);
    }
  }, [step, lit]);

  const pick = (id) => {
    const uses = kept?.methods?.[id]?.fields ?? [];
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

  const measure = () => startProbe(method.id, optionsFor(method, choice, surface, heightMap.area), units.rule?.name);

  const again = () => {
    if (machine.status?.word === 'Alarm') {
      controller.command('unlock');
    }
    // Tried again here even if it was started on another device: its method and choice, then.
    const again = methodOf(probe?.method ?? picked);
    setMode('own');
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
    setMode(null);
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
        {takenBy ? <div className="order-4 w-full"><Notice>{t('probe.join.taken', { where: takenBy })}</Notice></div> : null}
      </div>
    </Card>
  );

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
            onBack={mode === 'joined' ? leave : () => go(-1)}
            leaving={mode === 'joined' ? shared?.owner?.name || t('probe.join.elsewhere') : null}
            onNext={() => go(1)}
            onMeasure={measure}
            texts={texts}
          />
        )}
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
    body = (
      <>
        {!mode && shared && !mine && !declined ? <ProbeJoin stage={shared} onJoin={join} onOwn={() => setDeclined(true)} /> : null}
        <MethodStep onPick={pick} />
      </>
    );
  } else if (step === 'choose' || step === 'areaWay') {
    // What the method chooses — or, the height map's own step, how its area is given.
    body = step === 'areaWay' ? <AreaWayStep map={heightMap} /> : <ChooseStep method={method} value={choice} onChange={(id) => setChosen((now) => ({ ...now, [method.id]: id }))} />;
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
        <Button tone="primary" onClick={() => go(1)} className="h-ctl">
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
  } else if (probe?.state === 'failed') {
    body = <ResultStep probe={probe} machine={machine} plate={fieldText(kept?.params?.plateThickness, 'plateThickness', units.rule)} />;
    foot = (
      <Foot>
        <Button tone="outline" onClick={() => finish(false)} className="h-ctl">{t('probe.result.close')}</Button>
        <Button tone="primary" onClick={again} className="h-ctl">{t('probe.result.again')}</Button>
      </Foot>
    );
  } else {
    body = <ResultStep probe={probe} machine={machine} plate={fieldText(kept?.params?.plateThickness, 'plateThickness', units.rule)} />;
    foot = (
      <Foot>
        <Button tone="outline" onClick={() => finish(false)} className="h-ctl">{t('probe.result.discard')}</Button>
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
