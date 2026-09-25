import { useState } from 'react';
import Button from './Button';
import CheckButton from './CheckButton';
import CheckSheet from './CheckSheet';
import FilePreview from './FilePreview';
import StatTile from './StatTile';
import { areaText, durationText, toolsText, verdictText, verdictTone } from './fileWords';
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
  const [checking, setChecking] = useState(false);
  const analysis = file.analysis;
  const check = analysis?.check;
  const loaded = isLoaded(machine, file.name);
  const loadable = canLoad(machine);
  const zmin = analysis?.bounds ? t('files.mm', { mm: analysis.bounds.min.z }) : NO_READING;
  let note = '';
  if (loaded) {
    note = t('files.note.loadedStays');
  } else if (!loadable) {
    note = loadNote(machine);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="m-0 break-all font-num text-lead font-semibold text-ink">{file.name}</p>

      <FilePreview name={file.name} mtime={file.mtime} className={phone ? 'aspect-video shrink-0' : 'min-h-0 flex-1'} />
      <p className="m-0 font-num text-note text-mut">{t('files.stat.area')}{' · '}{areaText(analysis?.bounds)}</p>

      <div className="grid shrink-0 grid-cols-2 gap-2">
        <StatTile compact label={t('files.stat.lines')} value={analysis ? analysis.lines : NO_READING} />
        <StatTile compact label={t('files.stat.time')} value={durationText(analysis?.seconds)} />
        <StatTile compact label={t('files.stat.tools')} value={toolsText(analysis?.tools)} />
        <StatTile compact label={t('files.stat.zmin')} value={zmin} />
      </div>

      {/*
        * The two checks: the server's, made when the file is kept, whose
        * verdict opens both results; and the controller's, `$C`, asked for
        * here and kept with the file.
        */}
      <section className="flex shrink-0 flex-col gap-2" aria-label={t('files.check.title')}>
        <span className="text-cap font-semibold uppercase tracking-[0.12em] text-mut">{t('files.check.title')}</span>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label={t('files.check.state')}
            value={verdictText(check)}
            tone={verdictTone(check)}
            onPress={check ? () => setChecking(true) : undefined}
          />
          <CheckButton file={file} machine={machine} busy={busy} />
        </div>
      </section>

      {/* Why a button below is greyed out, with the buttons it is about:
        * one group, the note sitting on them rather than on its own. Two
        * lines are always kept for it, filled from the bottom, so a note
        * coming or going moves nothing. */}
      <div className="flex shrink-0 flex-col gap-1">
        <div className="flex min-h-note2 items-end">
          <p className="m-0 line-clamp-2 text-note text-mut">{note}</p>
        </div>
        <div className="flex gap-2">
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
      </div>

      {checking && check ? <CheckSheet name={file.name} check={check} controllerCheck={file.controllerCheck} onClose={() => setChecking(false)} /> : null}
    </div>
  );
};

export default FileDetails;
