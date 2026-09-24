import Button from './Button';
import controller from '../machine/controller';
import { controlledStop } from '../machine/commands';
import { pressPause, programControls, startProgram } from '../machine/program';
import { t } from '../i18n';

/**
 * The job's two buttons, wherever the job is shown — the status bar at the
 * panel, the job card on a phone.
 *
 * Before a program: Start, and Pause dark beside it. Once it is under way
 * Start has nothing left to do, so the pair becomes Pause-or-Resume and a red
 * one beside it (Mateusz, 2026-09-24).
 *
 * **The red one is the operational stop, not the emergency one.** It holds,
 * waits for the machine to stand, and resets, so the position survives and
 * the job can be set up again without homing (`controlledStop`). The big STOP
 * above is the other kind: a reset at once, whatever it costs. It says Abort
 * in every state — one word for one action, rather than Stop while moving
 * and Abort while held (Mateusz, 2026-09-24).
 *
 * **Pause takes Start's place, not Abort.** The first slot is where the
 * finger that pressed Start still is, and a double press there has to land on
 * something that can be undone. Abort cannot.
 *
 * `className` goes on each button — the height its host gives them; `grow`
 * lets the first one take the row, as it does on a phone. The wrapper is
 * `contents`, so the two sit in the host's own row and gap.
 */
const JobButtons = ({ machine, className: size = '', grow = false }) => {
  const { canStart, canPause, paused } = programControls(machine);
  const first = `${size} ${grow ? 'min-w-0 flex-1' : ''}`;
  const pause = (
    <Button
      tone={paused ? 'primary' : 'hold'}
      disabled={!canPause}
      onClick={() => pressPause(controller, paused)}
      className={canPause ? first : size}
    >
      {paused ? t('job.resume') : t('job.pause')}
    </Button>
  );

  if (canPause) {
    return (
      <div className="contents">
        {pause}
        <Button tone="stop" onClick={() => controlledStop(machine.type)} className={size}>
          {t('job.abort')}
        </Button>
      </div>
    );
  }

  return (
    <div className="contents">
      <Button tone="go" disabled={!canStart} onClick={() => startProgram(controller)} className={`${first} tracking-[0.12em]`}>
        {t('job.start')}
      </Button>
      {pause}
    </div>
  );
};

export default JobButtons;
