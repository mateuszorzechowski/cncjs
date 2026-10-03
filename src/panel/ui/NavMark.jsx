import { t } from '../i18n';

/** A destination's amber dot: something under way there — a probe wizard (Mateusz, 2026-10-03). */
const NavMark = ({ className = '' }) => (
  <span role="img" aria-label={t('nav.underWay')} className={`size-[9px] shrink-0 rounded-full bg-amb ${className}`} />
);

export default NavMark;
