import Button from './Button';
import FilePreview from './FilePreview';
import StatTile from './StatTile';
import { areaText, durationText, toolsText } from './fileWords';
import { canLoad, isLoaded } from '../machine/files';
import { NO_READING } from '../machine/readings';
import { t } from '../i18n';

/**
 * The chosen file: its drawing, its numbers, and what can be done with it.
 *
 * Every number is the server's `analysis` (Mateusz: the panel computes
 * nothing); a file whose analysis is not in yet shows dashes until
 * `files:change` brings it. LOAD is the only thing that makes a file the
 * program — choosing it does not — and it is greyed out, with the reason,
 * whenever the server would refuse it. The loaded file cannot be deleted
 * from here.
 */
const loadNote = (machine) => {
  if (!machine.connected) {
    return t('files.note.notConnected');
  }
  return t('files.note.programRunning');
};

const FileDetails = ({ file, machine, phone = false, busy = false, onLoad, onDelete }) => {
  const analysis = file.analysis;
  const loaded = isLoaded(machine, file.name);
  const loadable = canLoad(machine);
  const zmin = analysis?.bounds ? t('files.mm', { mm: analysis.bounds.min.z }) : NO_READING;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="m-0 break-all font-num text-lead font-semibold text-ink">{file.name}</p>

      <FilePreview name={file.name} mtime={file.mtime} className={phone ? 'aspect-video shrink-0' : 'min-h-0 flex-1'} />
      <p className="m-0 font-num text-note text-mut">{t('files.stat.area')}{' · '}{areaText(analysis?.bounds)}</p>

      <div className="grid shrink-0 grid-cols-2 gap-2">
        <StatTile label={t('files.stat.lines')} value={analysis ? analysis.lines : NO_READING} />
        <StatTile label={t('files.stat.time')} value={durationText(analysis?.seconds)} />
        <StatTile label={t('files.stat.tools')} value={toolsText(analysis?.tools)} />
        <StatTile label={t('files.stat.zmin')} value={zmin} />
      </div>

      <div className="flex shrink-0 gap-2">
        <Button className="h-ctl px-4" disabled={loaded || busy} onClick={() => onDelete(file)}>
          {t('files.delete')}
        </Button>
        {loaded ? (
          <Button tone="soft" className="h-ctl flex-1" aria-disabled>{t('files.loaded')}</Button>
        ) : (
          <Button tone="primary" className="h-ctl flex-1" disabled={!loadable || busy} onClick={() => onLoad(file)}>
            {t('files.load')}
          </Button>
        )}
      </div>
      {loaded ? <p className="m-0 text-note text-mut">{t('files.note.loadedStays')}</p> : null}
      {!loaded && !loadable ? <p className="m-0 text-note text-mut">{loadNote(machine)}</p> : null}
    </div>
  );
};

export default FileDetails;
