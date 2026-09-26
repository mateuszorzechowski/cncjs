/**
 * Which line of a running program the machine is on, and how long is left.
 *
 * **The sender's counters are not it.** Grbl answers `ok` when a line is
 * parsed into its planner, not when it has been cut, and the planner holds
 * sixteen blocks. Measured on COM3, 2026-09-26, 40 moves of 1 mm at
 * 300 mm/min: 30 ms after Start `received` was 16 while the machine was on
 * line 2, and `received` reached the end with 3.5 s of cutting still to come
 * (`sent` runs a further ~9 lines ahead, in Grbl's serial buffer). That is the
 * "21/989 at the start, 989 before the end" Mateusz saw. The sender's own
 * `remainingTime` is elapsed time scaled by `received`, so it inherits the
 * same lead — and it is in milliseconds, which the panel read as seconds.
 *
 * So the line comes from the program's own timeline: the server's planner
 * (`estimate.js`) says how long each line takes and how many blocks it plans.
 * A clock runs while the machine does — at the feed override — and the line is
 * where that clock has got to. Grbl then bounds it from both sides: the
 * machine cannot be past the last line it has acknowledged, and cannot be
 * further back than the planner holds, sixteen blocks behind it. Where the
 * clock falls outside that window it is pulled back in, so an estimate that is
 * off corrects itself with every `ok` rather than drifting for the length of
 * a job.
 */

/** Blocks Grbl's planner holds, the one being cut included (`BLOCK_BUFFER_SIZE`). */
export const PLANNER_BLOCKS = 16;

export class Progress {
  /**
   * @param {{ seconds: number[], blocks: number[] }} timeline per line of
   *   the program, as `analyse` gives it with `byLine`
   */
  constructor({ seconds, blocks }) {
    this.blocks = blocks;
    // `ends[i]` is when line i + 1 is done, from the start of the program.
    this.ends = [];
    let at = 0;
    for (const s of seconds) {
      at += s;
      this.ends.push(at);
    }
    this.total = at;
    this.clock = 0;
    this.line = 0;
  }

  /** Where line `line` (1-based) begins on the clock. */
  startOf(line) {
    return line > 1 ? this.ends[line - 2] : 0;
  }

  /** The earliest line the machine can still be on, with `received` acknowledged. */
  earliest(received) {
    let line = Math.min(received, this.ends.length);
    // Blocks from `line` to the last acknowledged, all of them in the planner.
    // The line before can still be under way if one of its blocks fits
    // beside them — only its last one need be left.
    let held = this.blocks[line - 1] || 0;
    while (line > 1 && held + Math.min(1, this.blocks[line - 2] || 0) <= PLANNER_BLOCKS) {
      line -= 1;
      held += this.blocks[line - 1] || 0;
    }
    return line;
  }

  /**
   * Move the clock on by `seconds` of wall time.
   *
   * @param {number} seconds since the last tick
   * @param {object} machine `moving` — whether program time is passing (the
   *   program runs and the firmware is not held); `override` — the feed
   *   override in percent; `received` — lines Grbl has acknowledged
   */
  tick(seconds, { moving, override = 100, received }) {
    if (moving) {
      this.clock += seconds * (override / 100);
    }
    if (received <= 0) {
      this.clock = 0;
      this.line = 0;
      return;
    }

    const last = Math.min(received, this.ends.length);
    const first = this.earliest(received);
    // Not past the end of what Grbl has taken, not before what it still holds.
    this.clock = Math.min(this.clock, this.ends[last - 1]);
    this.clock = Math.max(this.clock, this.startOf(first));

    let line = first;
    while (line < last && this.ends[line - 1] <= this.clock) {
      line += 1;
    }
    this.line = line;
  }

  /** Seconds left at `override` percent. */
  remaining(override = 100) {
    return Math.max(0, this.total - this.clock) / (Math.max(override, 1) / 100);
  }

  percent() {
    return this.total > 0 ? Math.min(100, Math.round((this.clock / this.total) * 100)) : 0;
  }
}

export default Progress;
