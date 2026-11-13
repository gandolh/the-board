import { useSyncExternalStore } from "react";

/** The phone layout's query: the same width the `phone:` variant in `styles/index.css` starts at. */
const PHONE = "(max-width: 719px)";

function subscribe(listener: () => void): () => void {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

/** True under 720 px. False when rendered without a window, so a server render is the wide layout. */
export function usePhone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}
