import { IconBar } from 'cncjs';
import { useState } from 'react';

// The Path screen's menu, on the drawing: the four views (one lit), the frame
// button, then the five layers — groups separated by a rule. Each button keeps
// its name as aria-label and tooltip.
const VIEWS = [['iso', 'IZO'], ['top', 'GÓRA'], ['front', 'PRZÓD'], ['right', 'BOK']];
const LAYERS = [
  ['path', 'path', 'Program · Tor'],
  ['programArea', 'area', 'Program · Obszar'],
  ['wcsAxes', 'axes', 'Układ · Osie'],
  ['machineArea', 'machine', 'Maszyna · Obszar'],
  ['machineAxes', 'machineAxes', 'Maszyna · Osie'],
];

const groupsFor = ({ view, layers, onView, onLayers, program = true, envelope = true }) => [
  {
    label: 'Rzut',
    items: VIEWS.map(([id, label]) => ({
      id, icon: id, label, pressed: id === view, onSelect: () => onView(id),
    })),
  },
  {
    label: 'Kadr',
    items: [{
      id: 'fit',
      icon: 'fit',
      label: 'Wypełnij kadr obiektem',
      note: program ? '' : 'Nie wczytano programu',
      disabled: !program,
      onSelect: () => {},
    }],
  },
  {
    label: 'Warstwy',
    items: LAYERS.map(([id, icon, label]) => {
      const off = (!program && (id === 'path' || id === 'programArea'))
        || (!envelope && id === 'machineArea');
      return {
        id,
        icon,
        label,
        note: off ? (program ? 'Sterownik nie podał zakresu ruchu ($130–$132)' : 'Nie wczytano programu') : '',
        pressed: Boolean(layers[id]) && !off,
        disabled: off,
        onSelect: () => onLayers({ ...layers, [id]: !layers[id] }),
      };
    }),
  },
];

// Over the drawing, as PathStage places it.
const Stage = ({ children }) => (
  <div className="relative h-[32rem] w-[360px] rounded-card border border-line bg-field">
    {children}
  </div>
);

export const ProgramLoaded = () => {
  // A program loaded: isometric view lit, the program's layers on.
  // Telefon / tablet / PC: same look on every device, always in the top-right corner over the drawing; it appears on the Path screen at every width (on a phone reached from the pulled-up NavTabs grid) and on the Jog screen's path preview on a tablet/PC only.
  const [view, setView] = useState('iso');
  const [layers, setLayers] = useState({ path: true, programArea: true, wcsAxes: true, machineArea: true, machineAxes: false });
  return (
    <Stage>
      <IconBar className="absolute right-2 top-2" groups={groupsFor({ view, layers, onView: setView, onLayers: setLayers })} />
    </Stage>
  );
};

export const TopView = () => {
  // Top view chosen, only the path and the work axes shown.
  const [view, setView] = useState('top');
  const [layers, setLayers] = useState({ path: true, programArea: false, wcsAxes: true, machineArea: false, machineAxes: false });
  return (
    <Stage>
      <IconBar className="absolute right-2 top-2" groups={groupsFor({ view, layers, onView: setView, onLayers: setLayers })} />
    </Stage>
  );
};

export const NoProgram = () => {
  // Nothing loaded and no envelope from the controller: the frame button and
  // the layers with nothing to draw are dark.
  const [view, setView] = useState('iso');
  const [layers, setLayers] = useState({ path: true, programArea: true, wcsAxes: true, machineArea: true, machineAxes: true });
  return (
    <Stage>
      <IconBar
        className="absolute right-2 top-2"
        groups={groupsFor({ view, layers, onView: setView, onLayers: setLayers, program: false, envelope: false })}
      />
    </Stage>
  );
};
