import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_TIMELINE, type TimelineValue, isTimelineDefault } from "@/utils/timelineFilter";

export type FilterLogic = "AND" | "OR";

export interface FilterState {
  search: string;
  timeline: TimelineValue;
  quickChips: string[];               // active quick-chip keys
  dropdowns: Record<string, string>;  // e.g. { branch: "bandung", status: "paid" }
  ranges: Record<string, [number | null, number | null]>;
  multi: Record<string, string[]>;    // multi-select advanced filters
  logic: FilterLogic;
}

export const EMPTY_FILTER_STATE: FilterState = {
  search: "",
  timeline: DEFAULT_TIMELINE,
  quickChips: [],
  dropdowns: {},
  ranges: {},
  multi: {},
  logic: "AND",
};

const storageKey = (m: string) => `filters:v2:${m}`;

function loadInitial(moduleKey: string, fallback: FilterState): FilterState {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(moduleKey));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<FilterState>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export interface UseFilterStateOptions {
  initial?: Partial<FilterState>;
  debounceMs?: number;       // search debounce, default 300
  persist?: boolean;         // default true
}

export function useFilterState(moduleKey: string, opts: UseFilterStateOptions = {}) {
  const { initial, debounceMs = 300, persist = true } = opts;
  const baseline = useMemo<FilterState>(
    () => ({ ...EMPTY_FILTER_STATE, ...initial }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [state, setState] = useState<FilterState>(() =>
    persist ? loadInitial(moduleKey, baseline) : baseline,
  );
  const [debouncedSearch, setDebouncedSearch] = useState(state.search);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounce search
  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setDebouncedSearch(state.search), debounceMs);
    return () => { if (tRef.current) clearTimeout(tRef.current); };
  }, [state.search, debounceMs]);

  // persist
  useEffect(() => {
    if (!persist) return;
    try { window.localStorage.setItem(storageKey(moduleKey), JSON.stringify(state)); } catch {}
  }, [state, moduleKey, persist]);

  const setSearch = useCallback((v: string) => setState((s) => ({ ...s, search: v })), []);
  const setTimeline = useCallback((v: TimelineValue) => setState((s) => ({ ...s, timeline: v })), []);
  const setDropdown = useCallback(
    (key: string, v: string) => setState((s) => ({ ...s, dropdowns: { ...s.dropdowns, [key]: v } })),
    [],
  );
  const setRange = useCallback(
    (key: string, v: [number | null, number | null]) =>
      setState((s) => ({ ...s, ranges: { ...s.ranges, [key]: v } })),
    [],
  );
  const setMulti = useCallback(
    (key: string, v: string[]) => setState((s) => ({ ...s, multi: { ...s.multi, [key]: v } })),
    [],
  );
  const setLogic = useCallback((v: FilterLogic) => setState((s) => ({ ...s, logic: v })), []);

  const toggleChip = useCallback((key: string) => {
    setState((s) => {
      const has = s.quickChips.includes(key);
      return { ...s, quickChips: has ? s.quickChips.filter((k) => k !== key) : [...s.quickChips, key] };
    });
  }, []);

  const removeFilter = useCallback((kind: "chip" | "dropdown" | "range" | "multi" | "timeline" | "search", key?: string) => {
    setState((s) => {
      switch (kind) {
        case "search": return { ...s, search: "" };
        case "timeline": return { ...s, timeline: DEFAULT_TIMELINE };
        case "chip": return { ...s, quickChips: s.quickChips.filter((k) => k !== key) };
        case "dropdown": {
          const next = { ...s.dropdowns }; if (key) delete next[key]; return { ...s, dropdowns: next };
        }
        case "range": {
          const next = { ...s.ranges }; if (key) delete next[key]; return { ...s, ranges: next };
        }
        case "multi": {
          const next = { ...s.multi }; if (key) delete next[key]; return { ...s, multi: next };
        }
      }
    });
  }, []);

  const reset = useCallback(() => setState(baseline), [baseline]);

  const applyPreset = useCallback((payload: Partial<FilterState>) => {
    setState((s) => ({ ...s, ...payload }));
  }, []);

  const isActive = useMemo(() => {
    if (state.search) return true;
    if (!isTimelineDefault(state.timeline)) return true;
    if (state.quickChips.length) return true;
    if (Object.values(state.dropdowns).some((v) => v && v !== "all")) return true;
    if (Object.values(state.ranges).some((r) => r[0] !== null || r[1] !== null)) return true;
    if (Object.values(state.multi).some((arr) => arr && arr.length)) return true;
    return false;
  }, [state]);

  return {
    state,
    debouncedSearch,
    setSearch, setTimeline, setDropdown, setRange, setMulti, setLogic,
    toggleChip, removeFilter, reset, applyPreset,
    isActive,
  };
}