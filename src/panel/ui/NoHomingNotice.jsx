import { useEffect, useState } from 'react';
import Button from './Button';
import Icon from './Icon';
import Notice from './Notice';
import { t } from '../i18n';

/*
 * Put away with its ✕ for as long as this tab or app is open, a reload
 * included (review note, 2026-09-28: *"dodaj krzyżyk, żeby wyłączyć"*). Not
 * for good: it is a warning about the machine, and it comes back when the
 * panel is opened again, or when the machine is homed and later is not.
 */
const HIDDEN_KEY = 'panel.noHomingHidden';

const readHidden = () => {
  try {
    return window.sessionStorage.getItem(HIDDEN_KEY) === '1';
  } catch (e) {
    return false;
  }
};

const keepHidden = (on) => {
  try {
    if (on) {
      window.sessionStorage.setItem(HIDDEN_KEY, '1');
    } else {
      window.sessionStorage.removeItem(HIDDEN_KEY);
    }
  } catch (e) {
    // Kept nowhere, it comes back on the next reload — which is the safe way round.
  }
};

/**
 * Not homed: the travel has no place, so the server fences nothing and Grbl
 * has no soft limits — said where the jog keys are (COM3, 2026-09-28: with
 * `$22=0` MDI drove 100 mm past the travel). `placed` is the server's
 * `envelope.placed`; nothing is shown until it is false.
 */
const NoHomingNotice = ({ placed }) => {
  const [hidden, setHidden] = useState(readHidden);
  useEffect(() => {
    if (placed) {
      keepHidden(false);
      setHidden(false);
    }
  }, [placed]);

  if (placed !== false || hidden) {
    return null;
  }
  return (
    <Notice
      action={(
        <Button
          compact
          className="size-9 shrink-0"
          aria-label={t('jog.noHomingHide')}
          title={t('jog.noHomingHide')}
          onClick={() => {
            keepHidden(true);
            setHidden(true);
          }}
        >
          <Icon name="cross" className="size-4" weight={2} />
        </Button>
      )}
    >
      {t('jog.noHoming')}
    </Notice>
  );
};

export default NoHomingNotice;
