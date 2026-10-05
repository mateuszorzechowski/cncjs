/**
 * What the machine is doing, as the step of the part's drawing it belongs
 * to (`bossCycle`), and in words — from the server's step names. `MOVES`,
 * the drawing's moves: their `way` names the side in the words.
 */
export const phasesOf = (MOVES) => {
  // The server's parts of a touch, as the steps drawn: `x1a-out`, `-down`, `-fast`, `-back`, `-settle`, the slow one bare, `-off`, `-up`.
  const STEP_OF = {
    in: 'In',
    along: 'Along',
    out: 'Out', down: 'Down', fast: 'Fast', back: 'Back', settle: 'Back', off: 'Off', up: 'Up',
  };
  const TOP_OF = {
    fast: 'zFast', back: 'zBack', settle: 'zBack', off: 'zOff',
  };

  /*
   * What the machine is doing, as the step it belongs to — the server's step
   * names: `z-fast` the top, `x1a-out` the first pass's +X side going out,
   * `y2b` the second's −Y slow touch, and `x1-centre` the way to the middle.
   */
  const moveOfPhase = (phase) => {
    const [step, part] = String(phase || '').split('-');
    // A pocket's way back to its middle at the end, one axis at a time.
    if (step === 'return') {
      return part === 'y' ? 'retY' : 'retX';
    }
    if (step === 'z') {
      return TOP_OF[part] || 'zSlow';
    }
    // A size's passes past the second are drawn as the second: every one of them starts at the centre.
    const side = /^([xy])(\d+)([ab])$/.exec(step);
    if (side) {
      return `${side[1]}${Math.min(2, side[2])}${side[3] === 'a' ? 'p' : 'm'}${STEP_OF[part] || 'Slow'}`;
    }
    const centre = /^([xy])(\d+)$/.exec(step);
    return centre && part === 'centre' ? `${centre[1]}${Math.min(2, centre[2])}c` : 'zFast';
  };

  // The words of a step's part where the part's differ from a plate's.
  const PHASE_KEYS = {
    fast: 'probe.boss.phase.fast',
    back: 'probe.phase.back',
    settle: 'probe.phase.settle',
    off: 'probe.phase.off',
    out: 'probe.phase.out',
    down: 'probe.phase.down',
    up: 'probe.boss.phase.up',
    centre: 'probe.hole.phase.centre',
    along: 'probe.edge.phase.along',
    in: 'probe.edge.phase.in',
  };

  /** What the ball is doing at the server's step, as `t(key, vars)`. */
  const bossWords = (phase) => {
    const [step, part] = String(phase || '').split('-');
    if (step === 'return') {
      return ['probe.phase.return', { axis: part.toUpperCase() }];
    }
    if (step === 'z') {
      return [part === 'fast' ? 'probe.boss.phase.top' : (PHASE_KEYS[part] || 'probe.phase.touch'), { axis: 'Z' }];
    }
    return [PHASE_KEYS[part] || 'probe.phase.touch', { axis: MOVES[moveOfPhase(phase)].way }];
  };

  return { moveOfPhase, words: bossWords };
};
