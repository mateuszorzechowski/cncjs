import { useRef, useState } from 'react';
import Button from './Button';
import Sheet from './Sheet';
import LineChoices from '../editor/LineChoices';
import MdiLine from '../editor/MdiLine';
import { t } from '../i18n';

/**
 * Typing a line on a phone: a sheet with the line at its foot and, above it,
 * this device's last commands — the suggestions in their place while a word
 * is typed (Mateusz, 2026-09-29: *"na telefonie arkusz z inputem, nad nim
 * ostatnie komendy i podpowiedzi"* — *"tak"*).
 *
 * On a phone the keyboard takes half the screen, and a list opened over a
 * line at the foot of a card had nowhere to go. In a sheet the list has the
 * height the keyboard leaves. A last command tapped comes back into the line
 * to be sent or changed, not sent. Sending closes the sheet, so the answer
 * is read in the console under it; the next line is one tap away.
 */
const MdiSheet = ({ value, onChange, onSend, onWalk, help, history, canSend, onClose }) => {
  const [list, setList] = useState({ options: [], selected: null });
  const take = useRef(null);

  const send = () => {
    onSend();
    onClose();
  };

  // Newest first, each once: what is reached for is usually what was just sent.
  const recent = [...new Set([...history].reverse())].map((line) => ({ label: line }));

  let choices = null;
  if (list.options.length) {
    choices = <LineChoices options={list.options} selected={list.selected} onPick={(index) => take.current?.(index)} touch label={t('mdi.sheet.suggestions')} />;
  } else if (recent.length) {
    choices = (
      <section className="flex flex-col gap-2" aria-label={t('mdi.sheet.recent')}>
        <h3 className="m-0 text-cap font-semibold uppercase tracking-[0.1em] text-mut">{t('mdi.sheet.recent')}</h3>
        <LineChoices options={recent} onPick={(index) => onChange(recent[index].label)} touch label={t('mdi.sheet.recent')} />
      </section>
    );
  } else {
    choices = <p className="m-0 text-note text-mut">{t('mdi.sheet.empty')}</p>;
  }

  return (
    <Sheet
      title={t('mdi.title')}
      onClose={onClose}
      footer={(
        <div className="flex gap-2">
          <MdiLine
            value={value}
            onChange={onChange}
            onSend={send}
            onWalk={onWalk}
            disabled={!canSend}
            label={t('mdi.line')}
            hint={t('mdi.placeholder')}
            help={help}
            touch
            autoFocus
            onList={(next, taking) => {
              setList(next);
              take.current = taking;
            }}
          />
          <Button tone="primary" disabled={!canSend || !value.trim()} onClick={send} className="h-chiph">
            {t('mdi.send')}
          </Button>
        </div>
      )}
    >
      {choices}
    </Sheet>
  );
};

export default MdiSheet;
