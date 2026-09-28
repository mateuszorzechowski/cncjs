import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ConsoleRow from '../ui/ConsoleRow';
import FadeScroller from '../ui/FadeScroller';
import TextField from '../ui/TextField';
import { sendLine } from '../machine/commands';
import { recall, remember } from '../machine/mdi';
import { machineConsole } from '../machine/console';
import { useConsoleLines } from '../machine/useConsole';
import { t } from '../i18n';

/**
 * MDI: type a line, send it, read what the machine said.
 *
 * Built on the night of 2026-09-29 with its scope decided there and not
 * agreed first — `cncjs-notes/night-2026-09-29/decisions.md` lists what was
 * left out and why. One layout at every width: the console fills the card
 * and the line to type stands at its foot, where a phone's keyboard comes up
 * under it.
 *
 * **Nothing here asks for confirmation.** A line typed by hand is the
 * operator's own decision, which is what MDI is; the console is outside the
 * intent contract on purpose. What the panel does is refuse to look alive
 * when the server would refuse: dimmed during a program, and in alarm a note
 * that only Grbl's own `$` commands will go.
 *
 * Enter sends; up and down walk back through what this device sent, as a
 * shell does. The history is this page's and goes with a reload — the
 * journal is the record.
 */
const MdiScreen = ({ machine }) => {
  const { connected, held, alarmed } = machine;
  const lines = useConsoleLines();
  const [text, setText] = useState('');
  const [history, setHistory] = useState([]);
  const [at, setAt] = useState(0);
  const end = useRef(null);

  // The newest line in view, as a console keeps it. `nearest`, so a phone
  // scrolls the log and not the whole screen under the keyboard.
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'nearest' });
  }, [lines]);

  const running = held === 'program-running';
  const canSend = connected && !running;

  const send = (event) => {
    event.preventDefault();
    const line = text.trim();
    if (!line || !canSend) {
      return;
    }
    sendLine(line);
    const next = remember(history, line);
    setHistory(next);
    setAt(next.length);
    setText('');
  };

  const walk = (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }
    event.preventDefault();
    const index = recall(history, at, event.key === 'ArrowUp' ? -1 : 1);
    setAt(index);
    setText(history[index] ?? '');
  };

  let note = null;
  if (!connected) {
    note = t('mdi.offline');
  } else if (running) {
    note = t('mdi.running');
  } else if (alarmed) {
    note = t('mdi.alarm');
  }

  return (
    <Card
      label={t('mdi.title')}
      aside={lines.length ? (
        <Button tone="outline" onClick={machineConsole.clear} className="h-chiph">{t('mdi.clear')}</Button>
      ) : null}
      className="min-h-0 flex-1"
      bodyClassName="gap-3"
    >
      <FadeScroller className="min-h-0 flex-1">
        {lines.length ? (
          <ol className="m-0 list-none p-0" aria-label={t('mdi.log')}>
            {lines.map((line) => <ConsoleRow key={line.id} line={line} />)}
            <li ref={end} aria-hidden="true" />
          </ol>
        ) : <p className="m-0 text-note text-mut">{t('mdi.empty')}</p>}
      </FadeScroller>

      {note ? <p className="m-0 shrink-0 text-note text-mut">{note}</p> : null}

      <form className="flex shrink-0 gap-2" onSubmit={send}>
        <TextField
          code
          label={t('mdi.line')}
          placeholder={t('mdi.placeholder')}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={walk}
          disabled={!canSend}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="send"
          className="flex-1"
        />
        <Button tone="primary" type="submit" disabled={!canSend || !text.trim()} className="h-chiph">
          {t('mdi.send')}
        </Button>
      </form>
    </Card>
  );
};

export default MdiScreen;
