import Button from './Button';
import controller from '../machine/controller';
import { alarmAdvice } from '../machine/alarm';
import { home } from '../machine/homing';
import { t } from '../i18n';

const POSITION_TONE = { kept: 'text-grn', lost: 'text-red', unknown: 'text-amb' };

/**
 * The alarm the machine is in, and the one thing to do about it.
 *
 * In the state sheet under the chip rather than on a screen of its own — a
 * screen for one transient entry would say "no alarm" nearly all the time
 * (Mateusz, 2026-09-24). Grbl's number and its meaning, whether the position
 * survived, and the recommended way out as the main button. The other way is
 * still there, because a machine without switches cannot home, but when the
 * position is not known it says so beside it.
 */
const AlarmAdvice = ({ machine }) => {
  const advice = alarmAdvice(machine.alarm);
  const homeButton = (
    <Button
      key="home"
      tone={advice.action === 'home' ? 'primary' : 'outline'}
      disabled={!machine.canHome}
      onClick={() => home(controller)}
      className="h-ctl flex-1"
    >
      {t('alarm.home')}
    </Button>
  );
  const unlockButton = (
    <Button
      key="unlock"
      tone={advice.action === 'unlock' ? 'primary' : 'outline'}
      onClick={() => controller.command('unlock')}
      className="h-ctl flex-1"
    >
      {t('alarm.unlock')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-2 border-b border-line pb-3">
      <span className="font-num text-note font-semibold text-red">
        {advice.code === null ? t('alarm.lockTitle') : t('alarm.code', { code: advice.code })}
      </span>
      <span className="text-note text-ink">{t(advice.meaning)}</span>
      <span className={`text-note font-semibold ${POSITION_TONE[advice.position]}`}>{t(advice.positionKey)}</span>
      <div className="flex gap-3">
        {advice.action === 'home' ? [homeButton, unlockButton] : [unlockButton, homeButton]}
      </div>
      {advice.position === 'kept' ? null : (
        <span className="text-note text-mut">{t('alarm.unlockWarning')}</span>
      )}
    </div>
  );
};

export default AlarmAdvice;
