import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Client-side pin tracker (no DB). Stores per-user list of pinned items:
 *   - standard report id            (e.g. "sales-summary")
 *   - builder template id, prefixed (e.g. "builder:<uuid>")
 */
const keyFor = (uid?: string | null) => `reports:pins:${uid || "anon"}`;
const EVT = "reports:pins:changed";

function read(uid?: string | null): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(uid));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(uid: string | null | undefined, list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(uid), JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* quota */
  }
}

export function useReportPins() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [pins, setPins] = useState<string[]>(() => read(uid));

  useEffect(() => {
    setPins(read(uid));
    const refresh = () => setPins(read(uid));
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [uid]);

  const isPinned = useCallback((id: string) => pins.includes(id), [pins]);

  const toggle = useCallback(
    (id: string) => {
      const cur = read(uid);
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      write(uid, next);
      setPins(next);
      return next.includes(id);
    },
    [uid],
  );

  const remove = useCallback(
    (id: string) => {
      const cur = read(uid).filter((x) => x !== id);
      write(uid, cur);
      setPins(cur);
    },
    [uid],
  );

  return { pins, isPinned, toggle, remove };
}