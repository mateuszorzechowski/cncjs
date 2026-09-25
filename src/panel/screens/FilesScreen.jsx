import { useRef, useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ConfirmSheet from '../ui/ConfirmSheet';
import FadeScroller from '../ui/FadeScroller';
import FileDetails from '../ui/FileDetails';
import FileEditor from '../editor/FileEditor';
import FileRow, { FileColumns } from '../ui/FileRow';
import Meter from '../ui/Meter';
import Notice from '../ui/Notice';
import Sheet from '../ui/Sheet';
import { sizeText } from '../ui/fileWords';
import { useIsPhone, useIsWide } from '../ui/shell';
import { deleteFile, diskLibrary, diskLow, diskUsed, isLoaded, loadFile, reasonOf, writeFile } from '../machine/files';
import { unloadProgram } from '../machine/commands';
import { useFiles } from '../machine/useFiles';
import { t } from '../i18n';

/**
 * The library: programs kept on the server, and the one to cut next.
 *
 * Laid out from the mockup of 2026-09-25 (`Pliki - propozycja`), with the
 * panel's own components: the list on the left and the chosen file on the
 * right on a desk; the list alone on a phone, with the file in a sheet.
 * Settled with Mateusz before code: no SD card and no source switch; the
 * disk's room on the screen, with a warning when it runs short; LOAD greyed
 * out while a program is under way; DELETE asks first and leaves the loaded
 * file alone. Choosing a file never loads it.
 *
 * The list is the server's, re-read on `files:change` — so a file uploaded
 * from the phone appears on the desk, and one copied in by hand appears on
 * both.
 */
const PROGRAMS = '.nc,.gcode,.gc,.ngc,.tap,.cnc,.txt';

// Whole keys, so each one can be found — see the panel's README on keys.
const REFUSALS = {
  'bad-name': 'files.refusal.badName',
  'not-found': 'files.refusal.notFound',
  'no-space': 'files.refusal.noSpace',
  'program-running': 'files.refusal.programRunning',
  failed: 'files.refusal.failed',
};

const QUESTIONS = {
  delete: { titleKey: 'files.confirm.delete.title', noteKey: 'files.confirm.delete.note', actionKey: 'files.confirm.delete.action' },
  replace: { titleKey: 'files.confirm.replace.title', noteKey: 'files.confirm.replace.note', actionKey: 'files.confirm.replace.action' },
};

const DiskRoom = ({ disk }) => {
  if (!disk) {
    return null;
  }
  const low = diskLow(disk);
  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-line pt-3">
      {/*
        * What the rest of the computer uses in grey, cncjs's own files in the
        * accent at the end of it — *"czy tutaj mozemy pokazac tez zajete
        * miejsce przez cnc panel innym kolorem?"* (2026-09-25). Red for the
        * rest when the disk is nearly full, which is the warning below.
        */}
      <Meter
        percent={diskUsed(disk)}
        tone={low ? 'bg-red' : 'bg-mut'}
        part={{ percent: diskLibrary(disk), tone: 'bg-acc' }}
        label={t('files.disk.label')}
      />
      <span className="font-num text-note text-mut">
        {t('files.disk.free', { free: sizeText(disk.free), total: sizeText(disk.total) })}
        {disk.library !== undefined ? (
          <>
            {' · '}
            <span className="mr-1 inline-block size-2 bg-acc" aria-hidden="true" />
            {t('files.disk.library', { size: sizeText(disk.library) })}
          </>
        ) : null}
      </span>
      {low ? <Notice>{t('files.disk.low')}</Notice> : null}
    </div>
  );
};

