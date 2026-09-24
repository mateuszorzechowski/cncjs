import { refusalMessage } from '../refusal';

describe('what a refusal is turned into', () => {
  test('nothing at all when there has not been one', () => {
    // Which is the ordinary case: every control that writes is dark before it
    // is pressed, so a refusal is only ever the race.
    expect(refusalMessage(null)).toBeNull();
    expect(refusalMessage({})).toBeNull();
  });

  test('a key of its own for each reason this panel knows', () => {
    expect(refusalMessage({ cmd: 'zero', reason: 'alarm' }))
      .toEqual({ key: 'refusal.alarm', values: { cmd: 'zero' } });
    expect(refusalMessage({ cmd: 'zero', reason: 'no-wcs' }))
      .toEqual({ key: 'refusal.noWcs', values: { cmd: 'zero' } });
    expect(refusalMessage({ cmd: 'goToWorkZero', reason: 'no-travel' }))
      .toEqual({ key: 'refusal.noTravel', values: { cmd: 'goToWorkZero' } });
    expect(refusalMessage({ cmd: 'goToPoint', reason: 'out-of-envelope' }))
      .toEqual({ key: 'refusal.outOfEnvelope', values: { cmd: 'goToPoint' } });
    expect(refusalMessage({ cmd: 'jogStep', reason: 'no-room' }))
      .toEqual({ key: 'refusal.noRoom', values: { cmd: 'jogStep' } });
    expect(refusalMessage({ cmd: 'jogStart', reason: 'program-running' }))
      .toEqual({ key: 'refusal.programRunning', values: { cmd: 'jogStart' } });
    expect(refusalMessage({ cmd: 'gcode:start', reason: 'jogging' }))
      .toEqual({ key: 'refusal.jogging', values: { cmd: 'gcode:start' } });
    expect(refusalMessage({ cmd: 'gcode:start', reason: 'machine-moving' }))
      .toEqual({ key: 'refusal.machineMoving', values: { cmd: 'gcode:start' } });
    expect(refusalMessage({ cmd: 'teleport', reason: 'unknown-command' }))
      .toEqual({ key: 'refusal.unknownCommand', values: { cmd: 'teleport' } });
  });

  test('a reason it has never heard of is still said, with the code in it', () => {
    /*
     * A server that grows a reason this panel has not been taught about is
     * exactly when silence is least affordable — and it is the likely shape of
     * this, because the two halves are deployed separately. The code is worth
     * more to whoever is reading it than a shrug.
     */
    expect(refusalMessage({ cmd: 'zero', reason: 'no-axes' }))
      .toEqual({ key: 'refusal.other', values: { cmd: 'zero', reason: 'no-axes' } });
  });
});
