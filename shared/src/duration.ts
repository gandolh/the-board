import type { Run } from "./api.js";

/**
 * How long a run took, worked out from times the board already keeps:
 * nothing about a duration is stored. One formatter, so the board and the
 * CLI write a duration the same way.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "<1m", "45m", "1h", "1h 20m", "1d", "2d 3h": the two largest units, rounded down. */
export function formatDuration(ms: number): string {
  const span = Math.max(0, ms);
  if (span < MINUTE) return "<1m";
  if (span < HOUR) return `${Math.floor(span / MINUTE)}m`;
  if (span < DAY) {
    const hours = Math.floor(span / HOUR);
    const minutes = Math.floor((span % HOUR) / MINUTE);
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(span / DAY);
  const hours = Math.floor((span % DAY) / HOUR);
  return hours ? `${days}d ${hours}h` : `${days}d`;
}

/**
 * A run's length: end minus start for a run that ended, now minus start for
 * an open one. A stale run, open or ended by sync, counts to the last time the
 * board heard from it, and is at least that long: nobody knows when it stopped.
 */
export function runDuration(run: Run, now: Date): { ms: number; atLeast: boolean } {
  const start = Date.parse(run.startedAt);
  if (run.stale || run.ended === "stale") return { ms: Date.parse(run.lastHeardAt) - start, atLeast: true };
  if (run.endedAt !== null) return { ms: Date.parse(run.endedAt) - start, atLeast: false };
  return { ms: now.getTime() - start, atLeast: false };
}

/** "running 40m" for an open run, "took 1h 20m" for one that ended, and "ran ≥ 3h 10m" or "took ≥ 3h 10m" for a stale one. */
export function runDurationText(run: Run, now: Date): string {
  const { ms, atLeast } = runDuration(run, now);
  const span = `${atLeast ? "≥ " : ""}${formatDuration(ms)}`;
  if (run.endedAt !== null) return `took ${span}`;
  return run.stale ? `ran ${span}` : `running ${span}`;
}
