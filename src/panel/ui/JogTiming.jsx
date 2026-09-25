import { NO_READING } from '../machine/readings';
import { installationTimings, travelParts } from '../machine/timings';
import { t } from '../i18n';
import { useUnits } from './units';

/**
 * What a jog costs on *this* installation, in milliseconds and in the unit
 * that matters.
 *
 * The sheet this sits in already answers what a key will do — which step, at
 * which feed, and how far the machine carries on after the key comes up. This
 * answers the question underneath that one: **where that last figure comes
 * from, and which part of it belongs to what.**
 *
 * It was a sentence before, under the table, naming the queue and the reply
 * and sometimes the link. A sentence was enough while there were two numbers
 * and it stopped being enough at four — and the parts are the actionable half
 * anyway. A long queue is a busy server; a slow reply is the cable or the USB
 * adapter's latency timer; a slow link is a server across a workshop; a late
 * pendant is this browser. One total says none of that.
 *
 * **And each part carries its distance, because a millisecond is the cause
 * and a millimetre is the consequence.** The consequence is the thing standing
 * beside a spindle: nobody can act on 46ms and everybody can act on 1.2mm.
 * The parts and the braking add up to the figure in the table above, which is
 * the point — this explains that number rather than repeating it.
 *
 * **Nothing here is a constant.** The same cncjs runs on a mini PC bolted
 * beside a spindle with the pendant on a phone, and on one laptop doing
 * everything; these differ by an order of magnitude between the two, and an
 * operator who cannot see their own has no way to tell which of them is the
 * problem. Every figure is measured by whichever side is in a position to
 * measure it, and every one can be unread — which is a different answer from
 * nothing, and gets the same dash as every other unread value on this panel.
 */
const Row = ({ label, value, note }) => (
  <div className="flex items-baseline gap-3 border-b border-line py-2 last:border-b-0">
    <span className="w-24 shrink-0 text-cap uppercase tracking-[0.08em] text-mut">{label}</span>
    <span className="w-28 shrink-0 font-num text-note text-ink">{value || NO_READING}</span>
    <span className="min-w-0 flex-1 text-note text-mut">{note}</span>
  </div>
);

/** A figure in milliseconds, or nothing at all when it has not been measured. */
const ms = (value) => (value === null ? null : t('timings.ms', { ms: value }));

/**
 * The same stretch as a distance, or nothing when either half is unknown.
 * Worked out in millimetres, shown in the server's units.
 */
const length = (value, units) => (
  value === null || value === undefined
    ? null
    : t('units.quantity', { value: units.figure(value, 'size'), unit: units.length })
);

/** Both, when both are known, and whichever one is when only one is. */
const both = (msValue, mmValue, units) => [ms(msValue), length(mmValue, units)].filter(Boolean).join(' · ') || null;

const JogTiming = ({ timing, linkMs, beatMs, settings, xySpeed, zSpeed }) => {
  const units = useUnits();
  const timings = installationTimings({ timing, linkMs, beatMs });
  const travel = travelParts({ timings, settings, xySpeed, zSpeed });

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3 py-2">
        <span className="text-cap uppercase tracking-[0.08em] text-mut">{t('timings.title')}</span>
        {/* Which move the millimetres describe. The panel sets XY and Z
          * independently, a key on either pad produces this, and the honest
          * figure is the one that goes furthest — quoting the gentler of the
          * two would understate a distance somebody is about to put a hand
          * near. */}
        <span className="text-cap text-mut">
          {t('timings.atFeed', { feedrate: units.figure(travel.feedrate, 'feed'), unit: units.feed })}
        </span>
      </div>

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
        value={timings.linkMatters ? both(timings.linkMs, travel.linkMm, units) : null}
        note={timings.linkKnown && !timings.linkMatters
          ? t('timings.linkHere')
          : t('timings.linkNote')}
      />

      {/* What the server keeps queued ahead of the machine, measured from its
        * own jogging rather than assumed. The first thing to suspect when a
        * release overshoots on a link that is not the problem. */}
      <Row
        label={t('timings.queue')}
        value={both(timings.leadMs, travel.queueMm, units)}
        note={t('timings.queueNote')}
      />

      {/* The cable and the adapter. A USB serial adapter with the default
        * 16ms latency timer shows up here and nowhere else. */}
      <Row
        label={t('timings.reply')}
        value={both(timings.ackMs, travel.replyMm, units)}
        note={t('timings.replyNote')}
      />

      {/*
        * The machine's own, and the only row with no time beside it.
        *
        * It is not a delay — nothing is waiting — it is `v² / 2a` while the
        * axes slow down, so a figure in milliseconds here would invite
        * somebody to add it to the three above. It is also the part that no
        * better installation removes, which is worth seeing on its own: when
        * this is most of the distance, the computer and the network are not
        * the thing to go and fix.
        */}
      <Row
        label={t('timings.braking')}
        value={length(travel.brakingMm, units)}
        note={t('timings.brakingNote')}
      />

      {/*
        * And this panel, which is between the operator and the machine as much
        * as the network is.
        *
        * The worst gap between two of its own confirmations of a held jog.
        * **It is not part of the distance above and carries no millimetres**,
        * and that is deliberate rather than an omission: a jog let go of ends
        * on the release, and how far one runs on when this page stops
        * responding is decided by the tolerance the *server* holds it to,
        * which is this figure clamped. A distance worked out here would be the
        * panel's second reading of a number somebody else enforces — the
        * mistake `controller:envelope` exists to have stopped making.
        */}
      <Row
        label={t('timings.panel')}
        value={ms(timings.beatMs)}
        note={t('timings.panelNote')}
      />
    </div>
  );
};

export default JogTiming;
