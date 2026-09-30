import Button from './Button';
import Card from './Card';
import CornerPosition from './CornerPosition';
import Notice from './Notice';
import PaperFeel from './PaperFeel';
import PaperJog from './PaperJog';
import PaperPosition from './PaperPosition';
import Sheet from './Sheet';
import ZPlatePosition from './ZPlatePosition';
import { Foot } from './ProbeSteps';
import JogWidget from '../widgets/JogWidget';
import { surfaceOf } from '../machine/paperCycle';
import { useIsPhone } from './shell';
import { t } from '../i18n';

// Each method's move into place (review notes, 2026-09-29 and 30).
const MOVES = {
  z: ZPlatePosition,
  corner: ({ choice }) => <CornerPosition corner={choice} className="w-full max-w-md self-center" />,
  paper: ({ choice }) => <PaperPosition edge={choice} />,
};

/**
 * The steps the operator moves the machine at: into place, and for the
 * paper the feeling for it (`feeling`). The step's card, and the jog beside
 * it — the pad into place, the paper's one axis after (`PaperJog`) — or, on
 * a phone, in a sheet opened from the top bar (`jogging`), with the button
 * that goes on.
 */
const ProbeMoveStep = ({
  machine, method, choice, feeling, lit, jogging, onJogging, onBack, onNext, onMeasure,
}) => {
  const phone = useIsPhone();
  const Moving = MOVES[method.id];
  // Into place the plates measure; the paper goes on to be felt for.
  const onward = method.touches
? (
    <Button tone="go" disabled={!machine.canProbe || lit !== false} onClick={onMeasure} className="h-ctl">{t(method.start)}</Button>
  )
: (
    <Button tone="primary" onClick={onNext} className="h-ctl">{t('probe.next')}</Button>
  );
  const pad = (className, named = true) => (feeling
    ? <PaperJog machine={machine} edge={choice} onHere={onMeasure} named={named} className={className} />
    : <JogWidget machine={machine} className={className} />);
  const title = feeling ? t('probe.paper.jogTitle', { axis: surfaceOf(choice).axis.toUpperCase() }) : t('nav.jog');
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-gap @4xl/shell:flex-row">
        <Card className={`min-w-0 @4xl/shell:flex-1 ${phone ? 'flex-1' : 'shrink-0'}`} bodyClassName="gap-3">
          {feeling ? (
            <>
              <PaperFeel edge={choice} />
              <p className="m-0 text-base text-ink">{t('probe.paper.feelHow')}</p>
            </>
          ) : (
            <>
              <Moving choice={choice} />
              {/* Where the plate goes, then where the tool goes: the plate laid here, not on the Setup (review note, 2026-09-30). */}
              <p className="m-0 text-base text-ink">{method.lay ? `${t(method.lay)} ${t(method.place)}` : t(method.place)}</p>
            </>
          )}
          {method.touches && lit ? <Notice>{t('probe.position.clipOn')}</Notice> : null}
          {!machine.canProbe ? <p className="m-0 text-note text-mut">{t('probe.position.notNow')}</p> : null}
          <Foot back={onBack}>{feeling ? null : onward}</Foot>
        </Card>
        {!phone && feeling ? <Card className="min-h-0 w-jcard shrink-0" bodyClassName="flex-1">{pad('min-h-0 flex-1')}</Card> : null}
        {!phone && !feeling ? pad('min-h-0 w-jcard shrink-0') : null}
        {phone && jogging ? (
          <Sheet title={title} onClose={() => onJogging(false)} tall>
            {pad('min-h-0 flex-1', false)}
            {feeling ? null : <div className="flex shrink-0 justify-end pt-3">{onward}</div>}
          </Sheet>
        ) : null}
    </div>
  );
};

export default ProbeMoveStep;
