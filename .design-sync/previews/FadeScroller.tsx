import { FadeScroller, Card } from 'cncjs';
import { useEffect, useRef } from 'react';

// The panel's one way of scrolling: a fade where more runs under an edge and
// a thin thumb on its track in the card's padding. The journal, as its card
// shows it, in a box short enough to scroll.
const ENTRIES = [
  ['14:32:07.412', 'Błąd', 'text-red', 'Sterownik', 'Błąd', 'error:9'],
  ['14:32:05.118', 'Uwaga', 'text-amb', 'Serwer', 'Odmowa', ''],
  ['14:31:58.906', 'Info', 'text-ink', 'Serwer', 'Program', ''],
  ['14:31:58.870', 'Info', 'text-ink', 'Serwer', 'Plik', ''],
  ['14:30:12.004', 'Info', 'text-ink', 'Sterownik', 'Start', ''],
  ['14:30:11.771', 'Info', 'text-ink', 'Serwer', 'Port', ''],
  ['14:29:40.235', 'Uwaga', 'text-amb', 'Sterownik', 'Alarm', 'ALARM:1'],
  ['14:29:02.580', 'Info', 'text-ink', 'Serwer', 'Ustawienie', '$110'],
  ['14:28:47.193', 'Info', 'text-ink', 'Serwer', 'Komenda', ''],
  ['14:28:30.662', 'Info', 'text-ink', 'Serwer', 'Ruch', ''],
];

const Journal = ({ rows }) => (
  <ul className="m-0 list-none p-0">
    {rows.map(([time, level, tone, source, event, code]) => (
      <li key={time} className="border-b border-line last:border-b-0">
        <div className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-left text-note">
          <span className="shrink-0 font-num tabular-nums text-mut">{time}</span>
          <span className={`w-16 shrink-0 font-semibold uppercase tracking-[0.06em] ${tone}`}>{level}</span>
          <span className="w-20 shrink-0 text-mut">{source}</span>
          <span className="shrink-0 font-semibold text-ink">{event}</span>
          {code ? <span className="font-num text-cap text-mut">{code}</span> : null}
        </div>
      </li>
    ))}
  </ul>
);

export const MoreBelow = () => (
  // At the top: the fade and the track say there is more below.
  // Telefon / tablet / PC: same look on every device and the scroller of every screen, card list and sheet at every width; the one per-device difference is the jog card, which scrolls through it on a tablet/PC (keys plus both axis groups) and not on a phone, where the keys fill the card and the settings fold into SettingSummary lines.
  <Card label="Dziennik" className="h-60 w-side" bodyClassName="gap-3">
    <FadeScroller className="min-h-0 flex-1">
      <Journal rows={ENTRIES} />
    </FadeScroller>
  </Card>
);

export const Scrolled = () => {
  // Part way down: both edges fade, and the thumb has moved.
  const box = useRef(null);
  useEffect(() => {
    const scroller = box.current?.querySelector('.overflow-y-auto');
    if (scroller) {
      scroller.scrollTop = 70;
      scroller.dispatchEvent(new Event('scroll'));
    }
  }, []);
  return (
    <div ref={box}>
      <Card label="Dziennik" className="h-60 w-side" bodyClassName="gap-3">
        <FadeScroller className="min-h-0 flex-1">
          <Journal rows={ENTRIES} />
        </FadeScroller>
      </Card>
    </div>
  );
};

export const Fits = () => (
  // Content that fits: no fade, no track — nothing promises more.
  <Card label="Dziennik" className="h-60 w-side" bodyClassName="gap-3">
    <FadeScroller className="min-h-0 flex-1">
      <Journal rows={ENTRIES.slice(0, 3)} />
    </FadeScroller>
  </Card>
);
