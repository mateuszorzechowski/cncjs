/**
 * A jog key: the one family of keys on the panel with a ground of its own, a
 * faint wash of the accent, so a pad is found at a glance (review note,
 * 2026-09-29: *"delikatny background … łatwiej identyfikowalne"*) — the jog
 * pads' and the paper's (review note, 2026-10-01: *"te przyciski jak w
 * jog"*). `quiet` for a key that goes somewhere rather than nudging; `fill`
 * for a key that fills its cell, as on the phone's tall pad, its words
 * larger.
 */
const JogKey = ({
  children, onClick, hold, disabled, label, quiet, fill = false, className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    {...(hold || {})}
    disabled={disabled}
    aria-label={label}
    className={[
      'flex min-w-0 flex-col items-center justify-center rounded-ctl border leading-tight',
      fill ? 'size-full' : 'min-h-jbtnh',
      quiet
        ? 'border-line bg-field text-cap font-medium text-mut hover:border-acc hover:text-acc'
        : `border-line bg-accS ${fill ? 'text-head' : 'text-lead'} font-semibold text-acc hover:border-acc`,
      'disabled:opacity-45 disabled:hover:border-line',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

export default JogKey;
