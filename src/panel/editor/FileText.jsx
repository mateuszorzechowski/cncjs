import { useEffect, useState } from 'react';
import GcodeEditor from './GcodeEditor';
import { readFile } from '../machine/files';
import { t } from '../i18n';

/**
 * A file's text to read, not to change — the phone's page of it (Mateusz,
 * 2026-09-25: *"tylko do podglądu"*). The same editor as on the desk, read
 * only: its line numbers, its colours, its search.
 */
const FileText = ({ file }) => {
  const [text, setText] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setText(null);
    setFailed(false);
    readFile(file.name)
      .then(({ data }) => live && setText(data))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [file.name, file.mtime]);

  if (failed) {
    return <p className="m-0 text-base text-red">{t('files.editor.unreadable')}</p>;
  }
  if (text === null) {
    return <p className="m-0 text-base text-mut">{t('files.preview.reading')}</p>;
  }
  return <GcodeEditor initial={text} readOnly label={t('files.editor.label', { name: file.name })} />;
};

export default FileText;
