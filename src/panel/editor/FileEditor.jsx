import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button';
import ConfirmSheet from '../ui/ConfirmSheet';
import GcodeEditor from './GcodeEditor';
import { assist } from './assist';
import { fetchWords } from './words';
import DeclareBar from './DeclareBar';
import { missingDeclarations } from './declarations';
import { isLoaded, loadFile, readFile, writeFile } from '../machine/files';
import { t } from '../i18n';

/**
 * A library file's text, to read and to change — the third card on a wide
 * screen and a sheet below it (Mateusz, 2026-09-25).
 *
 * The file in the library is what changes. When that file is the one loaded
 * to be sent, saving asks whether to load it again — a change on disk is not
 * a change in what the sender holds, and a panel that quietly kept cutting
 * the old version after "Save" would be lying about which one runs. While
 * that program is running the file cannot be saved at all: it can be read.
 *
 * After a save the server works out the analysis and the check again, and a
 * `$C` result stops applying by itself (it is keyed on size and time), so
 * nothing here recomputes anything.
 */
const FileEditor = ({ file, machine, className = '' }) => {
  const [text, setText] = useState(null);
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const editor = useRef(null);

  // Read again when the file changes on the server — including after this
  // editor saved it, which is how the text and its checks stay in step.
  // With no file chosen the editor is there and empty, and cannot be typed
  // in (Mateusz, 2026-09-25: *"edytor niech bedzie zawsze ale pusty"*).
  const name = file?.name;
  useEffect(() => {
    let live = true;
    setText(null);
    setFailed(false);
    setDirty(false);
    if (!name) {
      setText('');
      return undefined;
    }
    readFile(name)
      .then(({ data }) => live && setText(data))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [name, file?.mtime]);

  /*
   * The server's words, for the suggestions and the as-you-type check. The
   * editor opens without them if they cannot be had — reading and saving a
   * file does not wait on help with writing it.
   */
  const [words, setWords] = useState(null);
  useEffect(() => {
    let live = true;
    fetchWords().then((got) => live && setWords(got)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  // The machine as it is when a suggestion is asked for, not when the editor
  // was built: read through a ref, so a new status report rebuilds nothing.
  const settings = useRef(machine.settings);
  settings.current = machine.settings;
  // What the server's check says is left undeclared, for the bar over the
  // editor; the units offered are the server's own.
  const units = machine.units?.modal ?? 'G21';
  const [missing, setMissing] = useState([]);
  const help = useMemo(() => {
    if (!words || text === null) {
      return [];
    }
    return assist(words, text.length, {
      machine: () => settings.current,
      units,
      onFindings: (found) => setMissing(missingDeclarations(found, units)),
    });
  }, [words, text, units]);
  const loaded = Boolean(name) && isLoaded(machine, name);
  const running = loaded && (machine.workflow || 'idle') !== 'idle';

  const save = async (reload) => {
    setBusy(true);
    setProblem(null);
    try {
      await writeFile(name, editor.current.text());
      if (reload) {
        await loadFile(name, machine.port);
      }
      setAsking(false);
    } catch (err) {
      setProblem(t('files.editor.failed'));
    } finally {
      setBusy(false);
    }
  };

  let note = null;
  if (running) {
    note = t('files.editor.running');
  } else if (loaded) {
    note = t('files.editor.loaded');
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 ${className}`}>
      {note ? <p className="m-0 text-note text-mut">{note}</p> : null}
      {failed ? <p className="m-0 text-base text-red">{t('files.editor.unreadable')}</p> : null}
      {text === null && !failed ? <p className="m-0 flex-1 text-base text-mut">{t('files.preview.reading')}</p> : null}
      {missing.length && name && !running ? (
        <DeclareBar missing={missing} onInsert={(line) => editor.current?.insertAtHead(line)} />
      ) : null}
      {text === null ? null : (
        <GcodeEditor
          ref={editor}
          initial={text}
          extensions={help}
          readOnly={running || !name}
          onDirty={setDirty}
          label={name ? t('files.editor.label', { name }) : t('files.editor.title')}
        />
      )}
      {problem ? <p role="alert" className="m-0 text-note text-red">{problem}</p> : null}
      <div className="flex shrink-0 gap-2">
        <Button disabled={!dirty || busy} onClick={() => editor.current?.reset()} className="h-ctl flex-1">
          {t('files.editor.revert')}
        </Button>
        <Button
          tone="primary"
          disabled={!dirty || busy || running}
          onClick={() => (loaded ? setAsking(true) : save(false))}
          className="h-ctl flex-1"
        >
          {t('files.editor.save')}
        </Button>
      </div>

      {asking ? (
        <ConfirmSheet
          title={t('files.editor.reload.title')}
          note={t('files.editor.reload.note', { name })}
          confirmLabel={t('files.editor.reload.action')}
          tone="primary"
          busy={busy}
          onConfirm={() => save(true)}
          onClose={() => setAsking(false)}
        />
      ) : null}
    </div>
  );
};

export default FileEditor;
