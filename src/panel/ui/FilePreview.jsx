import { useEffect, useMemo, useRef, useState } from 'react';
import Scene from '../scene/Scene';
import { composeScene } from '../scene/compose';
import { DEFAULT_VIEW } from '../scene/views';
import { readFile } from '../machine/files';
import { readToolpath } from '../machine/toolpath';
import { t } from '../i18n';

/**
 * A file's toolpath, before it is loaded.
 *
 * The same scene and the same parse as the Ścieżka screen — Mateusz's call
 * on 2026-09-25: drawing stays in the panel, numbers come from the server.
 * Only the path: no machine, no work offset, no tool, since the file is not
 * on the machine yet and nothing about where it will be cut is known.
 *
 * Keyed on the file's time as well as its name, so a file replaced under the
 * same name is drawn again.
 */
const LAYERS = { path: true };
const AT_ZERO = { x: 0, y: 0, z: 0 };

/*
 * It can be turned and zoomed, and goes back by itself (Mateusz,
 * 2026-09-25): after this long untouched it glides home to the isometric
 * framing, so the next file is always first seen the same way.
 */
const IDLE_MS = 4000;
const GLIDE_MS = 700;

const FilePreview = ({ name, mtime, className = '' }) => {
  const [program, setProgram] = useState(null);
  const [failed, setFailed] = useState(false);
  // Each bump is a press of the view: back to the framing.
  const [home, setHome] = useState(0);
  const idle = useRef(null);

  const hold = () => clearTimeout(idle.current);
  const release = () => {
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setHome((n) => n + 1), IDLE_MS);
  };
  useEffect(() => () => clearTimeout(idle.current), []);

  useEffect(() => {
    let live = true;
    setProgram(null);
    setFailed(false);
    readFile(name)
      .then(({ data }) => live && setProgram({ name, gcode: data }))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [name, mtime]);

  const toolpath = useMemo(() => readToolpath(program), [program]);
  const scene = useMemo(() => composeScene({
    settings: null, envelope: null, wcs: null, offset: AT_ZERO, toolpath, layers: LAYERS,
  }), [toolpath]);

  let note = null;
  if (failed) {
    note = t('files.preview.failed');
  } else if (!program) {
    note = t('files.preview.reading');
  } else if (!toolpath) {
    note = t('files.preview.none');
  }

  return (
    <div className={`relative min-h-0 overflow-hidden rounded-ctl border border-line bg-field ${className}`}>
      {toolpath ? (
        <Scene
          scene={scene}
          layers={LAYERS}
          view={DEFAULT_VIEW}
          revision={`${name}:${home}`}
          memory="files"
          fit={0}
          onFree={release}
          onGrab={hold}
          glideMs={GLIDE_MS}
        />
      ) : (
        <p className="m-0 flex h-full items-center justify-center p-3 text-center font-num text-note text-mut">{note}</p>
      )}
    </div>
  );
};

export default FilePreview;
