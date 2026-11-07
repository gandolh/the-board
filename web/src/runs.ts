import { runDurationText, STATUS_LABELS, type Run } from "@brief-board/shared";
import { since } from "./time";

/**
 * How a run reads on a card and in the ticket view. Pure, so the wording is
 * tested without rendering the panel.
 */

/** "20m ago", or "just now". */
function ago(iso: string, now: Date): string {
  const span = since(iso, now);
  return span === "now" ? "just now" : `${span} ago`;
}

/**
 * An open run's line: who, how long it has been running, when the board last
 * heard from it; a stale one in the warning tone, at least start to last
 * heard; "no run" without one.
 */
export function runLine(run: Run | null, now: Date): { text: string; stale: boolean } {
  if (!run) return { text: "no run", stale: false };
  if (run.stale) return { text: `${run.author} · stale run, heard ${ago(run.lastHeardAt, now)} · ${runDurationText(run, now)}`, stale: true };
  return { text: `${run.author} · ${runDurationText(run, now)} · heard ${ago(run.lastHeardAt, now)}`, stale: false };
}

/** A run that ended: who, and how long it took. */
export function endedRunLine(run: Run, now: Date): string {
  return `${run.author} · ${runDurationText(run, now)}`;
}

/** How an ended run ended. */
export function runEnding(run: Run): string {
  if (run.ended === "moved") return run.endedTo ? `moved to ${STATUS_LABELS[run.endedTo]}` : "moved";
  if (run.ended === "released") return "released, unfinished";
  return run.endedTo === "backlog" ? "stale; sync put the ticket in Backlog" : "stale; sync closed the ticket";
}
