import { tokensOf } from '../editor/tokens';
import { dateFormat } from './dates';
import { t } from '../i18n';

/**
 * One line of the machine's console: when, what was sent or what came back.
 *
 * Sent lines lead with `›` and are coloured as the editor colours G-code —
 * the same tokenizer (`editor/tokens`), the same tokens — while answers are
 * muted, and an error or an alarm is red with its meaning beside it in the
 * panel's language; the code is the firmware's word and stays as it came.
 * A line the server refused never reached the cable: struck through, with
 * the refusal's own sentence in amber. Every line has its time, as the
 * journal's rows do (review notes, 2026-09-29).
 */
const FACES = {
  sent: 'text-ink',
  refused: 'text-mut line-through',
  ok: 'text-mut',
  reply: 'text-mut',
  error: 'text-red',
  alarm: 'text-red',
};

// The editor's colours, as the panel's classes (`editor/gcode`).
const WORDS = {
  keyword: 'font-semibold text-acc',
  variableName: 'text-ink',
  number: 'text-rapid',
  comment: 'italic text-mut',
  meta: 'text-mut',
};

const clock = dateFormat({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const Coloured = ({ text }) => tokensOf(text).map((piece, i) => (
  // Pieces of one fixed line, never reordered: the index is their identity.
  // eslint-disable-next-line react/no-array-index-key
  <span key={i} className={WORDS[piece.kind] ?? ''}>{piece.text}</span>
));

const ConsoleRow = ({ line }) => (
  <li className="flex min-w-0 items-baseline gap-3 py-0.5">
    <span className="shrink-0 font-num text-cap tabular-nums text-mut">{clock.format(new Date(line.at))}</span>
    <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3">
      <span className={`break-all font-num text-note ${FACES[line.kind]}`}>
        {line.direction === 'out' ? '› ' : null}
        {line.kind === 'sent' ? <Coloured text={line.text} /> : line.text}
      </span>
      {line.key ? <span className="text-note text-mut">{t(line.key)}</span> : null}
      {line.refusal ? <span className="text-note text-ambT">{t(line.refusal.key, line.refusal.values)}</span> : null}
    </span>
  </li>
);

export default ConsoleRow;
