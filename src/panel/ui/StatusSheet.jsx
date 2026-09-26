import { useState } from 'react';
import Sheet from './Sheet';
import Button from './Button';
import AlarmAdvice from './AlarmAdvice';
import { NO_READING } from '../machine/readings';
import { useLastConnection } from '../machine/usePorts';
import { t } from '../i18n';

/**
 * What state the machine is in, what to do about it, and where the rest is
 * written down.
 *
 * **Opened from the state chip, which is the thing it is about.** That took
 * three goes. The warning began as a sentence on the top bar, became a
 * triangle badge beside the stop when the sentence would not fit a phone, and
 * then stopped being a badge at all: *"byc moze trzeba dac klikalny bagde ze
 * statusem i tam dac info o sugerowanej akcji i przyciks pmocy, etedy
 * pomaranczoyw badge z headera bny zniknal"* (2026-09-23).
 *
 * The reason is that they were two controls about one fact. The chip already
 * says what the machine is doing; an amber badge beside it said that the same
 * thing was a problem. One of them had to go, and the one that survives is
 * the one that is always there — including when nothing is wrong, which is
 * when somebody wants to know what `Hold` means.
 *
 * A sheet, of the three shapes offered — *"albo widok z bledami/informacjami
 * albo dropdown albo rozwijana od dolu karta"*. The panel already has one and
 * it is the shape that moves nothing underneath it, which on a screen whose
 * jog keys are hit by thumb without looking is the whole argument.
 *
 * It carries the way out as well as the diagnosis. A state with nothing to
 * press is a dead end, and the screen that fixes most of them is several taps
 * away through a menu the operator would have to think about first.
 */
const Triangle = ({ className = 'size-4' }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`${className} shrink-0`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 4.5 1.8 20h20.4z" />
    <path d="M12 10v4.5" />
    <path d="M12 17.4v.2" />
  </svg>
);

const TONES = {
  running: 'text-grn',
  ready: 'text-amb',
  stopped: 'text-red',
  inactive: 'text-mut',
};

/*
 * Named for what it is about, not for what is wrong with it.
 *
 * The chip opens this whenever anybody wants to know what the machine is
 * doing — including when the answer is `Idle` and nothing is the matter — and
 * a sheet headed *what is wrong* would be answering a question nobody asked.
 * Same key as the chip's own accessible name: one control, one word.
 */
/*
 * The three things between an operator and a machine, said separately.
 *
 * The chip has one word and can only name the first rung that is missing --
 * which is right for a strip read from across a workshop, and useless when
 * the question is *which* of the three broke. That question is what this
 * sheet is opened for, so it answers all three at once rather than making
 * somebody infer the other two from the one word.
 *
 * In order, because they depend on each other: no server means the port is
 * unknowable, and no port means the machine is. A row that cannot be answered
 * says so with a dash rather than guessing.
 */
const Layer = ({ label, value, tone, ok }) => (
  <div className="flex items-baseline gap-3">
    <span className="w-20 shrink-0 text-cap uppercase tracking-[0.08em] text-mut">{label}</span>
    <span className={`min-w-0 flex-1 truncate font-num text-note ${tone || 'text-ink'}`}>
      {value || NO_READING}
    </span>
    {/*
      * A tick for the two rungs that are simply there or not, and nothing for
      * the machine.
      *
      * A green tick beside `Alarm` was the first version and it read as "this
      * is fine" -- which is the one thing that row must never say. Reaching
      * the server and holding the port are yes-or-no; what the machine is
      * doing is not, and it carries its own colour instead.
      */}
    <span
      aria-hidden="true"
      className={`w-3 shrink-0 text-note ${ok ? 'text-grn' : 'text-mut'}`}
    >
      {ok === undefined ? '' : (ok ? '✓' : '✗')}
    </span>
  </div>
);

