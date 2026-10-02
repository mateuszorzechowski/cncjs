import { useMemo, useState } from 'react';
import MoveBar, { namedGroups } from './MoveBar';
import PlayControls from './PlayControls';
import ProbeReadout from './ProbeReadout';
import { surfaceSection } from './SurfaceChoice';
import { figureColumns } from './ProbeSections';
import ZPlateScene from './ZPlateScene';
import { useReducedMotion } from './useClock';
import useSetupPlayer from './useSetupPlayer';
import { figureSaid } from '../machine/probeFields';
import {
  LOOP_HOLD_MS, PLATE_GROUPS, PLATE_ORDER, PLATE_PARAMS, moveOf, plateCode, plateExplain, plateReadout, plateScene, plateTimeline, playAt,
} from '../machine/probeCycle';
import { fillsAt, timeAt } from '../machine/timeline';
import { inMm } from '../machine/units';
import { SURFACE, surfaceShifts } from '../machine/surface';
import { useIsWide } from './shell';
import { useUnits } from './units';
import { t } from '../i18n';

const numberOf = (text) => Number(String(text).replace(',', '.'));
const NBSP = ' ';

// The one axis the plate measures, named in its readout.
const Z_AXIS = 'z';

// The move a figure's own loop plays, as the bar names it.
const BAR_OF = { miss: 'fast' };

// The coordinate system's number in G10 L20 P…: G54 is 1.
const systemNumber = (wcs) => (Number(String(wcs || 'G54').slice(1)) || 54) - 53;

/**
 * The Z plate's Setup (Claude Design, `templates/probe-z-proposal`,
 * 2026-09-30): the drawing large, one bar of its moves under it and a
 * player's controls — see `machine/player` — the tool's Z before and after the zero, and the move's name with
 * its G-code; beside it the instruction and the figures by what they are
 * about, those the move playing uses lit. A group opens to set its figures
 * (Mateusz: *"grupa jak teraz"*); the figure being set loops the move it
 * changes, its part of the drawing lit.
 *
 * `split(left, right)`, wide: the screen lays the drawing and the figures out
 * as cards of their own.
 */
const ZPlateParams = ({
  fields, texts, onText, bad, wcs, surface = SURFACE, onSurface = () => {}, intro = null, note = null, split = null,
}) => {
  const shifts = surfaceShifts(surface);
  const units = useUnits();
  const wide = useIsWide();
  const [open, setOpen] = useState(null);
  const still = useReducedMotion();
  const group = PLATE_PARAMS.find((one) => one.id === open);
  // The cycle on the player's clock; a figure being set plays its own loop meanwhile, and the player waits.
  const items = useMemo(() => plateTimeline(), []);
  const {
    player, picked, loop, frame, p: shownP, onField, pick,
  } = useSetupPlayer({
    items, hold: LOOP_HOLD_MS, playAt, still,
  });
  const { name, focus } = frame;
  const p = shownP;
  const say = (field, text) => figureSaid(field, text, units.rule);
  const scene = plateScene(name, p, {
    texts, say, upTo: (v) => t('probe.cycle.upTo', { v }), focus, surface,
  });
  const move = moveOf(name);
  const code = plateCode(name, texts, systemNumber(wcs), surface);
  const mm = {
    plateThickness: inMm(numberOf(texts.plateThickness), units.rule) ?? 0,
    stockThickness: inMm(numberOf(texts.stockThickness), units.rule) ?? 0,
  };
  const read = plateReadout(name, mm, surface);
  const title = t(move.titleKey, { t: say('plateThickness', texts.plateThickness ?? '') });
  // Where the move's figure comes from, when it is not one field's (rule 1, Mateusz 2026-10-02).
  const why = plateExplain(name, texts, say);

  const groups = namedGroups(PLATE_GROUPS, t, (id) => t(moveOf(id).titleKey, { t: '' }));
  const sections = PLATE_PARAMS
    .map((one) => (one.surface
      ? surfaceSection(one, fields, surface, onSurface)
      : { id: one.id, title: t(one.key), fields: one.fields.filter((field) => fields.includes(field)) }))
    .filter((one) => one.fields.length || one.head);

  const left = (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel">
      <div className="relative">
        {/*
          * As tall as the corner's Setup drawing at any width (review notes, 2026-09-30): the shape of its two views side
          * by side (202 × 188 each) and the same caps, so one screen scrolls exactly when the other does.
          */}
        <ZPlateScene {...scene} label={title} className="aspect-[404/188] h-auto max-h-64 w-full @[1800px]/shell:max-h-96" />
      </div>
      <MoveBar
        groups={groups}
        active={BAR_OF[name] || name}
        fills={loop ? fillsAt(items, timeAt(items, BAR_OF[name] || name, p), false) : fillsAt(items, player.t)}
        onPick={pick}
        picked={player.mode === 'cycle' ? null : player.range}
        // The moves a figure acts in: the one being set, or else the open group's (review note, 2026-10-01).
        marked={picked || group ? PLATE_ORDER.filter((id) => moveOf(id).uses.some((use) => (picked ? use === picked : group.fields.includes(use)))) : []}
      />
      <PlayControls paused={player.paused} ended={player.ended} mode={player.mode} locked={loop} onPlay={player.play} onPause={player.pause} onStep={player.step} onMode={player.setMode} />
      <ProbeReadout wcs={wcs} after={read.after} axes={[[Z_AXIS, read.z]]} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line px-3 py-2">
        <span className="min-w-0 text-base font-semibold text-ink">{title}</span>
        <span className="whitespace-nowrap font-num text-cap text-mut">{code}</span>
        {/* Its line kept when empty, so the caption does not jump (review note #9, 2026-10-02). */}
        <span className="w-full text-note text-mut">{why ? t(...why) : NBSP}</span>
      </div>
    </div>
  );
  // The work's thickness lit with the zero it moves.
  const lit = name === 'zero' && shifts ? [...move.uses, 'stockThickness'] : move.uses;
  const { right, third } = figureColumns({
    wide: wide && Boolean(split),
    sections,
    open,
    onOpen: setOpen,
    texts,
    onText,
    bad,
    onField,
    lit,
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

export default ZPlateParams;
