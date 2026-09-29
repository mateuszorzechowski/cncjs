import { useSyncExternalStore } from 'react';
import controller from './controller';
import { machineConsole } from './console';

/*
 * Attached when the panel loads rather than when the MDI screen first opens,
 * so an answer that arrives while another screen is showing is still there
 * to read.
 */
machineConsole.listen(controller);

/** The console's lines, oldest first, re-read whenever one arrives. */
export const useConsoleLines = () => useSyncExternalStore(machineConsole.subscribe, machineConsole.lines);
