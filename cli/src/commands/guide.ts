import { readFileSync } from "node:fs";
import { MOVES, type MessageRole } from "@brief-board/shared";
import type { Runtime } from "../runtime.js";

/**
 * `guide`: the rules agents follow (brief 06). Every project's CLAUDE.md
 * points here instead of copying them, so a change to the rules is one edit
 * to `src/guide.md`. The move table is rendered from `shared`, the same table
 * the server enforces, so the guide cannot drift from it.
 */

const ROLE_WORDS: Record<MessageRole, string> = {
  conclusion: "conclusion",
  block_reason: "block reason",
  test_notes: "test notes",
  deploy_steps: "deploy steps",
  confirmation: "confirmation",
  comment: "comment",
};

/** One line per allowed move, using the status ids `move` takes. */
export function renderMoves(): string {
  const width = Math.max(...MOVES.map((rule) => `${rule.from} -> ${rule.to}`.length));
  return MOVES.map((rule) => {
    const move = `${rule.from} -> ${rule.to}`.padEnd(width);
    return `  ${move}  ${ROLE_WORDS[rule.role]}, ${rule.message}`;
  }).join("\n");
}

export function renderGuide(packageRoot: URL): string {
  const text = readFileSync(new URL("src/guide.md", packageRoot), "utf8");
  return text.replace("{{moves}}", renderMoves()).trimEnd();
}

export async function guide(rt: Runtime, _args: string[], packageRoot: URL): Promise<void> {
  rt.out(renderGuide(packageRoot));
}
