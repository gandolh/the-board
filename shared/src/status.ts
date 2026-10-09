import { z } from "zod";

/**
 * The six columns, in board order (decisions.md "Six columns, two of them the
 * owner's"). Ready for test and Ready for deploy hold work waiting for the
 * owner. The ids are the API's; the labels are what the board shows.
 */
export const STATUSES = ["todo", "in_progress", "blocked", "ready_for_test", "ready_for_deploy", "done"] as const;
export const statusSchema = z.enum(STATUSES);
export type Status = z.infer<typeof statusSchema>;

export const STATUS_LABELS: Record<Status, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  ready_for_test: "Ready for test",
  ready_for_deploy: "Ready for deploy",
  done: "Done",
};
