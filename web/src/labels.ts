import type { MessageRole } from "@brief-board/shared";

/** How each message role reads on screen (glossary "Messages on a transition"). */
export const ROLE_LABELS: Record<MessageRole, string> = {
  block_reason: "Block reason",
  test_notes: "Test notes",
  deploy_steps: "Deploy steps",
  confirmation: "Confirmation",
  conclusion: "Conclusion",
  comment: "Comment",
};
