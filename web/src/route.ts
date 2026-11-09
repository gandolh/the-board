import { useSyncExternalStore } from "react";
import { appBase } from "./base";

/**
 * The board's pages, by path under the base: the board itself, older Done
 * (`done`), the login page and the account page. Small enough that a router
 * library would be the bigger part; the server answers every path under the
 * base with the board, so a reload lands on the same page.
 */
export type Page = "board" | "done" | "login" | "account";

/** The pages with a path of their own; anything else under the base is the board. */
const NAMED: readonly Page[] = ["done", "login", "account"];

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

/** The page a path names; anything else under the base is the board. */
export function pageOf(pathname: string, base: string = appBase()): Page {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const name = rest.replace(/\/+$/, "");
  return NAMED.find((page) => page === name) ?? "board";
}

/** The path of a page, under the base. */
export function pathOf(page: Page): string {
  return page === "board" ? appBase() : `${appBase()}${page}`;
}

/** Go to a page without a reload. `replace` keeps Back from returning to where this was called. */
export function navigate(page: Page, { replace = false }: { replace?: boolean } = {}): void {
  const path = pathOf(page);
  if (window.location.pathname === path) return;
  if (replace) window.history.replaceState(null, "", path);
  else window.history.pushState(null, "", path);
  for (const listener of listeners) listener();
}

/** The page the address shows; re-renders when it changes. */
export function usePage(): Page {
  return useSyncExternalStore(subscribe, () => pageOf(window.location.pathname));
}
