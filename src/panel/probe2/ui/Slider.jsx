/**
 * A value chosen along a line of fixed steps (the height map's scale,
 * 2026-10-03): the panel's one slider. `steps` are the values, in order;
 * `value` one of them; `say(value)` what is written beside it. A step a
 * finger lands on, not a free figure: a step is a value someone chose.
 */
const Slider = ({
  steps, value, onChange, label, say = String, className = '',
}) => {
  const at = Math.max(0, steps.indexOf(value));
  return (
    <label className={`flex min-w-0 items-center gap-3 ${className}`}>
      <span className="shrink-0 text-note text-mut">{label}</span>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={at}
        aria-label={label}
        aria-valuetext={say(steps[at])}
        onChange={(event) => onChange(steps[Number(event.target.value)])}
        className="h-chiph min-w-0 flex-1 accent-acc"
      />
      <span className="w-14 shrink-0 text-right font-num text-base text-ink">{say(steps[at])}</span>
    </label>
  );
};

export default Slider;
