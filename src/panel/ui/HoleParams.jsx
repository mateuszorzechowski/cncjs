import { useMemo, useState } from 'react';
import { passesSection } from './HolePasses';
import HoleScene from './HoleScene';
import MoveBar, { namedGroups } from './MoveBar';
import PlayControls from './PlayControls';
import ProbeReadout from './ProbeReadout';
import { figureColumns } from './ProbeSections';
import { useReducedMotion } from './useClock';
import useSetupPlayer from './useSetupPlayer';
import { figureSaid } from '../machine/probeFields';
import {
  HOLE_PARAMS, LOOP_HOLD_MS, holeCode, holeGroups, holeOrder, holeReadout, holeScene, holeTimeline, moveOf, playAt, titleOf,
} from '../machine/holeCycle';
import { fillsAt, timeAt } from '../machine/timeline';
import { useIsWide } from './shell';
import { useUnits } from './units';
import { t } from '../i18n';

// The coordinate system's number in G10 L20 P…: G54 is 1.
const systemNumber = (wcs) => (Number(String(wcs || 'G54').slice(1)) || 54) - 53;

/**
 * The hole centre's Setup, drawn as the Z plate's (Claude Design, probe
 * proposals, 2026-09-30): the hole from above large, one bar of its moves —
 * two passes, each across X and across Y, then the zero — a player's
 * controls, the tool's X and Y before and after the zero, and the move's
 * name with its G-code; beside it the figures by what they are about, those
 * the move playing uses lit. A figure being set loops the move it changes.
 *
 * `split(left, right)`, wide: the screen lays the drawing and the figures out
 * as cards of their own.
 */
const HoleParams = ({
  fields, texts, onText, bad, wcs, intro = null, note = null, split = null,
}) => {
  const units = useUnits();
  const wide = useIsWide();
  const [open, setOpen] = useState(null);
  const still = useReducedMotion();
  const group = HOLE_PARAMS.find((one) => one.id === open);
  // Once or twice across: the cycle drawn is the one that will run.
  const passes = texts.holePasses === '1' ? 1 : 2;
  const items = useMemo(() => holeTimeline(passes), [passes]);
  const {
    player, picked, loop, frame, p, onField, pick,
  } = useSetupPlayer({
    items, hold: LOOP_HOLD_MS, playAt: (ms, how) => playAt(ms, { ...how, passes }), still,
  });
  const { name, focus } = frame;
  const say = (field, text) => figureSaid(field, text, units.rule);
  const scene = holeScene(name, p, {
    texts, say, upTo: (v) => t('probe.cycle.upTo', { v }), focus,
  });
  const move = moveOf(name);
  const code = holeCode(name, texts, systemNumber(wcs));
  const read = holeReadout(name);
  const title = t(...titleOf(name));

  const groups = namedGroups(holeGroups(passes), t, (id) => t(...titleOf(id)));
  const sections = HOLE_PARAMS.map((one) => (one.passes
    ? passesSection(one, fields, texts, onText)
    : { id: one.id, title: t(one.key), fields: one.fields.filter((field) => fields.includes(field)) }))
    .filter((one) => one.fields.length || one.head);

  const left = (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel">
      <HoleScene {...scene} label={title} className="aspect-[404/188] h-auto max-h-64 w-full @[1800px]/shell:max-h-96" />
      <MoveBar
        groups={groups}
        active={name}
        fills={loop ? fillsAt(items, timeAt(items, name, p), false) : fillsAt(items, player.t)}
        onPick={pick}
        picked={player.mode === 'cycle' ? null : player.range}
        // The moves a figure acts in: the one being set, or else the open group's (review note, 2026-10-01).
        marked={picked || group ? holeOrder(passes).filter((id) => moveOf(id).uses.some((use) => (picked ? use === picked : group.fields.includes(use)))) : []}
      />
      <PlayControls paused={player.paused} ended={player.ended} mode={player.mode} locked={loop} onPlay={player.play} onPause={player.pause} onStep={player.step} onMode={player.setMode} />
      <ProbeReadout wcs={wcs} after={read.after} axes={read.axes} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line px-3 py-2">
        <span className="min-w-0 text-base font-semibold text-ink">{title}</span>
        {/* A way to the middle has no numbers to show: it says where it goes. */}
        <span className="whitespace-nowrap font-num text-cap text-mut">{code || t('probe.hole.centreCode')}</span>
      </div>
    </div>
  );
  const { right, third } = figureColumns({
    wide: wide && Boolean(split), sections, open, onOpen: setOpen, texts, onText, bad, onField, lit: move.uses, intro, note,
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

export default HoleParams;
