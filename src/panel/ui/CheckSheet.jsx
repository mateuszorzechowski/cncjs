import Sheet from './Sheet';
import { checkedAtText, controllerSummary, issueText, issueWhere, verdictNote } from './fileWords';
import { GRBL_ALARM_KEYS, GRBL_ERROR_KEYS } from '../machine/journalWords';
import { t } from '../i18n';

/**
 * What the checks found in a file: the server's, one line per problem, and
 * under it the controller's `$C`, when there has been one.
 *
 * Each problem is said once, at its first line, with how often it comes —
 * the server groups them, so a program with three hundred `G41`s is one
 * line here, not a list to scroll. The word is the file's own (`G41`, `H`),
 * so it goes as it is; what it means is the panel's. The controller's errors
 * are Grbl's own codes, said in the words the journal uses for them.
 */
const TONES = { incompatible: 'text-red', warning: 'text-amb' };

const Row = ({ tone = 'text-ink', text, where, sent }) => (
  <li className="flex flex-col gap-0.5 py-2">
    <span className={`text-base ${tone}`}>{text}</span>
    <span className="font-num text-note text-mut">{where}</span>
    {sent ? <span className="break-all font-num text-note text-mut">{sent}</span> : null}
  </li>
);

const Heading = ({ children }) => (
  <span className="text-cap font-semibold uppercase tracking-[0.12em] text-mut">{children}</span>
);

const CheckSheet = ({ name, check, controllerCheck, onClose }) => (
  <Sheet title={t('files.check.sheet')} onClose={onClose}>
    <p className="m-0 break-all font-num text-note text-mut">{name}</p>

    <Heading>{t('files.check.server')}</Heading>
    <p className="m-0 text-base text-ink">{verdictNote(check)}</p>
    {check.issues.length > 0 ? (
      <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
        {check.issues.map((issue) => (
          <Row key={`${issue.code} ${issue.word}`} tone={TONES[issue.severity]} text={issueText(issue)} where={issueWhere(issue)} />
        ))}
      </ul>
    ) : null}

    <Heading>{t('files.check.controllerTitle')}</Heading>
    {controllerCheck ? (
      <>
        <p className="m-0 font-num text-note text-mut">{checkedAtText(controllerCheck.at)}</p>
        <p className={`m-0 text-base ${controllerCheck.alarm ? 'text-red' : 'text-ink'}`}>{controllerSummary(controllerCheck)}</p>
        {controllerCheck.alarm && GRBL_ALARM_KEYS[controllerCheck.alarm] ? (
          <p className="m-0 text-note text-mut">{t(GRBL_ALARM_KEYS[controllerCheck.alarm])}</p>
        ) : null}
        {controllerCheck.errors.length > 0 ? (
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {controllerCheck.errors.map((error) => (
              <Row
                key={error.code}
                tone="text-red"
                text={GRBL_ERROR_KEYS[error.code] ? t('files.check.controllerError', { code: error.code, text: t(GRBL_ERROR_KEYS[error.code]) }) : error.code}
                where={issueWhere(error)}
                sent={error.sent}
              />
            ))}
          </ul>
        ) : null}
      </>
    ) : (
      <p className="m-0 text-base text-mut">{t('files.check.controllerNone')}</p>
    )}
  </Sheet>
);

export default CheckSheet;
