import { useEffect, useMemo, useState } from 'react';
import { askGrid, mapAsk } from '../machine/probe';
import { readToolpath } from '../machine/toolpath';
import { settingFigure } from '../machine/units';

const MAP = 'height-map';

// How the area is given (Mateusz, 2026-10-02): a corner and a size, a centre and a size, two corners, or the program's extent.
export const AREA_MODES = ['point', 'centre', 'corners', 'program'];

/**
 * The height map's area and grid as the operator gives them, and the grid
 * the server would measure (`grid`, its rule): the step between the points
 * is its answer, shown, not typed.
 *
 * `asked` is what goes to the server and to a device that joins the
 * wizard; `join(options)` takes the one asked on the device it was begun on.
 */
const useHeightMapAsk = ({ machine, method, rule }) => {
  const outline = useMemo(() => readToolpath(machine.gcode)?.bounds ?? null, [machine.gcode]);
  // A length in the server's units, as a field starts with it.
  const said = (mm) => String(Number(settingFigure(mm, 'length', rule).value));
  const [mode, setMode] = useState(null);
  const [texts, setTexts] = useState({});
  const [joined, setJoined] = useState(null);
  const [grid, setGrid] = useState(null);

  // Picked the first time: the program's extent when one is loaded, else a 50 mm square at the zero; four points each way.
  useEffect(() => {
    if (method?.id === MAP && !mode) {
      setMode(outline ? 'program' : 'point');
      setTexts({
        x: '0', y: '0', cx: '0', cy: '0', w: said(50), d: said(50), nx: '4', ny: '4',
      });
    }
  }, [method?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const program = outline ? {
    px0: said(outline.min.x), px1: said(outline.max.x), py0: said(outline.min.y), py1: said(outline.max.y),
  } : {};
  // Two corners: nothing to ask until both are taken.
  const waiting = mode === 'corners' && ['ax', 'ay', 'bx', 'by'].some((name) => texts[name] === undefined);
  const own = mode && !waiting ? mapAsk({ ...texts, ...program }, mode) : null;
  const asked = joined || own;

  const onText = (name, text) => {
    setJoined(null);
    setTexts((now) => ({ ...now, [name]: text }));
  };

  /** A point where the tool stands, into the two fields named. */
  const take = (xName, yName) => {
    const { x, y } = machine.position || {};
    if (Number.isFinite(x) && Number.isFinite(y)) {
      onText(xName, said(x));
      onText(yName, said(y));
    }
  };

  useEffect(() => {
    if (method?.id !== MAP || !asked) {
      setGrid(null);
      return undefined;
    }
    let live = true;
    const timer = setTimeout(() => {
      askGrid(asked, rule).then((answer) => {
        if (live) {
          setGrid(answer);
        }
      });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [method?.id, JSON.stringify(asked), rule?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    mode,
    setMode: (next) => {
      setJoined(null);
      setMode(next);
    },
    texts,
    onText,
    take,
    outline,
    program,
    asked,
    // What a measurement is asked with besides its choice: the area, for the height map alone.
    area: method?.asks ? asked : null,
    grid,
    waiting,
    // Measurable: the server has said the grid is one it would measure.
    ready: Boolean(grid && !grid.reason),
    join: setJoined,
  };
};

export default useHeightMapAsk;
