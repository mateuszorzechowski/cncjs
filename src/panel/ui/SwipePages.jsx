import { useRef, useState } from 'react';

/**
 * Pages side by side, turned with a finger — the file sheet on a phone:
 * the details, and then the file's text (Mateusz, 2026-09-25: *"jako druga
 * strona przewijana palcem w bok"*).
 *
 * The browser's own scroll snapping, not a gesture of ours: a swipe that
 * lands between pages settles on one, momentum and edge feel are the
 * phone's, and nothing here has to tell a sideways swipe from a scroll.
 * Each page scrolls up and down on its own.
 *
 * `pages` are `{ key, label, content }`; the dots over their foot say which
 * page is showing and turn to the other one when tapped.
 */
const SwipePages = ({ pages, label, className = '' }) => {
  const strip = useRef(null);
  const [at, setAt] = useState(0);

  const turnTo = (index) => {
    const node = strip.current;
    node?.scrollTo({ left: index * node.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className={`relative flex min-h-0 flex-col ${className}`}>
      <div
        ref={strip}
        role="group"
        aria-label={label}
        onScroll={(event) => {
          const node = event.currentTarget;
          setAt(Math.round(node.scrollLeft / Math.max(1, node.clientWidth)));
        }}
        className="scroll-quiet flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {pages.map((page) => (
          <section
            key={page.key}
            aria-label={page.label}
            className="flex min-h-0 w-full shrink-0 snap-start flex-col gap-gap overflow-y-auto pb-9"
          >
            {page.content}
          </section>
        ))}
      </div>
      {/*
        * Over the pages, at their foot, rather than under them: a row of its
        * own made the sheet a few pixels too tall and scroll (*"warstwe wyzej
        * i nie powodowac scrolla"*, 2026-09-25).
        */}
      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-wash px-2 py-1.5">
        {pages.map((page, index) => (
          <button
            key={page.key}
            type="button"
            aria-label={page.label}
            aria-current={index === at}
            onClick={() => turnTo(index)}
            className={`size-2.5 rounded-full transition-colors ${index === at ? 'bg-acc' : 'bg-line'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default SwipePages;
