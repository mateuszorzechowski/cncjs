/**
 * A bar whose length is a reading.
 *
 * The one place in the panel allowed to write an inline style, and the reason
 * is that a width driven by data cannot be a class: a percentage is
 * continuous and Tailwind's classes are not. Everything else — the colours,
 * the height, the track — is a token.
 *
 * Kept as its own component so the exception is here, written down, instead of
 * appearing wherever somebody next needs a bar.
 */
/*
 * `part` is a share of the filled length drawn at its end in a colour of its
 * own — `{ percent, tone }`, a percentage of what is filled. At least a few
 * pixels, so a part that is real is never drawn as nothing: cncjs's files are
 * megabytes on a disk of hundreds of gigabytes, and the point of drawing them
 * is to say they are there (Mateusz, 2026-09-25).
 */
const Meter = ({ percent, max = 100, label, tone = 'bg-acc', part }) => {
  const clamped = Math.max(0, Math.min(max, Number(percent) || 0));

  return (
    <div
      className="h-1.5 w-full bg-line"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
    >
      {/* eslint-disable-next-line react/forbid-dom-props */}
      <div className={`flex h-full justify-end ${tone}`} style={{ width: `${(clamped / max) * 100}%` }}>
        {part && part.percent > 0 ? (
          // eslint-disable-next-line react/forbid-dom-props
          <div className={`h-full min-w-[3px] ${part.tone}`} style={{ width: `${part.percent}%` }} />
        ) : null}
      </div>
    </div>
  );
};

export default Meter;
