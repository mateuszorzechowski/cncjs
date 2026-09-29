import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Notice from '../ui/Notice';
import ProbePicture from '../ui/ProbePicture';
import ZPlatePosition from '../ui/ZPlatePosition';
import CornerChooser from '../ui/CornerChooser';
import CornerCycle from '../ui/CornerCycle';
import {
  Foot, MeasureStep, MethodStep, PrepareStep, ResultStep, WireStep,
} from '../ui/ProbeSteps';
import StepTrack from '../ui/StepTrack';
import JogWidget from '../widgets/JogWidget';
import controller from '../machine/controller';
import { controlledStop } from '../machine/commands';
import {
  applyProbe, discardProbe, fetchProbe, fieldText, methodOf, optionsFor, saveProbe, startProbe, stepBeside, stepsOf, wizardStep,
} from '../machine/probe';
import { useIsPhone } from '../ui/shell';
import { useUnits } from '../ui/units';
import { t } from '../i18n';

// The methods that show the move into place rather than a picture of it.
const MOVES = {
  z: ZPlatePosition,
  // The tool over the plate, where 1f starts.
  corner: ({ choice }) => <CornerCycle corner={choice} still={0} className="w-full max-w-md self-center" />,
};

// The methods whose one choice is a step of its own, and what it is picked on.
const CHOOSERS = { corner: CornerChooser };

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
const ProbeScreen = ({ machine }) => {
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

  useEffect(() => {
    if (step === 'wire' && lit) {
      setTouched(true);
    }
  }, [step, lit]);

  const pick = (id) => {
    const uses = kept?.methods?.[id]?.fields ?? [];
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
    <Card label={t('probe.title')} aside={method ? t(method.key) : null}>
      <StepTrack steps={stepsOf(method).map((s) => ({ ...s, name: t(s.key) }))} current={step} label={t('probe.steps')} />
    </Card>
  );

  if (step === 'position') {
    // The methods that show the move into place rather than a picture of it.
    const Moving = MOVES[method.id];
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-gap">
        {track}
        <div className="flex min-h-0 flex-1 flex-col gap-gap @4xl/shell:flex-row">
          <Card className="min-w-0 shrink-0 @4xl/shell:flex-1" bodyClassName="gap-3">
            {Moving ? (
              <>
                <Moving choice={choice} />
                <p className="m-0 text-base text-ink">{t(method.place)}</p>
              </>
            ) : (
              <div className="flex items-start gap-4">
                <ProbePicture method={method.id} choice={choice} label={t(method.key)} className="h-24 w-32" />
                <p className="m-0 text-base text-ink">{t(method.place)}</p>
              </div>
            )}
            {method.touches && lit ? <Notice>{t('probe.position.clipOn')}</Notice> : null}
            {!machine.canProbe ? <p className="m-0 text-note text-mut">{t('probe.position.notNow')}</p> : null}
            <Foot back={() => go(-1)}>
              <Button tone="go" disabled={!machine.canProbe || (method.touches && lit !== false)} onClick={measure} className="h-ctl">
                {t(method.start)}
              </Button>
            </Foot>
          </Card>
          <JogWidget machine={machine} className={phone ? 'min-h-0 flex-1' : 'min-h-0 w-jcard shrink-0'} />
        </div>
      </div>
    );
  }

  let body = null;
  let foot = null;
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
        onChoose={(id) => setChosen((now) => ({ ...now, [method.id]: id }))}
        fields={fields}
        texts={texts}
        onText={(name, text) => setTexts((now) => ({ ...now, [name]: text }))}
        bad={bad}
        wcs={machine.modal?.wcs}
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
        <Button tone="primary" disabled={!touched || lit !== false} onClick={() => go(1)} className="h-ctl">
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
      <Card scrolls label={choosing ? t('probe.title') : null} className="min-h-0 flex-1" bodyClassName="gap-3 pt-1">
        {body}
        {foot}
      </Card>
    </div>
  );
};

export default ProbeScreen;
