import { useState } from 'react';
import Button from './Button';
import ConfirmSheet from './ConfirmSheet';
import { writeSettings } from '../machine/commands';
import { t } from '../i18n';

/**
 * Putting `$13` back to millimetres — the one write a locked setting takes.
 *
 * A controller reporting in inches (`$13=1`) turns every position the
 * server reads as millimetres into a wrong one. Mateusz, 2026-09-26: the
 * panel tells when the controller is set otherwise, in red, asks for action
 * and offers the fix. The fix is an EEPROM write, so it asks first like any
 * other.
 */
const ReportUnitsFix = ({ disabled }) => {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Button tone="stop" className="h-ctl px-5" disabled={disabled} onClick={() => setAsking(true)}>
        {t('machine.reportFix.button')}
      </Button>
      {asking ? (
        <ConfirmSheet
          title={t('machine.reportFix.title')}
          note={t('machine.reportFix.note')}
          warning={t('machine.confirm.eeprom')}
          confirmLabel={t('machine.reportFix.confirm')}
          tone="primary"
          onConfirm={() => {
            setAsking(false);
            writeSettings([{ name: '$13', value: 0 }]);
          }}
          onClose={() => setAsking(false)}
        />
      ) : null}
    </>
  );
};

export default ReportUnitsFix;
