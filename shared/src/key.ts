import { z } from "zod";

/**
 * A ticket key is `<project>-<number>` (decisions.md "One ticket per brief").
 * The project is a directory name under ~/projects, kept exactly as written:
 * it may hold hyphens and capitals (`public-resource-map`, `imbatranimOS`) and
 * even end in digits (`3D-sandbox`). So the number is whatever follows the
 * last hyphen, and only if it is all digits.
 */
export interface TicketKey {
  project: string;
  number: number;
}

const KEY = /^([A-Za-z0-9._-]*[A-Za-z0-9._])-(\d+)$/;

/** `sports-app-01` and `sports-app-1` both give `{project: "sports-app", number: 1}`. Null if it is not a key. */
export function parseKey(key: string): TicketKey | null {
  const match = KEY.exec(key.trim());
  if (!match) return null;
  const [, project, digits] = match;
  if (!project || !digits) return null;
  const number = Number.parseInt(digits, 10);
  return Number.isSafeInteger(number) ? { project, number } : null;
}

/** At least two digits, so a key matches its brief's filename (`01-...md`, `137-...md`). */
export function formatKey(project: string, number: number): string {
  return `${project}-${String(number).padStart(2, "0")}`;
}

/** The canonical spelling of a key, or null. */
export function normalizeKey(key: string): string | null {
  const parsed = parseKey(key);
  return parsed ? formatKey(parsed.project, parsed.number) : null;
}

/** A key from a client: validated, and normalised to its canonical spelling. */
export const keySchema = z.string().transform((value, ctx) => {
  const key = normalizeKey(value);
  if (!key) {
    ctx.addIssue({ code: "custom", message: `"${value}" is not a ticket key (<project>-<number>)` });
    return z.NEVER;
  }
  return key;
});

/**
 * A todo's ticket (decisions.md "One ticket per brief", revisited 2026-11-03)
 * is keyed `<project>:<slug>`, the slug being the todo's file name without
 * `.md`. A colon is outside a brief key's alphabet, so a slug that ends in
 * digits (`walls-step-2`) never reads as a brief number, and `parseKey` turns
 * every todo key down.
 */
export interface TodoKey {
  project: string;
  slug: string;
}

/** What a todo's file name may be, without `.md`. */
export const TODO_SLUG = /^[A-Za-z0-9._-]+$/;

const TODO_KEY = /^([A-Za-z0-9._-]*[A-Za-z0-9._]):([A-Za-z0-9._-]+)$/;

/** `imbatranimOS:linux-apps-sound` gives `{project: "imbatranimOS", slug: "linux-apps-sound"}`. Null if it is not one. */
export function parseTodoKey(key: string): TodoKey | null {
  const match = TODO_KEY.exec(key.trim());
  if (!match) return null;
  const [, project, slug] = match;
  return project && slug ? { project, slug } : null;
}

export function formatTodoKey(project: string, slug: string): string {
  return `${project}:${slug}`;
}

/** A brief's key in its canonical spelling, a todo's as written, or null. */
export function normalizeTicketKey(key: string): string | null {
  const todo = parseTodoKey(key);
  return todo ? formatTodoKey(todo.project, todo.slug) : normalizeKey(key);
}

/** A key from a client in either form, as the ticket routes take it. */
export const ticketKeySchema = z.string().transform((value, ctx) => {
  const key = normalizeTicketKey(value);
  if (!key) {
    ctx.addIssue({ code: "custom", message: `"${value}" is not a ticket key (<project>-<number>, or <project>:<todo> for a todo's)` });
    return z.NEVER;
  }
  return key;
});
