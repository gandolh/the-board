import { STATUS_LABELS, type Run } from "@brief-board/shared";
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

/** An In Progress ticket's run line: who, since when, when the board last heard from it; stale in the warning tone; or "no run". */
export function runLine(run: Run | null, now: Date): { text: string; stale: boolean } {
  if (!run) return { text: "no run", stale: false };
  if (run.stale) return { text: `${run.author} · stale run, heard ${ago(run.lastHeardAt, now)}`, stale: true };
  return { text: `${run.author} · started ${ago(run.startedAt, now)} · heard ${ago(run.lastHeardAt, now)}`, stale: false };
}

/** How an ended run ended. */
export function runEnding(run: Run): string {
  if (run.ended === "moved") return run.endedTo ? `moved to ${STATUS_LABELS[run.endedTo]}` : "moved";
  if (run.ended === "released") return "released, unfinished";
  return "stale; sync closed the ticket";
}
