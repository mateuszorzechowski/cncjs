import config from '../configstore';

/*
 * Who opens the port without being asked (board note 2, 2026-09-25): the
 * server itself, the first panel that opens with none open, or nobody. One
 * setting for the whole server; `manual` unless `.cncrc` says otherwise.
 */
export const AUTO_KEY = 'connection.auto';
export const AUTO_MODES = ['server', 'panel', 'manual'];
export const autoMode = () => (AUTO_MODES.includes(config.get(AUTO_KEY)) ? config.get(AUTO_KEY) : 'manual');
