import { useMemo, useState } from 'react';
import CornerSide from './CornerSide';
import CornerTop from './CornerTop';
import MoveBar, { namedGroups } from './MoveBar';
import PlayControls from './PlayControls';
import ProbeReadout from './ProbeReadout';
import { figureColumns } from './ProbeSections';
import SegmentedChoice from './SegmentedChoice';
import { useClock, useReducedMotion } from './useClock';
import usePlayer from './usePlayer';
import { figureSaid } from '../machine/probeFields';
import {
  CORNER_GROUPS, CORNER_ORDER, CORNER_PARAMS, LOOP_HOLD_MS, cornerCode, cornerReadout, cornerTimeline, moveOf, playAt, TURN,
} from '../machine/cornerCycle';
import {
  fillsAt, frameAt, rangeOf, timeAt,
} from '../machine/timeline';
import { inMm } from '../machine/units';
import { useIsPhone, useIsWide } from './shell';
import { useUnits } from './units';
import { t } from '../i18n';

const numberOf = (text) => Number(String(text).replace(',', '.'));

const AXES = ['x', 'y', 'z'];
const LEG_KEYS = {
  up: 'probe.corner.leg.up', over: 'probe.corner.leg.over', out: 'probe.corner.leg.out', down: 'probe.corner.leg.down', off: 'probe.corner.leg.off', lift: 'probe.corner.leg.lift', corner: 'probe.corner.leg.corner',
};
// The descent beside the wall is the X set-up's, on the bar.
const BAR_OF = { depth: 'xSet' };
const VIEWS = ['top', 'side'];
const VIEW_KEYS = { top: 'probe.view.top', side: 'probe.view.side' };

// The coordinate system's number in G10 L20 P…: G54 is 1.
const systemNumber = (wcs) => (Number(String(wcs || 'G54').slice(1)) || 54) - 53;

// Which view a move is seen best from, on a phone that shows one.
const viewOf = (move, p, focus) => {
  if (['thick', 'rise'].includes(focus) || (focus === 'dim' && move.view === 'side')) {
    return 'side';
  }
  if (move.view === 'both') {
    // The turn itself still the side's: a segment's end frame is its own, not the next one's start.
    return move.rise || p <= TURN ? 'side' : 'top';
  }
  return move.view === 'side' ? 'side' : 'top';
};

/**
 * The L plate's Setup (Claude Design, `templates/probe-corner-proposal`,
 * 2026-09-30, layout "podział" — Mateusz's pick): the corner from above and
 * from the side side by side through the whole cycle, one bar of its moves
 * under them, the tool's X, Y and Z before and after the zero, and the move's
 * name with its G-code; beside it the figures by what they are about, those
 * the move playing uses lit. On a phone one view at a time: it follows the
 * move, and a view chosen by hand holds to the end of the stage.
 *
 * `split(left, right)`, wide: the screen lays the drawing and the figures out
 * as cards of their own.
 */
