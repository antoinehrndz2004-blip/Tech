import { useCallback, useEffect, useState } from "react";

/**
 * Browser-local user preferences. These are UX choices (auto-post, threshold,
 * etc.) that don't need to follow the user across devices or be authoritative
 * on the server — localStorage is enough.
 */
export interface Prefs {
  autoPost: boolean;
  /** Minimum extraction confidence (0-100) at which an invoice is auto-posted. */
  autoPostThreshold: number;
}

const DEFAULT_PREFS: Prefs = {
  autoPost: false,
  autoPostThreshold: 95,
};

const KEY = "ledgerai.prefs.v1";

function read(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      autoPost:
        typeof parsed?.autoPost === "boolean"
          ? parsed.autoPost
          : DEFAULT_PREFS.autoPost,
      autoPostThreshold:
        typeof parsed?.autoPostThreshold === "number"
          ? Math.max(0, Math.min(100, Math.round(parsed.autoPostThreshold)))
          : DEFAULT_PREFS.autoPostThreshold,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(() => read());

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* quota / private mode — ignore */
      }
      return next;
    });
  }, []);

  // If another tab edits the prefs, pick them up.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setPrefs(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { prefs, update };
}
