import { useMemo, useState } from 'react';
import MapScene from './MapScene';
import MoveBar, { namedGroups } from './MoveBar';
import PlayControls from './PlayControls';
import { figureColumns } from './ProbeSections';
import { useReducedMotion } from './useClock';
import useSetupPlayer from './useSetupPlayer';
import { figureSaid } from '../machine/probeFields';
import {
  LOOP_HOLD_MS, mapCode, mapExplain, mapGroups, mapMoveOf, mapOrder, mapParams, mapPlayAt, mapScene, mapTimeline,
} from '../machine/mapCycle';
import { fillsAt, timeAt } from '../machine/timeline';
import { useIsWide } from './shell';
import { useUnits } from './units';
import { t } from '../i18n';
import { DRAWING_FIT } from './probeDraw';

const NBSP = ' ';

/**
 * The height map's Setup (Mateusz, 2026-10-02): its moves side-on — one point
 * touched, the lift and across to the next, the fast touch there — on the
 * player every method's Setup has, and beside it the figures they use by
 * what they are about. The area comes on the next step.
 */
const HeightMapSetup = ({
  fields, texts, onText, bad, chosen = 'board', intro = null, note = null, split = null,
}) => {
  const units = useUnits();
  const wide = useIsWide();
  const [open, setOpen] = useState(null);
  const still = useReducedMotion();
  const params = mapParams(chosen);
  const group = params.find((one) => one.id === open);
  const items = useMemo(() => mapTimeline(chosen), [chosen]);
  const playAt = useMemo(() => (ms, how) => mapPlayAt(ms, { ...how, tool: chosen }), [chosen]);
  const {
    player, picked, loop, frame, p, onField, pick,
  } = useSetupPlayer({
    items, hold: LOOP_HOLD_MS, playAt, still,
  });
  const { name, focus } = frame;
  const say = (field, text) => figureSaid(field, text, units.rule);
  const scene = mapScene(name, p, {
    texts, say, upTo: (v) => t('probe.cycle.upTo', { v }), focus, tool: chosen,
  });
  const move = mapMoveOf(name, chosen);
  const title = t(move.titleKey);
  const why = mapExplain(name, texts, say);
  const bar = name === 'miss' ? 'fast' : name;

  const groups = namedGroups(mapGroups(chosen), t, (id) => t(mapMoveOf(id, chosen).titleKey));
  const sections = params
    .map((one) => ({ id: one.id, title: t(one.key), fields: one.fields.filter((field) => fields.includes(field)) }))
    .filter((one) => one.fields.length);

  const left = (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel">
      <MapScene {...scene} tool={chosen} label={title} className={`aspect-[340/180] h-auto w-full ${DRAWING_FIT}`} />
      <MoveBar
        groups={groups}
        active={bar}
        fills={loop ? fillsAt(items, timeAt(items, bar, p), false) : fillsAt(items, player.t)}
        onPick={pick}
        picked={player.mode === 'cycle' ? null : player.range}
        marked={picked || group ? mapOrder(chosen).filter((id) => mapMoveOf(id, chosen).uses.some((use) => (picked ? use === picked : group.fields.includes(use)))) : []}
      />
      <PlayControls paused={player.paused} ended={player.ended} mode={player.mode} locked={loop} onPlay={player.play} onPause={player.pause} onStep={player.step} onMode={player.setMode} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line px-3 py-2">
        <span className="min-w-0 text-base font-semibold text-ink">{title}</span>
        <span className="whitespace-nowrap font-num text-cap text-mut">{mapCode(name, texts, chosen)}</span>
        <span className="w-full text-note text-mut">{why ? t(...why) : NBSP}</span>
      </div>
    </div>
  );
  const { right, third } = figureColumns({
    wide: wide && Boolean(split),
    sections,
    open,
    onOpen: setOpen,
    texts,
    onText,
    bad,
    onField,
    lit: move.uses,
    intro,
    note,
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

export default HeightMapSetup;
