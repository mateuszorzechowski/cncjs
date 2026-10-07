import Notice from '../../ui/Notice';
import { surfaceShifts, usesSurface } from '../machine/probe';
import { t } from '../../i18n/index';

// Each place's word, named whole so the translations are found (as `SurfaceChoice`'s).
const WORDS = { work: 'probe.surface.work', table: 'probe.surface.table', top: 'probe.surface.top' };

/**
 * Z0 not where it is measured — the stock's thickness away — said on the way
 * into place and on the result, not only in a closed group at the foot of
 * Przygotowanie (audit 2026-10-05, K9). Nothing for a method with no such
 * choice, or with it left as it is.
 */
const SurfaceWarning = ({ method, choice, surface }) => (usesSurface(method, choice) && surfaceShifts(surface) ? (
  <Notice>{t('probe2.surface.warn', { on: t(WORDS[surface.on]), z0: t(WORDS[surface.z0]) })}</Notice>
) : null);

export default SurfaceWarning;
