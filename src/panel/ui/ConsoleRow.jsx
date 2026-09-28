import { t } from '../i18n';

/**
 * One line of the machine's console: what was sent, or what came back.
 *
 * Sent lines lead with `›` and in ink, answers are muted, and an error or an
 * alarm is red with its meaning beside it in the panel's language — the code
 * is the firmware's word and stays as it came, as everywhere on the panel.
 * A line the server refused never reached the cable: struck through, with
 * the refusal's own sentence in amber.
 */
const FACES = {
  sent: 'text-ink',
  refused: 'text-mut line-through',
  ok: 'text-mut',
  reply: 'text-mut',
  error: 'text-red',
  alarm: 'text-red',
};

const ConsoleRow = ({ line }) => (
  <li className="flex min-w-0 flex-wrap items-baseline gap-x-3 py-0.5">
    <span className={`break-all font-num text-note ${FACES[line.kind]}`}>
      {line.direction === 'out' ? `› ${line.text}` : line.text}
    </span>
    {line.key ? <span className="text-note text-mut">{t(line.key)}</span> : null}
    {line.refusal ? <span className="text-note text-ambT">{t(line.refusal.key, line.refusal.values)}</span> : null}
  </li>
);

export default ConsoleRow;