const CornerParams = ({
  fields, texts, onText, bad, corner, wcs, intro = null, note = null, split = null,
}) => {
  const units = useUnits();
  const wide = useIsWide();
  const phone = useIsPhone();
  const [picked, setPicked] = useState(null);
  const [open, setOpen] = useState(null);
  const [chosen, setChosen] = useState(null);
  const still = useReducedMotion();
  const group = CORNER_PARAMS.find((one) => one.id === open);
  // The cycle on the player's clock; a figure being set plays its own loop meanwhile, and the player waits.
  const items = useMemo(() => cornerTimeline({ apart: phone }), [phone]);
  const player = usePlayer(items, { hold: LOOP_HOLD_MS, running: !picked });
  const fieldMs = useClock(picked, Boolean(picked));
  const frame = picked ? playAt(fieldMs, { field: picked, still }) : { ...frameAt(items, player.t), focus: null };
  const { name, focus } = frame;
  const p = still && !picked ? 1 : frame.p;
  const pick = (ids, part = null) => player.seek({ ...rangeOf(items, ids, part), ids, part });
  const move = moveOf(name);
  const say = (field, text) => figureSaid(field, text, units.rule);
  const drawing = {
    name, p, corner, texts, say, upTo: (v) => t('probe.cycle.upTo', { v }), focus,
  };
  const code = cornerCode(name, p, texts, systemNumber(wcs));
  const mm = Object.fromEntries(['toolDiameter', 'wallX', 'wallY', 'cornerThickness'].map((field) => [field, inMm(numberOf(texts[field]), units.rule) ?? 0]));
  const read = cornerReadout(name, corner, mm);
  const title = code.leg
    ? t(move.legsKey || 'probe.corner.move.set', { axis: move.group.toUpperCase(), leg: t(LEG_KEYS[code.leg]) })
    : t(move.titleKey);
  // A view picked by hand holds while its stage plays.
  const view = chosen && chosen.group === move.group ? chosen.view : viewOf(move, p, focus);

  // A set-up's legs, and on a phone the zero seen from the side and then from above: a segment each (review note, 2026-09-30).
  const partsOf = (id) => items.find((item) => item.name === id).parts.length;
  const groups = namedGroups(CORNER_GROUPS, t, (id) => t(moveOf(id).titleKey), partsOf);
  const sections = CORNER_PARAMS.map((one) => ({ id: one.id, title: t(one.key), fields: one.fields.filter((field) => fields.includes(field)) }))
    .filter((one) => one.fields.length);

  const left = (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel">
      {phone ? (
        <div className="border-b border-line p-2">
          <SegmentedChoice
            options={VIEWS}
            value={view}
            onChange={(which) => setChosen({ view: which, group: move.group })}
            format={(which) => t(VIEW_KEYS[which])}
            label={t('probe.view.label')}
            joined
          />
        </div>
      ) : null}
      <div className="relative">
        {phone ? (
          <>
            {view === 'top' ? <CornerTop {...drawing} label={title} className="w-full" /> : null}
            {view === 'side' ? <CornerSide {...drawing} label={title} className="w-full" /> : null}
          </>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-line">
            <CornerTop {...drawing} label={title} className="h-auto max-h-64 w-full @[1800px]/shell:max-h-96" />
            <CornerSide {...drawing} label={title} className="h-auto max-h-64 w-full @[1800px]/shell:max-h-96" />
          </div>
        )}
      </div>
      <MoveBar
        groups={groups}
        active={BAR_OF[name] || name}
        fills={picked ? fillsAt(items, timeAt(items, BAR_OF[name] || name, p), false) : fillsAt(items, player.t)}
        onPick={pick}
        picked={player.mode === 'cycle' ? null : player.range}
        marked={group ? CORNER_ORDER.filter((id) => moveOf(id).uses.some((use) => group.fields.includes(use))) : []}
      />
      <PlayControls paused={player.paused} ended={player.ended} mode={player.mode} locked={Boolean(picked)} onPlay={player.play} onPause={player.pause} onStep={player.step} onMode={player.setMode} />
      <ProbeReadout wcs={wcs} after={read.after} axes={AXES.map((axis) => [axis, read[axis]])} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line px-3 py-2">
        <span className="min-w-0 text-base font-semibold text-ink">{title}</span>
        <span className="flex gap-2 whitespace-nowrap font-num text-cap text-mut">
          {code.parts.map((part, i) => (
            <span key={part} className={i === code.now ? 'font-semibold text-ink underline underline-offset-4' : ''}>{part}</span>
          ))}
        </span>
      </div>
    </div>
  );
  const { right, third } = figureColumns({
    wide: wide && Boolean(split), sections, open, onOpen: setOpen, texts, onText, bad, onField: setPicked, lit: move.uses, intro, note,
  });
  if (split) {
    return split(left, right, third);
  }
  return (
    <div className="grid gap-4 @3xl/shell:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-3 self-start">{left}</div>
      <div className="min-w-0 self-start">{right}</div>
    </div>
  );
};

export default CornerParams;
