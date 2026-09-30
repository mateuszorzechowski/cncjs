import { useMemo, useState } from 'react';
import MoveBar, { namedGroups } from './MoveBar';
import PaperScene from './PaperScene';
import PlayControls from './PlayControls';
import ProbeReadout from './ProbeReadout';
import SegmentedChoice from './SegmentedChoice';
import { figureColumns } from './ProbeSections';
import { useClock, useReducedMotion } from './useClock';
import usePlayer from './usePlayer';
import { EDGES } from '../machine/probe';
import { figureSaid } from '../machine/probeFields';
import {
  LOOP_HOLD_MS, PAPER_GROUPS, PAPER_PARAMS, moveOf, paperCode, paperReadout, paperScene, paperTimeline, playAt,
} from '../machine/paperCycle';
import {
  fillsAt, frameAt, rangeOf, timeAt,
} from '../machine/timeline';
import { inMm } from '../machine/units';
import { useIsWide } from './shell';
import { useUnits } from './units';
import { t } from '../i18n';

const numberOf = (text) => Number(String(text).replace(',', '.'));

// The one move the figures change: the zero.
const ZERO_MOVE = ['zero'];

// The coordinate system's number in G10 L20 P…: G54 is 1.
const systemNumber = (wcs) => (Number(String(wcs || 'G54').slice(1)) || 54) - 53;

/**
 * The paper's Setup, laid out as the Z plate's (`ZPlateParams`): the drawing
 * large with its bar and player, the readout, the move's name with its line;
 * beside it the surface chosen, the instruction and the figures — the tool's
 * diameter only for a side, where the zero is its radius away.
 *
 * `chosen` is the surface, `onChoose` changes it.
 */
const PaperParams = ({
  fields, texts, onText, bad, wcs, chosen = 'z', onChoose, intro = null, note = null, split = null,
}) => {
  const units = useUnits();
  const wide = useIsWide();
  const [picked, setPicked] = useState(null);
  const [open, setOpen] = useState(null);
  const still = useReducedMotion();
  const items = useMemo(() => paperTimeline(), []);
  const player = usePlayer(items, { hold: LOOP_HOLD_MS, running: !picked });
  const fieldMs = useClock(picked, Boolean(picked));
  const frame = picked ? playAt(fieldMs, { field: picked, still }) : { ...frameAt(items, player.t), focus: null };
  const { name, focus } = frame;
  const p = still && !picked ? 1 : frame.p;
  const pick = (ids, part = null) => player.seek({ ...rangeOf(items, ids, part), ids, part });
  const say = (field, text) => figureSaid(field, text, units.rule);
  const scene = paperScene(name, p, {
    edge: chosen, texts, say, focus,
  });
  const move = moveOf(name);
  const mm = {
    paperThickness: inMm(numberOf(texts.paperThickness), units.rule) ?? 0,
    toolDiameter: inMm(numberOf(texts.toolDiameter), units.rule) ?? 0,
  };
  const code = paperCode(name, chosen, texts, systemNumber(wcs));
  const read = paperReadout(name, chosen, mm);
  const title = t(move.titleKey, { axis: scene.axis });

  const side = chosen !== 'z';
  const groups = namedGroups(PAPER_GROUPS, t, (id) => t(moveOf(id).titleKey, { axis: scene.axis }));
  const sections = PAPER_PARAMS.filter((one) => side || !one.side)
    .map((one) => ({ id: one.id, title: t(one.key), fields: one.fields.filter((field) => fields.includes(field)) }))
    .filter((one) => one.fields.length);
  const uses = name === 'zero' ? ['paperThickness', ...(side ? ['toolDiameter'] : [])] : [];

  const left = (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel">
      <PaperScene {...scene} label={title} className="aspect-[404/188] h-auto max-h-64 w-full @[1800px]/shell:max-h-96" />
      <MoveBar
        groups={groups}
        active={name}
        fills={picked ? fillsAt(items, timeAt(items, name, p), false) : fillsAt(items, player.t)}
        onPick={pick}
        picked={player.mode === 'cycle' ? null : player.range}
        marked={open ? ZERO_MOVE : []}
      />
      <PlayControls paused={player.paused} ended={player.ended} mode={player.mode} locked={Boolean(picked)} onPlay={player.play} onPause={player.pause} onStep={player.step} onMode={player.setMode} />
      <ProbeReadout wcs={wcs} after={read.after} axes={[[read.axis, read.value]]} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line px-3 py-2">
        <span className="min-w-0 text-base font-semibold text-ink">{title}</span>
        <span className="whitespace-nowrap font-num text-cap text-mut">{code}</span>
      </div>
    </div>
  );
  const choice = (
    <SegmentedChoice
      options={EDGES.map((edge) => edge.id)}
      value={chosen}
      onChange={onChoose}
      format={(id) => t(EDGES.find((edge) => edge.id === id).key)}
      label={t('probe.edgeLabel')}
      columns={1}
    />
  );
  const { right, third } = figureColumns({
    wide: wide && Boolean(split),
    sections,
    open,
    onOpen: setOpen,
    texts,
    onText,
    bad,
    onField: setPicked,
    lit: uses,
    intro: (
      <>
        {intro}
        {choice}
      </>
    ),
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

export default PaperParams;
