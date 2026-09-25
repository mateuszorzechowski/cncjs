import { modifiedText, sizeText } from './fileWords';
import { t } from '../i18n';

/**
 * One file in the library list.
 *
 * On a desk, a row of columns under the list's own heading (`FileColumns`);
 * on a phone, the name with its size and date beneath, as the mockup draws
 * both. Choosing a row does not load it — that is the details' LOAD.
 */

// The mockup's columns: the name takes what is left. Fixed, not `auto`: the
// header is a grid of its own, and two auto grids size their columns apart.
export const COLUMNS = 'grid grid-cols-[minmax(0,1fr)_var(--fsize)_var(--fdate)] items-center gap-x-4';

export const FileColumns = () => (
  <div className={`${COLUMNS} border-b border-line bg-field px-4 py-2 text-cap font-semibold uppercase tracking-[0.12em] text-mut`}>
    <span>{t('files.column.name')}</span>
    <span className="text-right">{t('files.column.size')}</span>
    <span className="text-right">{t('files.column.modified')}</span>
  </div>
);

const FileRow = ({ file, chosen, loaded, phone, onChoose }) => (
  <button
    type="button"
    aria-pressed={chosen}
    onClick={() => onChoose(file.name)}
    className={[
      'w-full border-b border-line px-4 text-left font-num transition-colors',
      phone ? 'flex min-h-ctl flex-col justify-center gap-1 py-2' : `${COLUMNS} h-ctl`,
      chosen ? 'bg-accS text-acc' : 'bg-panel text-ink hover:bg-field',
    ].join(' ')}
  >
    <span className={`flex min-w-0 items-center gap-2 text-base ${chosen ? 'font-semibold' : ''}`}>
      <span className="truncate">{file.name}</span>
      {loaded ? (
        <span className="shrink-0 rounded-ctl border border-acc px-1.5 text-cap font-semibold uppercase tracking-[0.08em] text-acc">
          {t('files.loaded')}
        </span>
      ) : null}
    </span>
    {phone ? (
      <span className={`text-note ${chosen ? '' : 'text-mut'}`}>
        {sizeText(file.size)}{' · '}{modifiedText(file.mtime)}
      </span>
    ) : (
      <>
        <span className={`text-right text-note ${chosen ? '' : 'text-mut'}`}>{sizeText(file.size)}</span>
        <span className={`text-right text-note ${chosen ? '' : 'text-mut'}`}>{modifiedText(file.mtime)}</span>
      </>
    )}
  </button>
);

export default FileRow;
