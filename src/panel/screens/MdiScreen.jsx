import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ConsoleRow from '../ui/ConsoleRow';
import FadeScroller from '../ui/FadeScroller';
import MdiHelp from '../ui/MdiHelp';
import { useHeaderHelp } from '../ui/headerSlot';
import { useIsWide } from '../ui/shell';
import MdiLine from '../editor/MdiLine';
import { suggestions } from '../editor/assist';
import { fetchWords } from '../editor/words';
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
 * shell does. The line is coloured and suggested as in the editor
 * (`MdiLine`). The history is this page's and goes with a reload — the
 * journal is the record.
 */
const MdiScreen = ({ machine }) => {
  const { connected, held, alarmed } = machine;
  // No pointer below a PC's width: the suggestions at a finger's size.
  const wide = useIsWide();
  const lines = useConsoleLines();
  const [text, setText] = useState('');
  const [history, setHistory] = useState([]);
  const [at, setAt] = useState(0);
  const end = useRef(null);
  const [helping, setHelping] = useState(false);
  useHeaderHelp(t('mdi.help.open'), () => setHelping(true));

  // The editor's suggestions, once the server's words are in; the machine
  // read when one is asked for, as the editor reads it.
  const [words, setWords] = useState(null);
  useEffect(() => {
    let live = true;
    fetchWords().then((got) => live && setWords(got)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const settings = useRef(machine.settings);
  settings.current = machine.settings;
  const help = useMemo(
    () => (words ? suggestions(words, () => settings.current, { blocks: false }) : null),
    [words]
  );

  // The newest line in view, as a console keeps it. `nearest`, so a phone
  // scrolls the log and not the whole screen under the keyboard.
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'nearest' });
  }, [lines]);

  const running = held === 'program-running';
  const canSend = connected && !running;

  const send = () => {
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

  const walk = (step) => {
    const index = recall(history, at, step);
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

      <div className="flex shrink-0 gap-2">
        <MdiLine
          value={text}
          onChange={setText}
          onSend={send}
          onWalk={walk}
          disabled={!canSend}
          label={t('mdi.line')}
          hint={t('mdi.placeholder')}
          help={help}
          touch={!wide}
        />
        <Button tone="primary" disabled={!canSend || !text.trim()} onClick={send} className="h-chiph">
          {t('mdi.send')}
        </Button>
      </div>

      {helping ? <MdiHelp onClose={() => setHelping(false)} /> : null}
    </Card>
  );
};

export default MdiScreen;
