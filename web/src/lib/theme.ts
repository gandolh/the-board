import { useSyncExternalStore } from "react";

/** The theme the owner picked. `system` follows the operating system, live, in CSS. */
export type Theme = "light" | "dark" | "system";

/** Where the choice is kept, on this device; `index.html`'s boot script reads the same key. Apps on the shared domain share one localStorage, so the name carries the app's. */
export const THEME_KEY = "brief-board.theme";
/** The bare key older builds used, shared with other apps: read once to carry the choice over, never written. */
const LEGACY_THEME_KEY = "theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readLegacyTheme(): Theme | null {
  const value = localStorage.getItem(LEGACY_THEME_KEY);
  return isTheme(value) ? value : null;
}

function saved(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (isTheme(value)) return value;
    const legacy = readLegacyTheme();
    if (legacy === null) return "light";
    localStorage.setItem(THEME_KEY, legacy);
    return legacy;
  } catch {
    return "light";
  }
}

let current: Theme = typeof window === "undefined" ? "light" : saved();
const listeners = new Set<() => void>();

/** The theme in force. */
export function getTheme(): Theme {
  return current;
}

/** Applies a theme to <html>, keeps it on this device, and tells every subscriber. Writes nothing to the API. */
export function setTheme(theme: Theme): void {
  current = theme;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage is blocked (a private window): the choice lasts until the tab closes.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The theme the owner picked, re-rendering when it changes. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}
