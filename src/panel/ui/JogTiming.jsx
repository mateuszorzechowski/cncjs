import { NO_READING } from '../machine/readings';
import { installationTimings } from '../machine/timings';
import { t } from '../i18n';

/**
 * What a jog costs on *this* installation, broken into the parts it is made
 * of.
 *
 * The sheet this sits in already answers what a key will do — which step, at
 * which feed, and how far the machine carries on after the key comes up. This
 * answers the question underneath that one: **where that last figure comes
 * from, and which part of it belongs to what.**
 *
 * It was a sentence before, under the table, naming the queue and the reply
 * and sometimes the link. A sentence was enough while there were two numbers
 * and it stopped being enough at five — and the parts are the actionable half
 * anyway. A long queue is a busy server; a slow reply is the cable or the USB
 * adapter's latency timer; a slow link is a server across a workshop; a late
 * pendant is this browser. One total says none of that.
 *
 * **Nothing here is a constant.** The same cncjs runs on a mini PC bolted
 * beside a spindle with the pendant on a phone, and on one laptop doing
 * everything; these differ by an order of magnitude between the two, and an
 * operator who cannot see their own has no way to tell which of them is the
 * problem. Every figure is measured by whichever side is in a position to
 * measure it, and every one of them can be unread — which is a different
 * answer from nothing, and gets the same dash as every other unread value on
 * this panel.
 */
const Row = ({ label, value, note }) => (
  <div className="flex items-baseline gap-3 border-b border-line py-2 last:border-b-0">
    <span className="w-24 shrink-0 text-cap uppercase tracking-[0.08em] text-mut">{label}</span>
    <span className="w-16 shrink-0 font-num text-note text-ink">{value || NO_READING}</span>
    <span className="min-w-0 flex-1 text-note text-mut">{note}</span>
  </div>
);

/** A figure in milliseconds, or nothing at all when it has not been measured. */
const ms = (value) => (value === null ? null : t('timings.ms', { ms: value }));

const JogTiming = ({ timing, linkMs, beatMs }) => {
  const timings = installationTimings({ timing, linkMs, beatMs });

  return (
    <div className="flex flex-col">
      <span className="py-2 text-cap uppercase tracking-[0.08em] text-mut">
        {t('timings.title')}
      </span>

      {/*
        * The link first, because it is the one an operator can act on — move
        * the pendant, or put the server nearer the machine — and because it is
        * the only part that is *added* to everything below it.
        *
        * Named as this computer when it is one. Zero milliseconds is the
        * ordinary case, and the honest reading of it is "there is no link to
        * cross", not "the link is instant".
        *
        * And only once it has been timed. Before that the row is a dash and
        * says what it is going to be a measurement *of* — claiming the server
        * is this computer before anybody has asked would be the panel
        * answering for a measurement it does not have.
        */}
      <Row
        label={t('timings.link')}
        value={timings.linkMatters ? ms(timings.linkMs) : null}
        note={timings.linkKnown && !timings.linkMatters
          ? t('timings.linkHere')
          : t('timings.linkNote')}
      />

      {/* What the server keeps queued ahead of the machine, measured from its
        * own jogging rather than assumed. The first thing to suspect when a
        * release overshoots on a link that is not the problem. */}
      <Row label={t('timings.queue')} value={ms(timings.leadMs)} note={t('timings.queueNote')} />

      {/* The cable and the adapter. A USB serial adapter with the default
        * 16ms latency timer shows up here and nowhere else. */}
      <Row label={t('timings.reply')} value={ms(timings.ackMs)} note={t('timings.replyNote')} />

      {/*
        * And this panel, which is between the operator and the machine as much
        * as the network is.
        *
        * The worst gap between two of its own confirmations of a held jog. It
        * does not add to the release above — a jog that is let go of ends on
        * the release, not on a missed beat — but it decides how long the
        * machine keeps going if this page stops responding while a key is
        * down. Unread until it has held one, which is honest: a panel that has
        * never held a jog has never measured itself.
        *
        * Last, and nothing totals these four underneath them. What they add up
        * to is already in the table above, in millimetres at the feed rate
        * that is actually set — which is the figure somebody reads before
        * putting a hand near a cutter. The same label twice, the second time
        * in the weaker unit, is not a summary.
        */}
      <Row label={t('timings.panel')} value={ms(timings.beatMs)} note={t('timings.panelNote')} />
    </div>
  );
};

export default JogTiming;
