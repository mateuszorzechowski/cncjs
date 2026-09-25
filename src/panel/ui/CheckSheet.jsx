import Sheet from './Sheet';
import { issueText, issueWhere, verdictNote } from './fileWords';
import { t } from '../i18n';

/**
 * What the server's check found in a file, one line per problem.
 *
 * Each problem is said once, at its first line, with how often it comes —
 * the server groups them, so a program with three hundred `G41`s is one
 * line here, not a list to scroll. The word is the file's own (`G41`, `H`),
 * so it goes as it is; what it means is the panel's.
 */
const TONES = { incompatible: 'text-red', warning: 'text-amb' };

const CheckSheet = ({ name, check, onClose }) => (
  <Sheet title={t('files.check.sheet')} onClose={onClose}>
    <p className="m-0 break-all font-num text-note text-mut">{name}</p>
    <p className="m-0 text-base text-ink">{verdictNote(check)}</p>
    {check.issues.length > 0 ? (
      <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
        {check.issues.map((issue) => (
          <li key={`${issue.code} ${issue.word}`} className="flex flex-col gap-0.5 py-2">
            <span className={`text-base ${TONES[issue.severity] || 'text-ink'}`}>{issueText(issue)}</span>
            <span className="font-num text-note text-mut">{issueWhere(issue)}</span>
          </li>
        ))}
      </ul>
    ) : null}
  </Sheet>
);

export default CheckSheet;
