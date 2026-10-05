import { useState } from 'react';
import Button from './Button';
import Card from './Card';
import ConfirmSheet from './ConfirmSheet';
import CornerPosition from './CornerPosition';
import FadeScroller from './FadeScroller';
import CentrePosition from './CentrePosition';
import Notice from './Notice';
import PaperFeel from './PaperFeel';
import PaperJog from './PaperJog';
import PaperPosition from './PaperPosition';
import Sheet from './Sheet';
import ZPlatePosition from './ZPlatePosition';
import { HeightMapPosition } from './HeightMapSteps';
import { Foot } from './ProbeSteps';
import JogWidget from '../widgets/JogWidget';
import { pairOf, partShape, shapeOf } from '../machine/probe';
import { sizeCycle } from '../machine/sizeCycle';
import { useIsPhone } from './shell';
import { t } from '../i18n';

// Each method's move into place (review notes, 2026-09-29 and 30).
const MOVES = {
  z: ZPlatePosition,
  corner: ({ choice }) => <CornerPosition corner={choice} className="w-full max-w-md self-center" />,
  paper: ({ choice }) => <PaperPosition edge={choice} />,
  'height-map': HeightMapPosition,
  measure: ({ choice, part }) => <CentrePosition cycle={sizeCycle('measure', partShape(choice, part))} />,
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
  machine, method, choice, feeling, lit, jogging, onJogging, onBack, leaving = null, onNext, onMeasure, texts = {}, part = 'a',
}) => {
  const phone = useIsPhone();
  // Joined, the way back is out of the wizard (`leaving`, whose it is) — on a phone asked first, in a sheet.
  const [asking, setAsking] = useState(false);
  const back = leaving && phone ? () => setAsking(true) : onBack;
  const Moving = MOVES[method.id];
  // Where the tool goes, as the choice says where it has its own — a groove's or a bar's.
  // A distance's: the end the tool goes to now, first or second (Mateusz, 2026-10-05).
  const pair = pairOf(choice);
  const place = pair ? shapeOf(pair[part]).place : method.choice?.list.find((one) => one.id === choice)?.place ?? method.place;
  let onward = null;
  if (method.touches) {
    onward = <Button tone="go" disabled={!machine.canProbe || lit !== false} onClick={onMeasure} className="h-ctl">{t(pair && part === 'b' ? 'probe.distance.startSecond' : method.start)}</Button>;
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
      {pair ? <p className="m-0 text-base font-semibold text-ink">{t(part === 'b' ? 'probe.distance.toSecond' : 'probe.distance.toFirst', { what: t(shapeOf(pair[part]).key) })}</p> : null}
      {feeling ? <PaperFeel edge={choice} /> : <Moving choice={choice} texts={texts} part={part} />}
      {/* Where the plate goes, then where the tool goes: the plate laid here, not on the Setup (review note, 2026-09-30). */}
      {feeling ? <p className="m-0 text-base text-ink">{t('probe.paper.feelHow')}</p> : (
        <p className="m-0 text-base text-ink">{method.lay ? `${t(method.lay)} ${t(place)}` : t(place)}</p>
      )}
      {phone ? paper : null}
      {method.touches && lit ? <Notice>{t('probe.position.clipOn')}</Notice> : null}
      {!machine.canProbe ? <p className="m-0 text-note text-mut">{t('probe.position.notNow')}</p> : null}
      <Foot back={back} backLabel={leaving ? t('probe.join.leave') : null}>
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
      {asking ? (
        <ConfirmSheet
          title={t('probe.join.leaveTitle')}
          note={t('probe.join.leaveNote', { where: leaving })}
          confirmLabel={t('probe.join.leave')}
          tone="primary"
          onConfirm={() => {
            setAsking(false);
            onBack();
          }}
          cancelLabel={t('probe.join.stay')}
          onClose={() => setAsking(false)}
        />
      ) : null}
      {phone && jogging ? (
        <Sheet title={t('nav.jog')} onClose={() => onJogging(false)} tall>
          <JogWidget machine={machine} className="min-h-0 flex-1" />
          {/* Going on closes the sheet (review note, 2026-10-01). */}
          {onward ? <div className="flex shrink-0 justify-end pt-3" onClickCapture={() => onJogging(false)}>{onward}</div> : null}
        </Sheet>
      ) : null}
    </div>
  );
};

export default ProbeMoveStep;
