import {
  movesFrom,
  openRun,
  STATUS_LABELS,
  type MessageRole,
  type MoveCheck,
  type OpenQuestionEntry,
  type OpenRunEntry,
  type Run,
  type Status,
  type Ticket,
  type TicketDetailResponse,
} from "@brief-board/shared";

/**
 * Plain text for agents to read. Each failure says what is allowed
 * instead, so an agent learns the rules from the CLI rather than from a 400.
 */

const ROLE_WORDS: Record<MessageRole, string> = {
  conclusion: "conclusion",
  block_reason: "block reason",
  test_notes: "test notes",
  deploy_steps: "deploy steps",
  confirmation: "confirmation",
  comment: "comment",
};

export const label = (status: Status) => STATUS_LABELS[status];

/** The moves out of `from`, one per line, with the message each needs. */
export function allowedMoves(from: Status): string[] {
  const rules = movesFrom(from);
  if (rules.length === 0) return [`Nothing moves out of ${label(from)}.`];
  return [
    `From ${label(from)} it can go to:`,
    ...rules.map(
      (rule) =>
        `  ${rule.to.padEnd(17)} ${label(rule.to)}: ${ROLE_WORDS[rule.role]}, ${rule.message === "required" ? "required (-m)" : "optional"}`,
    ),
  ];
}

/** Why a move was refused, and what would be allowed. */
export function refusal(key: string, from: Status, to: Status, check: Extract<MoveCheck, { ok: false }>): string[] {
  if (from === "backlog") {
    return [
      `${key} is a todo's ticket in Backlog, and only sync changes it.`,
      "Promote the todo to a brief instead: the next sync takes this ticket off and files the brief's in To Do.",
    ];
  }
  if (check.code === "message_required") {
    const rule = movesFrom(from).find((candidate) => candidate.to === to);
    return [`${key}: ${label(from)} → ${label(to)} needs a ${ROLE_WORDS[rule?.role ?? "comment"]}. Pass it with -m "...".`];
  }
  return [`${key} is ${label(from)} and cannot go to ${label(to)}.`, ...allowedMoves(from)];
}

/** "12m", "5h", "3d": how long since `iso`. */
export function ago(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** An open run: "run by ana, started 2h ago, heard 20m ago", or "stale run by ana, ...". */
export function openRunText(run: Run, now: Date): string {
  return `${run.stale ? "stale run" : "run"} by ${run.author}, started ${ago(run.startedAt, now)} ago, heard ${ago(run.lastHeardAt, now)} ago`;
}

/** How an ended run ended. */
export function runEnding(run: Run): string {
  if (run.ended === "moved") return `moved to ${run.endedTo ? label(run.endedTo) : "another column"}`;
  if (run.ended === "released") return "released, unfinished";
  return "stale; sync closed the ticket";
}

export function ticketLine(ticket: Ticket, now: Date = new Date()): string {
  const tags = ticket.tags.length ? `  [${ticket.tags.join(", ")}]` : "";
  const run = openRun(ticket);
  const mark = run ? `  (${run.stale ? `stale run by ${run.author}, heard ${ago(run.lastHeardAt, now)} ago` : `run by ${run.author}`})` : "";
  return `${ticket.key.padEnd(24)} ${label(ticket.status).padEnd(16)} ${ticket.title}${tags}${mark}`;
}

/** `runs`: one open run per line. */
export function openRunLine({ key, run }: OpenRunEntry, now: Date = new Date()): string {
  return `${key.padEnd(24)} ${run.author.padEnd(16)} started ${ago(run.startedAt, now)} ago, heard ${ago(run.lastHeardAt, now)} ago${run.stale ? ", stale" : ""}`;
}

/** `questions`: one open question per line, with its ticket, number, who asked and when. */
export function openQuestionLine({ key, question }: OpenQuestionEntry, now: Date = new Date()): string {
  const number = `#${question.number}`;
  return `${key.padEnd(24)} ${number.padEnd(4)} ${question.author}, ${ago(question.askedAt, now)} ago: ${question.text.replace(/\s*\n\s*/g, " ")}`;
}

/** `show`: everything about one ticket, oldest first. */
export function ticketDetail(
  { ticket, comments, history, runs = [], questions = [] }: TicketDetailResponse,
  now: Date = new Date(),
): string[] {
  const open = openRun(ticket);
  const ended = runs.filter((run) => run.endedAt !== null);
  const lines = [
    `${ticket.key}: ${ticket.title}`,
    `Status:  ${label(ticket.status)}${ticket.hidden ? " (hidden: the brief was superseded)" : ""}`,
    `Run:     ${open ? openRunText(open, now) : "no run"}`,
    `Tags:    ${ticket.tags.length ? ticket.tags.join(", ") : "none"}`,
    `${ticket.number === null ? "Todo: " : "Brief:"}   ${ticket.briefPath}`,
    "",
    "Summary:",
    ticket.summary.trim() ? `  ${ticket.summary.trim().replace(/\n/g, "\n  ")}` : "  (none)",
    "",
  ];
  if (ended.length > 0) {
    lines.push(`Earlier runs (${ended.length}):`);
    for (const run of ended) lines.push(`  [${run.startedAt}] ${run.author}: ${runEnding(run)}, ${run.endedAt}`);
    lines.push("");
  }
  if (questions.length > 0) {
    // Open first, so the ones waiting for the owner lead.
    const open = questions.filter((question) => question.answeredAt === null);
    const answered = questions.filter((question) => question.answeredAt !== null);
    lines.push(`Questions (${open.length} open, ${answered.length} answered):`);
    for (const question of [...open, ...answered]) {
      lines.push(`  #${question.number} [${question.askedAt}] ${question.author}: ${question.text.replace(/\n/g, "\n    ")}`);
      lines.push(
        question.answeredAt === null
          ? "    open"
          : `    answered by ${question.answeredBy} [${question.answeredAt}]: ${question.answer!.replace(/\n/g, "\n    ")}`,
      );
    }
    lines.push("");
  }
  lines.push(`Comments (${comments.length}):`);
  for (const comment of comments) {
    const role = comment.role ? ROLE_WORDS[comment.role] : "comment";
    const move = comment.move ? `, ${label(comment.move.from)} → ${label(comment.move.to)}` : "";
    lines.push(`  [${comment.createdAt}] ${comment.author} (${role}${move}):`);
    lines.push(`    ${comment.body.replace(/\n/g, "\n    ")}`);
  }
  if (comments.length === 0) lines.push("  (none)");
  lines.push("", "History:");
  for (const event of history) {
    const from = event.from ? label(event.from) : "created";
    lines.push(`  [${event.at}] ${from} → ${label(event.to)} by ${event.author}${event.via === "sync" ? " (sync)" : ""}`);
  }
  return lines;
}
