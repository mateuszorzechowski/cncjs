import { useState } from 'react';
import Button from './Button';
import ConfirmSheet from './ConfirmSheet';
import SegmentedChoice from './SegmentedChoice';
import { blockerText, overrunText, progressText } from './fileWords';
import { checkFile } from '../machine/commands';
import { checkBlocker } from '../machine/files';
import { t } from '../i18n';

/**
 * "Verify on controller": a file through Grbl's check mode, `$C`, always
 * after a question (Mateusz, 2026-09-25).
 *
 * The question says what the check costs, every word measured on the bench:
 * nothing moves, Grbl resets as it leaves, the position stays, the modes go
 * back to G54 G90 G21 — the reset in amber, always, since it is a cost and
 * not a description. When the program leaves the table at the current zero
 * it says that too, in the same box — soft limits hold inside `$C`, so the check would end in
 * an alarm — and the button becomes "anyway". And it asks how far: the whole
 * file, or to the first error.
 *
 * The line under the name is only what is said nowhere else: why it is
 * greyed out, or how far a check has got. How the last one ended is in the
 * sheet under the state tile (Mateusz, 2026-09-25: *"to już jest w state"*).
 */
const SCOPES = { all: 'files.check.scope.all', first: 'files.check.scope.first' };
const SCOPE_OPTIONS = Object.keys(SCOPES);

const CheckButton = ({ file, machine, busy = false }) => {
  const [asking, setAsking] = useState(false);
  const [scope, setScope] = useState('all');
  const blocker = checkBlocker(machine);
  const running = machine.fileCheck?.name === file.name ? machine.fileCheck : null;
  const overrun = overrunText(machine.fits, file.name);

  let status = '';
  if (running) {
    status = progressText(running);
  } else if (blocker) {
    status = blockerText(blocker);
  }

  const confirm = () => {
    checkFile(file.name, { firstError: scope === 'first' });
    setAsking(false);
  };

  return (
    <>
      <Button className="h-auto flex-col gap-0.5 px-3 py-2" disabled={Boolean(blocker) || busy} onClick={() => setAsking(true)}>
        <span>{t('files.check.controller')}</span>
        <span className="max-w-full truncate text-note font-normal normal-case tracking-normal">{status}</span>
      </Button>

      {asking ? (
        <ConfirmSheet
          title={t('files.check.confirm.title')}
          note={t('files.check.confirm.note')}
          warning={(
            <>
              <span>{t('files.check.confirm.reset')}</span>
              {overrun ? <span>{overrun}</span> : null}
            </>
          )}
          confirmLabel={overrun ? t('files.check.confirm.anyway') : t('files.check.confirm.action')}
          tone="primary"
          onConfirm={confirm}
          onClose={() => setAsking(false)}
        >
          <SegmentedChoice
            joined
            label={t('files.check.scope.label')}
            options={SCOPE_OPTIONS}
            value={scope}
            onChange={setScope}
            format={(option) => t(SCOPES[option])}
          />
        </ConfirmSheet>
      ) : null}
    </>
  );
};

export default CheckButton;
