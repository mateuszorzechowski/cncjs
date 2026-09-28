import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';

const pad = (n) => String(n).padStart(2, '0');

// The dial, in its own units: a 256-wide square, the hours in two rings.
const SIZE = 256;
const MID = SIZE / 2;
const OUTER = 100;
const INNER = 64;
const BUBBLE = 18;
// SVG's own words for centring a label on its point — not text anybody reads.
const CENTRAL = 'central';
const MIDDLE = 'middle';

// Twelve o'clock first, then clockwise — the outer ring 12, 1…11; the inner 00, 13…23.
const OUTER_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const INNER_HOURS = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const MINUTE_MARKS = Array.from({ length: 12 }, (_, i) => i * 5);

const at = (turn, radius) => ({
  x: MID + (radius * Math.sin(turn * 2 * Math.PI)),
  y: MID - (radius * Math.cos(turn * 2 * Math.PI)),
});

/**
 * An hour and a minute on a clock face, the way a phone asks for them
 * (Mateusz, 2026-09-28: *"wybór godziny jak na Androidzie? kółeczko
 * zegarowe?"*): the hour first, in two rings — 1–12 outside, 00 and 13–23
 * inside, as a 24-hour Android dial has them — then the minute, marked every
 * five and exact anywhere between. A press picks, a drag follows the pointer,
 * and letting go of an hour turns the dial to the minutes. The two numbers
 * above say which is being set, and either can be pressed to set it again.
 *
 * `hours` and `minutes` are numbers; `onChange(hours, minutes)`.
 */
const ClockDial = ({ hours, minutes, onChange }) => {
  const [mode, setMode] = useState('hours');
  const face = useRef(null);
  const pressed = useRef(false);

  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * SIZE - MID;
    const y = ((event.clientY - box.top) / box.height) * SIZE - MID;
    const turn = ((Math.atan2(x, -y) / (2 * Math.PI)) + 1) % 1;
    if (mode === 'hours') {
      const ring = Math.hypot(x, y) < (OUTER + INNER) / 2 ? INNER_HOURS : OUTER_HOURS;
      onChange(ring[Math.round(turn * 12) % 12], minutes);
    } else {
      onChange(hours, Math.round(turn * 60) % 60);
    }
  };

  /*
   * Pressed, dragged and let go — attached here rather than as props, the
   * way the panel's other pointer surfaces are (`Controls`, `Pointer`). The
   * latest `pick` and `mode` through a ref, so the listeners stay put.
   */
  const latest = useRef({ pick, mode });
  latest.current = { pick, mode };
  useEffect(() => {
    const node = face.current;
    const press = (event) => {
      pressed.current = true;
      node.setPointerCapture(event.pointerId);
      latest.current.pick(event);
    };
    const drag = (event) => {
      if (pressed.current) {
        latest.current.pick(event);
      }
    };
    const release = () => {
      pressed.current = false;
      if (latest.current.mode === 'hours') {
        setMode('minutes');
      }
    };
    node.addEventListener('pointerdown', press);
    node.addEventListener('pointermove', drag);
    node.addEventListener('pointerup', release);
    return () => {
      node.removeEventListener('pointerdown', press);
      node.removeEventListener('pointermove', drag);
      node.removeEventListener('pointerup', release);
    };
  }, []);

  const selected = mode === 'hours'
    ? at((hours % 12) / 12, hours === 0 || hours > 12 ? INNER : OUTER)
    : at(minutes / 60, OUTER);

  const mark = (value, turn, radius, text) => {
    const point = at(turn, radius);
    return (
      <text
        key={`${radius}-${value}`}
        x={point.x}
        y={point.y}
        dominantBaseline={CENTRAL}
        textAnchor={MIDDLE}
        className={`pointer-events-none fill-current font-num ${radius === INNER ? 'text-[11px]' : 'text-[13px]'}`}
      >
        {text}
      </text>
    );
  };

  const part = (which, value, label) => (
    <button
      type="button"
      aria-pressed={mode === which}
      aria-label={label}
      onClick={() => setMode(which)}
      className={`rounded-ctl px-2 font-num text-head ${mode === which ? 'bg-accS text-acc' : 'text-ink'}`}
    >
      {pad(value)}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1">
        {part('hours', hours, t('picker.hour'))}
        <span className="font-num text-head text-mut">:</span>
        {part('minutes', minutes, t('picker.minute'))}
      </div>
      <div
        ref={face}
        role="slider"
        tabIndex={-1}
        aria-label={mode === 'hours' ? t('picker.hour') : t('picker.minute')}
        aria-valuenow={mode === 'hours' ? hours : minutes}
        aria-valuemin={0}
        aria-valuemax={mode === 'hours' ? 23 : 59}
        className="aspect-square w-full max-w-64 touch-none select-none text-ink"
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" className="size-full">
          <circle cx={MID} cy={MID} r={MID - 4} className="fill-field stroke-line" />
          <line x1={MID} y1={MID} x2={selected.x} y2={selected.y} className="stroke-acc" strokeWidth={2} />
          <circle cx={MID} cy={MID} r={3} className="fill-acc" />
          {mode === 'hours'
            ? [
              ...OUTER_HOURS.map((hour, i) => mark(hour, i / 12, OUTER, String(hour))),
              ...INNER_HOURS.map((hour, i) => mark(hour, i / 12, INNER, pad(hour))),
            ]
            : MINUTE_MARKS.map((minute) => mark(minute, minute / 60, OUTER, pad(minute)))}
          {/* Over the marks and carrying the value itself, so a minute between two marks reads too. */}
          <circle cx={selected.x} cy={selected.y} r={BUBBLE} className="fill-acc" />
          <text
            x={selected.x}
            y={selected.y}
            dominantBaseline={CENTRAL}
            textAnchor={MIDDLE}
            className="pointer-events-none fill-panel font-num text-[13px]"
          >
            {mode === 'hours' ? (hours === 0 || hours > 12 ? pad(hours) : String(hours)) : pad(minutes)}
          </text>
        </svg>
      </div>
    </div>
  );
};

export default ClockDial;