const FilesScreen = ({ machine }) => {
  const phone = useIsPhone();
  const wide = useIsWide();
  // The editor's sheet, where the screen has no room for it beside the details.
  const [editing, setEditing] = useState(false);
  const { files, disk, loading, error } = useFiles();
  const [chosen, setChosen] = useState(null);
  const [asking, setAsking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const picker = useRef(null);

  const file = files.find((f) => f.name === chosen) || null;

  const act = async (work) => {
    setBusy(true);
    setProblem(null);
    try {
      await work();
    } catch (e) {
      setProblem(t(REFUSALS[reasonOf(e)]));
    } finally {
      setBusy(false);
      setAsking(null);
    }
  };

  const upload = async (picked) => {
    if (!picked) {
      return;
    }
    const data = await picked.text();
    const keep = () => act(async () => {
      await writeFile(picked.name, data);
      setChosen(picked.name);
    });
    if (files.some((f) => f.name === picked.name)) {
      setAsking({ kind: 'replace', name: picked.name, run: keep });
    } else {
      keep();
    }
  };

  const remove = (target) => setAsking({
    kind: 'delete',
    name: target.name,
    run: () => act(async () => {
      await deleteFile(target.name);
      setChosen(null);
    }),
  });

  const load = (target) => act(() => loadFile(target.name, machine.port));

  const edit = wide ? null : () => setEditing(true);
  const details = file
    ? <FileDetails file={file} machine={machine} phone={phone} busy={busy} onLoad={load} onUnload={unloadProgram} onDelete={remove} onEdit={edit} />
    : null;

  return (
    <div className="flex min-h-0 flex-1 gap-gap">
      <Card
        label={t('files.title')}
        aside={(
          <Button className="h-chiph px-4" disabled={busy} onClick={() => picker.current?.click()}>
            {t('files.upload')}
          </Button>
        )}
        className="min-h-0 flex-1"
        bodyClassName="gap-3"
      >
        <input
          ref={picker}
          type="file"
          accept={PROGRAMS}
          aria-label={t('files.upload')}
          className="hidden"
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {problem ? <p role="alert" className="m-0 text-note text-red">{problem}</p> : null}
        {error ? <p className="m-0 text-note text-red">{t('files.refusal.failed')}</p> : null}

        {!loading && !error && files.length === 0 ? (
          <p className="m-0 flex-1 py-3 text-note text-mut">{t('files.empty')}</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-ctl border border-line">
            {phone ? null : (
              <FileColumns />
            )}
            <FadeScroller className="min-h-0 flex-1">
              {files.map((f) => (
                <FileRow
                  key={f.name}
                  file={f}
                  phone={phone}
                  chosen={f.name === chosen}
                  loaded={isLoaded(machine, f.name)}
                  onChoose={setChosen}
                />
              ))}
            </FadeScroller>
          </div>
        )}

        <DiskRoom disk={disk} />
      </Card>

      {phone ? null : (
        <Card label={t('files.selected')} className="min-h-0 w-side shrink-0" bodyClassName="gap-3">
          {/* With nothing chosen the card holds its place with the hint in its
            * middle, rather than one line at the top of an empty card. */}
          {details || (
            <div className="flex flex-1 items-center justify-center px-pad">
              <p className="m-0 text-center text-base text-mut">{t('files.none')}</p>
            </div>
          )}
        </Card>
      )}

      {/*
        * The file's text, on a screen wide enough to keep it open beside the
        * details — list, details, text — with the list giving up the room.
        */}
      {/*
        * Always there on a wide screen, like the details beside it — with no
        * file chosen it says so the same way, rather than the list growing
        * into its place and shrinking back when a file is picked.
        */}
      {wide ? (
        <Card label={t('files.editor.title')} className="min-h-0 flex-1" bodyClassName="gap-3">
          {file ? <FileEditor file={file} machine={machine} /> : (
            <div className="flex flex-1 items-center justify-center px-pad">
              <p className="m-0 text-center text-base text-mut">{t('files.none')}</p>
            </div>
          )}
        </Card>
      ) : null}

      {!wide && file && editing ? (
        <Sheet title={t('files.editor.title')} onClose={() => setEditing(false)}>
          <FileEditor file={file} machine={machine} className="h-[32rem]" />
        </Sheet>
      ) : null}

      {/* One sheet at a time: the question stands in for the file while it is asked. */}
      {phone && file && !asking ? (
        <Sheet title={t('files.selected')} onClose={() => setChosen(null)}>{details}</Sheet>
      ) : null}

      {asking ? (
        <ConfirmSheet
          // The name in the sentence, not the title: a sheet's title is set
          // in capitals, and a file name's case is part of the name.
          title={t(QUESTIONS[asking.kind].titleKey)}
          note={t(QUESTIONS[asking.kind].noteKey, { name: asking.name })}
          confirmLabel={t(QUESTIONS[asking.kind].actionKey)}
          busy={busy}
          onConfirm={asking.run}
          onClose={() => setAsking(null)}
        />
      ) : null}
    </div>
  );
};

export default FilesScreen;
