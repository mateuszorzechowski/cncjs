import { useId } from 'react';
import { cornerSides } from '../machine/cornerCycle';
import { t } from '../i18n';

/**
 * The L plate from above and from the side, as the design draws it (1f,
 * 2026-09-29), on one X axis: above, where the tool is, a dashed ring for how
 * high; below, how high, and the tip going down beside the wall. `at` is a
 * frame from `cornerAt`. The design draws the front-left corner; another
 * corner mirrors the geometry about the middle of the work, and the words are
 * placed where the mirrored corner puts them.
 */

// SVG's words for text anchored at its start and its end.
const START = 'start';
const END = 'end';

// SVG's words for the hatching: drawn in the view's own units, turned 45°.
const ON_VIEW = 'userSpaceOnUse';
const SLANT = 'rotate(45)';

// A 60° V bit side-on, its tip at the origin.
const BIT = 'M-10 -92 H10 V-17.3 L0 0 L-10 -17.3 Z';

const Contact = ({ at }) => <circle cx={at[0]} cy={at[1]} r={4.5} className="fill-amb" />;

const CornerScene = ({ corner, at, label, className = '' }) => {
  const id = useId().replace(/:/g, '');
  const { flipX, flipY } = cornerSides(corner);
  // Mirrors, in the scaled views' own coordinates: the work's middle is x 255,
  // y 135 from above and x 260 from the side.
  const topFlip = `translate(${flipX ? 510 : 0} ${flipY ? 270 : 0}) scale(${flipX ? -1 : 1} ${flipY ? -1 : 1})`;
  const sideFlip = `translate(${flipX ? 520 : 0} 0) scale(${flipX ? -1 : 1} 1)`;
  // Where the corner's zero is, and its words beside it, outside the work.
  const cornerX = flipX ? 400 : 110;
  const cornerY = flipY ? 60 : 210;
  const hatch = `hatch-${id}`;
  const touch = at.touch;

  return (
    <svg viewBox="0 36 440 364" role="img" aria-label={label} className={`block ${className}`}>
      <defs>
        <pattern id={hatch} patternUnits={ON_VIEW} width={8} height={8} patternTransform={SLANT}>
          <path d="M0 0 V8" className="stroke-acc" strokeWidth={1.2} opacity={0.6} />
        </pattern>
      </defs>

      <g transform="translate(36 4) scale(.8)">
        <g transform={topFlip}>
          <rect x={110} y={60} width={290} height={150} className="fill-mutS stroke-line" strokeWidth={1.5} />
          <rect x={100} y={130} width={90} height={90} className="fill-accS stroke-acc" strokeWidth={2} />
          <rect x={110} y={130} width={80} height={80} fill={`url(#${hatch})`} />
          <path d="M110 130 V210 H190" className="stroke-acc" fill="none" strokeWidth={1.2} strokeDasharray="4 3" />
          <g transform={`translate(${at.top[0]} ${at.top[1]})`}>
            <circle r={at.ring} className="stroke-mut" fill="none" strokeWidth={1.2} strokeDasharray="3 3" />
            <circle r={10} className="fill-field stroke-ink" strokeWidth={2} />
          </g>
          {touch ? <Contact at={touch.top} /> : null}
          {at.zero ? <path d="M102 210 H118 M110 202 V218" className="stroke-acc" strokeWidth={2} /> : null}
        </g>
        {at.zero ? (
          <text x={cornerX + (flipX ? 14 : -14)} y={cornerY + (flipY ? -10 : 22)} textAnchor={flipX ? START : END} className="fill-acc font-num text-cap font-semibold">
            {t('probe.corner.zeroXY')}
          </text>
        ) : null}
      </g>

      <path d="M0 220.5 H440" className="stroke-line" strokeWidth={1} />

      <g transform="translate(36 210) scale(.8)">
        <g transform={sideFlip}>
          <rect x={110} y={170} width={300} height={50} className="fill-mutS stroke-line" strokeWidth={1.5} />
          <path d="M100 150 H190 V196 H100 Z" className="fill-accS stroke-acc" strokeWidth={2} strokeLinejoin="round" />
          <rect x={110} y={170} width={80} height={26} fill={`url(#${hatch})`} />
          <path d="M190 170 H110 V196" className="stroke-acc" fill="none" strokeWidth={1.5} strokeDasharray="5 4" />
          <g opacity={at.sideFaded ? 0.3 : 1} transform={`translate(${at.side[0]} ${at.side[1]})`}>
            <path d={BIT} className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" />
          </g>
          {touch?.side ? <Contact at={touch.side} /> : null}
          {at.zero ? <path d="M110 170 H410 M110 120 V230" className="stroke-acc" strokeWidth={2} strokeDasharray="5 4" /> : null}
        </g>
        {at.zero ? (
          <>
            <text x={flipX ? 116 : 404} y={164} textAnchor={flipX ? START : END} className="fill-acc font-num text-cap font-semibold">{t('probe.z0')}</text>
            <text x={flipX ? 404 : 116} y={238} textAnchor={flipX ? END : START} className="fill-acc font-num text-cap font-semibold">{t('probe.corner.zeroX')}</text>
          </>
        ) : null}
      </g>

      <text x={12} y={56} className="fill-mut text-cap">{t('probe.corner.fromAbove')}</text>
      <text x={12} y={240} className="fill-mut text-cap">{t('probe.corner.fromSide')}</text>
    </svg>
  );
};

export default CornerScene;
