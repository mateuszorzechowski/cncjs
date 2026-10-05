import { useMemo, useState } from 'react';
import { passesSection } from './HolePasses';
import CentreViews from './CentreViews';
import MoveBar, { namedGroups } from './MoveBar';
import PlayControls from './PlayControls';
import { figureColumns } from './ProbeSections';
import { useReducedMotion } from './useClock';
import useSetupPlayer from './useSetupPlayer';
import { figureSaid } from '../machine/probeFields';
import { drawnPasses } from '../machine/sizeCycle';
import { fillsAt, timeAt } from '../machine/timeline';
import { useIsWide } from '../../ui/shell';
import { useUnits } from '../../ui/units';
import { t } from '../../i18n/index';
import { DRAWING_FIT } from './probeDraw';

// An empty line's place kept, a no-break space.
const NBSP = ' ';
/**
 * Pomiar's Setup — a hole's or a part's from outside, `cycle` — drawn as the
 * Z plate's (Claude Design, probe proposals, 2026-09-30): it from above
 * large, one bar of its moves — one pass or two, each across X and across Y,
 * then the size — a player's controls, and the move's name with its G-code;
 * beside it the figures by what they are about, those the move playing uses
 * lit. A figure being set loops the move it changes.
 *
 * `split(left, right)`, wide: the screen lays the drawing and the figures out
 * as cards of their own. `head`, above the drawing: what picks the cycle drawn.
 */
const CentreParams = ({
  cycle, fields, texts, onText, bad, intro = null, note = null, split = null, head = null,
}) => {
  const {
    params: PARAMS, hold, order, groups: groupsOf, timeline, playAt, moveOf, titleOf, scene: sceneOf, code: codeOf, usesAt,
  } = cycle;
  const units = useUnits();
  const wide = useIsWide();
  const [open, setOpen] = useState(null);
  const still = useReducedMotion();
  const group = PARAMS.find((one) => one.id === open);
  // Once or twice across, and a size's repeats: the cycle drawn is the one that will run.
  const passes = drawnPasses(texts.holePasses, texts.repeats);
  const items = useMemo(() => timeline(passes), [timeline, passes]);
  const {
    player, picked, loop, frame, p, onField, pick,
  } = useSetupPlayer({
    items, hold, playAt: (ms, how) => playAt(ms, { ...how, passes }), still,
  });
  const { name, focus } = frame;
  const say = (field, text) => figureSaid(field, text, units.rule);
  const how = {
    texts, say, upTo: (v) => t('probe.cycle.upTo', { v }), focus,
  };
  const code = codeOf(name, texts);
  const title = t(...titleOf(name));
  // Where the step's figure comes from, when it is a sum (review note #9, 2026-10-02).
  const why = cycle.explain ? cycle.explain(name, texts, say) : null;

  const groups = namedGroups(groupsOf(passes), t, (id) => t(...titleOf(id)));
  const sections = PARAMS.map((one) => (one.passes
    ? passesSection(one, fields, texts, onText)
    : {
      id: one.id, title: t(one.key), fields: one.fields.filter((field) => fields.includes(field)), names: one.names,
    }))
    .filter((one) => one.fields.length || one.head);

  const drawing = (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel">
      <CentreViews
        cycle={cycle}
        top={sceneOf(name, p, how)}
        side={cycle.side ? cycle.side(name, p, how) : null}
        name={name}
        auto={cycle.viewOf?.(name, p, focus)}
        label={title}
        className={DRAWING_FIT}
      />
      <MoveBar
        groups={groups}
        active={name}
        fills={loop ? fillsAt(items, timeAt(items, name, p), false) : fillsAt(items, player.t)}
        onPick={pick}
        picked={player.mode === 'cycle' ? null : player.range}
        // The moves a figure acts in: the one being set, or else the open group's (review note, 2026-10-01).
        marked={picked || group ? order(passes).filter((id) => moveOf(id).uses.some((use) => (picked ? use === picked : group.fields.includes(use)))) : []}
      />
      <PlayControls paused={player.paused} ended={player.ended} mode={player.mode} locked={loop} onPlay={player.play} onPause={player.pause} onStep={player.step} onMode={player.setMode} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line px-3 py-2">
        <span className="min-w-0 text-base font-semibold text-ink">{title}</span>
        {/* A way with no numbers to show says where it goes. */}
        <span className="whitespace-nowrap font-num text-cap text-mut">{Array.isArray(code) ? t(...code) : code}</span>
        {/* Its line kept when empty, so the caption does not jump (review note #9, 2026-10-02). */}
        {cycle.explain ? <span className="w-full text-note text-mut">{why ? t(...why) : NBSP}</span> : null}
      </div>
    </div>
  );
  // Above the drawing, what picks it: a distance's end (`DistanceSetup`).
  const left = head ? <div className="flex min-w-0 flex-col gap-3">{head}{drawing}</div> : drawing;
  const { right, third } = figureColumns({
    wide: wide && Boolean(split), sections, open, onOpen: setOpen, texts, onText, bad, onField, lit: usesAt(name, p), intro, note,
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

export default CentreParams;
