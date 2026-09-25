import Icon from './Icon';
import { t } from '../i18n';

/**
 * What something is set to, as a line that can be tapped to change it.
 *
 * The phone's answer to a row of controls that does not fit. Closed, it still
 * shows the *values* — folded away without them it would hide the one thing
 * checked before anything is pressed, which on the jog card is how far the
 * next press moves the machine and on the connection card is what the panel
 * is about to open a port as.
 *
 * It began as `AxisSummary`, with millimetres and mm/min written into it.
 * Generalised when the connection screen needed the same line for a
 * controller type and a baud rate — *"zastosuj rozwiazanie z jog, dla
 * sterownika i portu rowniez"* (2026-09-23). One component, because the two
 * are the same thing: a summary that opens a sheet.
 *
 * Its values are `{ value, unit }` rather than formatted strings, so the
 * figure stays `text-ink` and its unit stays muted — a reading and the name
 * of a reading are not the same weight, and a caller handed one string could
 * not make them differ.
 *
 * `title` is optional: inside a settings row the row already names it, and
 * then `label` is what a screen reader hears instead.
 *
 * `locked` is not `disabled`. Disabled is "not now", and dims. Locked is "set,
 * and held by something else" — the connection's port, controller and rate
 * while the port is open — and the value is exactly what somebody reads after
 * connecting, so it stays at full contrast in a grey field and says LOCKED
 * where the chevron was (settings drawing, 2026-09-25, point 4: dimmed, it
 * was below 2:1 and read as broken rather than held).
 */
const SettingSummary = ({ title, label, values, onOpen, disabled, locked = false }) => (
  <button
    type="button"
    onClick={onOpen}
    disabled={disabled || locked}
    aria-label={title ? undefined : label}
    // One or the other, never both in one string: two opacity utilities
    // resolve in the stylesheet's order, not the string's, and the dimming
    // won — the locked value came out as faint as a disabled one.
    className={`flex h-ctl shrink-0 items-center gap-2 rounded-ctl border border-line px-3 text-left ${locked ? 'bg-bg' : 'bg-surf disabled:opacity-45'}`}
  >
    {/* The name at the left and the value pushed right; with no name, the
      * value at the left where a field's value sits and the mark pushed
      * right instead. */}
    {title ? (
      <span className="shrink-0 text-cap font-semibold uppercase tracking-[0.08em] text-ink">
        {title}
      </span>
    ) : null}
    {title ? <span className="flex-1" /> : null}
    {values.map(({ value, unit }) => (
      <span key={`${value}${unit || ''}`} className={`truncate font-num text-mut ${title ? 'text-note' : 'text-base'}`}>
        <span className="text-ink">{value}</span>
        {unit ? ` ${unit}` : null}
      </span>
    ))}
    {title ? null : <span className="flex-1" />}
    {/* A mark rather than a word: it says "there is more behind this" and is
      * the same whatever language the panel is in. The state chip's chevron,
      * which every control that opens a sheet carries (2026-09-25). */}
    {locked ? (
      <span className="shrink-0 text-cap font-semibold uppercase tracking-[0.08em] text-mut">
        {t('settings.locked')}
      </span>
    ) : (
      <Icon name="chevron" className="size-4 shrink-0 text-mut" weight={2} />
    )}
  </button>
);

export default SettingSummary;
