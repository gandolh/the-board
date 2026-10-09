import {
  movesFrom,
  STATUS_LABELS,
  type MessageRole,
  type MoveCheck,
  type Status,
  type Ticket,
  type TicketDetailResponse,
} from "@brief-board/shared";

/**
 * Plain text for agents to read (brief 04). Each failure says what is allowed
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
  if (check.code === "message_required") {
    const rule = movesFrom(from).find((candidate) => candidate.to === to);
    return [`${key}: ${label(from)} → ${label(to)} needs a ${ROLE_WORDS[rule?.role ?? "comment"]}. Pass it with -m "...".`];
  }
  return [`${key} is ${label(from)} and cannot go to ${label(to)}.`, ...allowedMoves(from)];
}

export function ticketLine(ticket: Ticket): string {
  const tags = ticket.tags.length ? `  [${ticket.tags.join(", ")}]` : "";
  return `${ticket.key.padEnd(24)} ${label(ticket.status).padEnd(16)} ${ticket.title}${tags}`;
}

/** `show`: everything about one ticket, oldest first. */
export function ticketDetail({ ticket, comments, history }: TicketDetailResponse): string[] {
  const lines = [
    `${ticket.key}: ${ticket.title}`,
    `Status:  ${label(ticket.status)}${ticket.hidden ? " (hidden: the brief was superseded)" : ""}`,
    `Tags:    ${ticket.tags.length ? ticket.tags.join(", ") : "none"}`,
    `Brief:   ${ticket.briefPath}`,
    "",
    "Summary:",
    ticket.summary.trim() ? `  ${ticket.summary.trim().replace(/\n/g, "\n  ")}` : "  (none)",
    "",
    `Comments (${comments.length}):`,
  ];
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
