import Button from './Button';
import Card from './Card';
import CornerPosition from './CornerPosition';
import Notice from './Notice';
import PaperFeel from './PaperFeel';
import PaperJog from './PaperJog';
import PaperPosition from './PaperPosition';
import ZPlatePosition from './ZPlatePosition';
import { Foot } from './ProbeSteps';
import JogWidget from '../widgets/JogWidget';
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
 * paper the feeling for it (`feeling`). The step's card, and beside it the
 * jog — the pad into place, the paper's one axis after (`PaperJog`). On a
 * phone the jog is in the sheet the top bar opens wherever the wizard is
 * (`ProbeJogSheet`), so the card stands alone.
 */
const ProbeMoveStep = ({
  machine, method, choice, feeling, lit, onBack, onNext, onMeasure,
}) => {
  const phone = useIsPhone();
  const Moving = MOVES[method.id];
  let onward = null;
  if (method.touches) {
    onward = <Button tone="go" disabled={!machine.canProbe || lit !== false} onClick={onMeasure} className="h-ctl">{t(method.start)}</Button>;
  } else if (!feeling) {
    // Into place, the paper goes on to be felt for.
    onward = <Button tone="primary" onClick={onNext} className="h-ctl">{t('probe.next')}</Button>;
  }
  let pad = null;
  if (!phone) {
    pad = feeling ? (
      <Card className="min-h-0 w-jcard shrink-0" bodyClassName="flex-1">
        <PaperJog machine={machine} edge={choice} onHere={onMeasure} className="min-h-0 flex-1" />
      </Card>
    ) : <JogWidget machine={machine} className="min-h-0 w-jcard shrink-0" />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-gap @4xl/shell:flex-row">
      <Card className={`min-w-0 @4xl/shell:flex-1 ${phone ? 'flex-1' : 'shrink-0'}`} bodyClassName="gap-3">
        {feeling ? <PaperFeel edge={choice} /> : <Moving choice={choice} />}
        {/* Where the plate goes, then where the tool goes: the plate laid here, not on the Setup (review note, 2026-09-30). */}
        {feeling ? <p className="m-0 text-base text-ink">{t('probe.paper.feelHow')}</p> : (
          <p className="m-0 text-base text-ink">{method.lay ? `${t(method.lay)} ${t(method.place)}` : t(method.place)}</p>
        )}
        {phone ? <p className="m-0 text-note text-mut">{t('probe.jog.where')}</p> : null}
        {method.touches && lit ? <Notice>{t('probe.position.clipOn')}</Notice> : null}
        {!machine.canProbe ? <p className="m-0 text-note text-mut">{t('probe.position.notNow')}</p> : null}
        <Foot back={onBack}>{onward}</Foot>
      </Card>
      {pad}
    </div>
  );
};

export default ProbeMoveStep;
