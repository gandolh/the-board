import { z } from "zod";

/**
 * The columns, in board order (decisions.md "Six columns, two of them the
 * owner's"). Ready for test and Ready for deploy hold work waiting for the
 * owner. Backlog, first since 2026-11-03, holds one ticket per open todo, and
 * only sync puts tickets there or takes them off. The ids are the API's; the
 * labels are what the board shows.
 */
export const STATUSES = ["backlog", "todo", "in_progress", "blocked", "ready_for_test", "ready_for_deploy", "done"] as const;
export const statusSchema = z.enum(STATUSES);
export type Status = z.infer<typeof statusSchema>;

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  ready_for_test: "Ready for test",
  ready_for_deploy: "Ready for deploy",
  done: "Done",
};
