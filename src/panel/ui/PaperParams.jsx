import { useMemo, useState } from 'react';
import MoveBar, { namedGroups } from './MoveBar';
import PaperScene from './PaperScene';
import PlayControls from './PlayControls';
import ProbeReadout from './ProbeReadout';
import { surfaceSection } from './SurfaceChoice';
import { figureColumns } from './ProbeSections';
import { useReducedMotion } from './useClock';
import useSetupPlayer from './useSetupPlayer';
import { figureSaid } from '../machine/probeFields';
import {
  LOOP_HOLD_MS, PAPER_GROUPS, PAPER_PARAMS, moveOf, paperCode, paperReadout, paperScene, paperTimeline, playAt,
} from '../machine/paperCycle';
import { fillsAt, timeAt } from '../machine/timeline';
import { inMm } from '../machine/units';
import { SURFACE, surfaceShifts } from '../machine/surface';
import { useIsWide } from './shell';
import { useUnits } from './units';
import { t } from '../i18n';
import { DRAWING_FIT } from './probeDraw';

const numberOf = (text) => Number(String(text).replace(',', '.'));

// The moves each figure changes: the zero, and the lift after it.
const MOVED_BY = {
  paperThickness: 'zero', toolDiameter: 'zero', stockThickness: 'zero', paperLift: 'lift',
};

// The coordinate system's number in G10 L20 P…: G54 is 1.
const systemNumber = (wcs) => (Number(String(wcs || 'G54').slice(1)) || 54) - 53;

/**
 * The paper's Setup, laid out as the Z plate's (`ZPlateParams`): the drawing
 * large with its bar and player, the readout, the move's name with its line;
 * beside it the instruction and the figures — the tool's diameter only for
 * a side, where the zero is its radius away.
 *
 * `chosen` is the surface, picked on the step before (`PaperChooser`).
 */
const PaperParams = ({
  fields, texts, onText, bad, wcs, chosen = 'z', surface = SURFACE, onSurface = () => {}, intro = null, note = null, split = null,
}) => {
  const units = useUnits();
  const wide = useIsWide();
  const [open, setOpen] = useState(null);
  const still = useReducedMotion();
  const items = useMemo(() => paperTimeline(), []);
  const {
    player, picked, loop, frame, p: shownP, onField, pick,
  } = useSetupPlayer({
    items, hold: LOOP_HOLD_MS, playAt, still,
  });
  const { name, focus } = frame;
  const p = shownP;
  const say = (field, text) => figureSaid(field, text, units.rule);
  const scene = paperScene(name, p, {
    edge: chosen, texts, say, focus, surface,
  });
  const move = moveOf(name);
  const mm = {
    paperThickness: inMm(numberOf(texts.paperThickness), units.rule) ?? 0,
    toolDiameter: inMm(numberOf(texts.toolDiameter), units.rule) ?? 0,
    stockThickness: inMm(numberOf(texts.stockThickness), units.rule) ?? 0,
  };
  const code = paperCode(name, chosen, texts, systemNumber(wcs), surface);
  const read = paperReadout(name, chosen, mm, surface);
  const title = t(move.titleKey, { axis: scene.axis });

  const side = chosen !== 'z';
  // On the top, Z0 may go on the table: the work's thickness asked for while it is apart.
  const shifts = !side && surfaceShifts(surface);
  const groups = namedGroups(PAPER_GROUPS, t, (id) => t(moveOf(id).titleKey, { axis: scene.axis }));
  const sections = PAPER_PARAMS.filter((one) => (side || !one.side) && (!side || !one.top))
    .map((one) => (one.surface
      ? surfaceSection(one, fields, surface, onSurface)
      : { id: one.id, title: t(one.key), fields: one.fields.filter((field) => fields.includes(field)) }))
    .filter((one) => one.fields.length || one.head);
  const usable = ['paperThickness', 'paperLift', ...(side ? ['toolDiameter'] : []), ...(shifts ? ['stockThickness'] : [])];
  const uses = usable.filter((field) => MOVED_BY[field] === name);
  const openGroup = PAPER_PARAMS.find((one) => one.id === open);
  const marks = openGroup ? [...new Set([...openGroup.fields.map((field) => MOVED_BY[field]), ...(openGroup.surface ? ['zero'] : [])])] : [];

  const left = (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel">
      <PaperScene {...scene} label={title} className={`aspect-[404/188] h-auto w-full ${DRAWING_FIT}`} />
      <MoveBar
        groups={groups}
        active={name}
        fills={loop ? fillsAt(items, timeAt(items, name, p), false) : fillsAt(items, player.t)}
        onPick={pick}
        picked={player.mode === 'cycle' ? null : player.range}
        // The moves a figure acts in: the one being set, or else the open group's (review note, 2026-10-01).
        marked={picked ? [MOVED_BY[picked]] : marks}
      />
      <PlayControls paused={player.paused} ended={player.ended} mode={player.mode} locked={loop} onPlay={player.play} onPause={player.pause} onStep={player.step} onMode={player.setMode} />
      <ProbeReadout wcs={wcs} after={read.after} axes={[[read.axis, read.value]]} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line px-3 py-2">
        <span className="min-w-0 text-base font-semibold text-ink">{title}</span>
        <span className="whitespace-nowrap font-num text-cap text-mut">{code}</span>
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
    lit: uses,
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

export default PaperParams;
