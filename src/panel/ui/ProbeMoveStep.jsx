import Button from './Button';
import Card from './Card';
import CornerPosition from './CornerPosition';
import FadeScroller from './FadeScroller';
import Notice from './Notice';
import PaperFeel from './PaperFeel';
import PaperJog from './PaperJog';
import PaperPosition from './PaperPosition';
import Sheet from './Sheet';
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
 * phone the paper's buttons stay in the card, and the pad is a sheet opened
 * from the foot's Jog (`jogging`) — or by the top bar's way here from
 * another screen — with the button that goes on.
 */
const ProbeMoveStep = ({
  machine, method, choice, feeling, lit, jogging, onJogging, onBack, onNext, onMeasure,
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
  const paper = feeling ? <PaperJog machine={machine} edge={choice} onHere={onMeasure} className="min-h-0 flex-1" /> : null;
  let pad = null;
  if (!phone) {
    pad = paper ? <Card className="min-h-0 w-jcard shrink-0" bodyClassName="flex-1">{paper}</Card> : <JogWidget machine={machine} className="min-h-0 w-jcard shrink-0" />;
  }
  const card = (
    <Card className={`min-w-0 @4xl/shell:flex-1 ${phone ? 'flex-1' : 'shrink-0'}`} bodyClassName="gap-3">
      {feeling ? <PaperFeel edge={choice} /> : <Moving choice={choice} />}
      {/* Where the plate goes, then where the tool goes: the plate laid here, not on the Setup (review note, 2026-09-30). */}
      {feeling ? <p className="m-0 text-base text-ink">{t('probe.paper.feelHow')}</p> : (
        <p className="m-0 text-base text-ink">{method.lay ? `${t(method.lay)} ${t(method.place)}` : t(method.place)}</p>
      )}
      {phone ? paper : null}
      {method.touches && lit ? <Notice>{t('probe.position.clipOn')}</Notice> : null}
      {!machine.canProbe ? <p className="m-0 text-note text-mut">{t('probe.position.notNow')}</p> : null}
      <Foot back={onBack}>
        {phone ? <Button tone="outline" onClick={() => onJogging(true)} className="h-ctl">{t('nav.jog')}</Button> : null}
        {onward}
      </Foot>
    </Card>
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-gap @4xl/shell:flex-row">
      {phone ? (
        // Taller than a phone with the paper's buttons in it: it scrolls, as the wizard's other steps do.
        <FadeScroller>
          <div className="flex min-h-full flex-col">{card}</div>
        </FadeScroller>
      ) : card}
      {pad}
      {/*
        * On a phone the pad is a sheet over the step (review note, 2026-09-30:
        * *"jog na telefonie w arkuszu"*), with the button that goes on.
        */}
      {phone && jogging ? (
        <Sheet title={t('nav.jog')} onClose={() => onJogging(false)} tall>
          <JogWidget machine={machine} className="min-h-0 flex-1" />
          {onward ? <div className="flex shrink-0 justify-end pt-3">{onward}</div> : null}
        </Sheet>
      ) : null}
    </div>
  );
};

export default ProbeMoveStep;
