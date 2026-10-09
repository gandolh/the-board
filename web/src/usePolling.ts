import { useEffect, useState } from "react";

/** How often the board asks again (brief 07). */
export const POLL_MS = 10_000;

export interface Polled<T> {
  /** The last good answer, kept on screen while the API is unreachable. */
  data: T | null;
  /** When `data` arrived. */
  fetchedAt: Date | null;
  /** The last attempt failed. */
  failing: boolean;
}

/**
 * Fetch now and every `POLL_MS`, paused while the tab is hidden and caught up
 * as soon as it is shown again. A failure keeps the last data and sets
 * `failing`; the next success clears it. `load` must be stable (a module
 * function, or memoised), or the polling restarts on every render.
 */
export function usePolling<T>(load: (signal: AbortSignal) => Promise<T>): Polled<T> {
  const [state, setState] = useState<Polled<T>>({ data: null, fetchedAt: null, failing: false });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let stopped = false;

    const tick = async () => {
      clearTimeout(timer);
      if (document.hidden) return; // resumed by visibilitychange
      controller?.abort();
      controller = new AbortController();
      try {
        const data = await load(controller.signal);
        if (!stopped) setState({ data, fetchedAt: new Date(), failing: false });
      } catch (err) {
        if (!stopped && (err as Error).name !== "AbortError") setState((s) => ({ ...s, failing: true }));
      }
      if (!stopped && !document.hidden) timer = setTimeout(tick, POLL_MS);
    };

    const onVisibility = () => {
      if (!document.hidden) void tick();
      else clearTimeout(timer);
    };
    document.addEventListener("visibilitychange", onVisibility);
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  return state;
}
