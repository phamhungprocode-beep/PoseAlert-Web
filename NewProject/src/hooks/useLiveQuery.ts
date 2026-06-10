/**
 * Tiny wrapper around dexie.liveQuery, falls back to one-shot if SSR.
 */
import { useEffect, useState } from "react";
import { liveQuery } from "dexie";

export function useLiveQuery<T>(querier: () => Promise<T>, fallback: T, deps: unknown[] = []): T {
  const [data, setData] = useState<T>(fallback);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sub = liveQuery(querier).subscribe({
      next: (v) => setData(v),
      error: (e) => console.warn("liveQuery error", e),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return data;
}
