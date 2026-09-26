import config from '../configstore';

/*
 * Whether the server opens the port without being asked (board note 2,
 * 2026-09-25): `server` or `manual`, one setting for the whole server;
 * `manual` unless `.cncrc` says otherwise.
 *
 * A panel connecting when it is opened is that device's own setting since
 * 2026-09-26 (the "Tryb łączenia" design, variant 3a) — every device keeps
 * its own — so `panel`, which this setting used to hold, now reads as
 * `manual` here.
 */
export const AUTO_KEY = 'connection.auto';
export const AUTO_MODES = ['server', 'manual'];
export const autoMode = () => (AUTO_MODES.includes(config.get(AUTO_KEY)) ? config.get(AUTO_KEY) : 'manual');
