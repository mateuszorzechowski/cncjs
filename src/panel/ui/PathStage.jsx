import HazardFrame from './HazardFrame';
import Scene from '../scene/Scene';
import StageOptions from './StageOptions';
import StageReadout from './StageReadout';
import { layerItems, viewItems } from './stageItems';
import { t } from '../i18n';

/**
 * The toolpath, with its menu on it.
 *
 * There was a second shape for the preview beside the jog keys, from when the
 * difference was a labelled column of chips against no chips at all. Once the
 * menu became icons on the drawing the two were the same component with the
 * same controls at different sizes, and the only thing left between them was
 * whether the screen's warnings are shown — which is a list that is sometimes
 * empty, not a shape.
 *
 * **The menu sits on the drawing rather than beside it**, and that is what
 * lets the drawing have the whole card. A column of labelled chips cost about
 * a fifth of the width; the same nine choices as glyphs cost thirty pixels
 * down one edge, and the grid underneath now fills what is left with a floor
 * rather than with nothing — which is what made the column worth spending in
 * the first place.
 *
 * Every button keeps its name as a label and a tooltip, and the layer names
 * carry the heading the chips used to print above them — "Maszyna · Obszar"
 * rather than two buttons both called "Obszar" and no way to tell which is
 * which.
 */

const PathStage = ({
  scene, tool, view, onView, revision, layers, sections, onLayers, notes, memory,
  onFit, fit, free, onFree, target, onPick, onCancel, onGoToPoint, canGoToPoint, goNote,
  clickDrives, onClickDrives, picking, hover, onHover, offset, progress,
}) => (
  <>
    {/* **Hazard tape round the whole drawing while a click will move the
      * machine.** The button that switches it on is 24px in a corner; what is
      * about to be clicked is the rest of the card, so that is where the
      * warning belongs. The crosshair says the same thing at the pointer,
      * which is the other place somebody is looking.
      *
      * The wrapper exists only to hang the tape on: it has no overflow of its
      * own, so a band sitting outside the preview is not clipped by the very
      * frame it is warning about. */}
    <div className="relative flex min-h-0 flex-1 flex-col">
      {clickDrives ? <HazardFrame /> : null}

      {/* The canvas is a raw WebGL surface with square corners; the card's
        * own rounding stops at its padding, so the frame and the clipping are
        * here. `relative`, because the menu is positioned against it. */}
      <div
        // What the frame keeps clear of is found inside this (`scene/insets`).
        data-stage=""
        className={[
          'relative min-h-0 flex-1 overflow-hidden rounded-ctl border',
          // No second edge inside the tape: one warning, one line.
          clickDrives ? 'border-transparent cursor-crosshair' : 'border-line',
        ].join(' ')}
      >
      <Scene
        scene={scene}
        tool={tool}
        layers={layers}
        view={view}
        revision={revision}
        memory={memory}
        fit={fit}
        onFree={onFree}
        target={picking ? target : null}
        onPick={onPick}
        onCancel={onCancel}
        onHover={onHover}
        picking={picking}
        progress={progress}
      />

      {picking ? (
      <StageReadout
        hover={hover}
        point={target}
        offset={offset}
        onGo={onGoToPoint}
        canGo={canGoToPoint}
        note={goNote}
        clickDrives={clickDrives}
        onClickDrives={onClickDrives}
      />
      ) : null}

      {/* A column of glyphs on a PC, a button and a sheet below it — see `StageOptions`. */}
      <StageOptions
        groups={[
          { label: t('stage.view'), items: viewItems(view, onView, free), closes: true },
          /*
           * Its own group, below the views and above the layers, because it
           * is neither. The views are four destinations and exactly one of
           * them is lit; the layers are five switches. This is a button that
           * happens once and stays lit for nothing — carrying no `pressed` at
           * all, so it renders without `aria-pressed` and is announced as the
           * action it is rather than as a switch that will not stay on.
           */
          {
            label: t('stage.frame'),
            onDrawing: true,
            items: [{
              id: 'fit',
              icon: 'fit',
              label: t('stage.fit'),
              note: scene.program ? '' : t('path.layers.noProgram'),
              disabled: !scene.program,
              onSelect: onFit,
            }],
          },
          { label: t('stage.layers'), icon: 'layers', items: layerItems(sections, layers, onLayers) },
        ]}
      />
      </div>
    </div>

    {/* What the scene cannot be sure of. Under the drawing rather than over
      * it: worth reading once, then ignorable. */}
    {notes.length > 0 ? (
      <ul className="m-0 mt-3 flex shrink-0 list-none flex-col gap-1 p-0 text-note text-mut">
        {notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    ) : null}
  </>
);

export default PathStage;