const StatusSheet = ({ machine, status, advice, error, onGo, onHelp, onClose }) => {
  const last = useLastConnection(machine.linked);
  // The key of what went wrong, or null.
  const [failed, setFailed] = useState(null);
  /*
   * Connecting from here, to what was connected last — *"tutaj dwa przyciski,
   * przekierowanie do ustawien i polacz (port powinien byc uzupelniony
   * wartosciami)"* (2026-09-25). Only with no port open and a server that
   * remembers one: with no server there is nothing to connect to, and with
   * no memory there is no choice to repeat, which is what Settings is for.
   */
  const again = advice?.key === 'advice.noPort' && machine.linked && last?.port ? last : null;
  const connect = () => {
    setFailed(null);
    machine.connect(again.port, { controllerType: again.controllerType, baudrate: again.baudrate })
      .then(onClose)
      .catch(() => setFailed('connect.openFailed'));
  };
  const disconnect = () => {
    setFailed(null);
    machine.disconnect(machine.port).catch(() => setFailed('connect.closeFailed'));
  };

  return (
  <Sheet title={t('topbar.state')} onHelp={onHelp} onClose={onClose}>
    <div className="flex items-start gap-3 border-b border-line py-3">
      {/* The triangle only when there is something to act on. A mark that is
        * always there is not a mark. */}
      <span className={`pt-0.5 ${TONES[status.tone] || TONES.inactive}`}>
        {advice ? <Triangle className="size-5" /> : null}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        {/* The machine's own word where it has one — `Idle`, `Alarm` — and
          * the panel's where it does not. Both arrive ready to show; see
          * `readings` and `useMachine`. */}
        <span className="text-lead font-semibold text-ink">{status.word}</span>
        <span className="text-note text-mut">
          {advice ? t(advice.key) : t('alerts.noDetail')}
        </span>
        {/*
          * The reason underneath, when the server gave one. `machine.error`
          * is the panel's own sentence rather than the browser's — see
          * `session.js`, where a failed `fetch` stopped being
          * `TypeError: Failed to fetch`.
          */}
        {error ? <span className="text-note text-red">{error}</span> : null}
      </div>
    </div>

    {/* Which alarm, what it cost, and the way out — before the layers,
      * because it is the reason the sheet was opened. */}
    {machine.alarmed ? <AlarmAdvice machine={machine} /> : null}

    <div className="flex flex-col gap-2 border-b border-line pb-3">
      <Layer
        label={t('layers.server')}
        value={window.location.host}
        ok={machine.linked}
      />
      {/*
        * The port open, or — with none — the one the server would open: the
        * last connection, with its cross, so the row says where the panel
        * connects before it does (*"tutaj chcę widzieć aktualnie wybrane
        * wartości nawet jak jest nie połączone"*, 2026-09-26). It was a dash,
        * and the same values stood again in a line under the rows.
        */}
      <Layer
        label={t('layers.port')}
        value={(machine.port
          ? [machine.port, machine.type, machine.baudrate]
          : [last?.port, last?.controllerType, last?.baudrate]).filter(Boolean).join('  ')}
        ok={machine.connected}
      />
      {/*
        * The machine's own word, which is the one row that can be present and
        * still not be good news: `Alarm` is a reading, and a reading is what
        * this row is asking for. Whether it will actually take a command is
        * the line above the button, not a tick here.
        */}
      <Layer
        label={t('layers.machine')}
        value={machine.connected ? status.word : ''}
        tone={TONES[status.tone]}
      />
      {/*
        * Disconnecting from here, beside what it disconnects — the settings'
        * own button and face (a red outline, not the STOP's fill).
        */}
      {machine.connected ? (
        <Button tone="end" onClick={disconnect} className="mt-1 h-ctl self-start px-6">
          {t('connect.disconnect')}
        </Button>
      ) : null}
    </div>

    {failed ? <p className="m-0 text-note text-red">{t(failed)}</p> : null}
    {advice && advice.go ? (
      <div className="flex gap-2">
        <Button tone={again ? 'outline' : 'primary'} onClick={onGo} className="h-ctl flex-1">
          {t('alerts.goSettings')}
        </Button>
        {again ? (
          <Button tone="primary" onClick={connect} className="h-ctl flex-1">
            {t('alerts.connectTo', { port: again.port })}
          </Button>
        ) : null}
      </div>
    ) : null}
  </Sheet>
  );
};

export default StatusSheet;
