import Button from '../ui/Button';
import Card from '../ui/Card';
import controller from '../machine/controller';
import { CONTROLS, controlsFor, sendControl } from '../machine/control';
import { t } from '../i18n';

const LABELS = {
  unlock: () => t('control.unlock'),
  hold: () => t('control.hold'),
  resume: () => t('control.resume'),
  reset: () => t('control.reset'),
};

/**
 * Unlock, hold, resume, reset — the firmware's own four, in one card.
 *
 * One row where the card is wide enough, two by two where it is not — a
 * phone. Never a row that wraps on its own, which puts Reset under a finger
 * that was reaching for something else. Which ones are live is the
 * firmware's word and nothing else; see `machine/control`.
 */
const ControlWidget = ({ machine, className = '' }) => {
  const live = controlsFor(machine);

  return (
    <Card label={t('control.title')} className={`@container ${className}`} bodyClassName="grid grid-cols-2 gap-3 @lg:grid-cols-4">
      {CONTROLS.map((id) => (
        <Button
          key={id}
          compact
          disabled={!live[id]}
          onClick={() => sendControl(controller, id, machine.workflow)}
          className="h-ctl"
        >
          {LABELS[id]()}
        </Button>
      ))}
    </Card>
  );
};

export default ControlWidget;
