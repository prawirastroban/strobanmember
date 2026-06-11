import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DashFilters,
  readFilters,
  writeFilters,
  clearFilters,
  countActive,
  DashFilterKey,
} from "@/lib/dashFilters";

/**
 * Read & mutate dashboard filters via the URL.
 * Components stay shareable, bookmarkable, and survive refresh.
 */
export function useDashFilters() {
  const [sp, setSp] = useSearchParams();

  const filters = useMemo(() => readFilters(sp), [sp]);
  const active = useMemo(() => countActive(filters), [filters]);

  const set = useCallback(
    (patch: DashFilters, opts?: { replace?: boolean }) => {
      const next = writeFilters(sp, patch);
      setSp(next, { replace: opts?.replace ?? true });
    },
    [sp, setSp],
  );

  const reset = useCallback(
    (keep: DashFilterKey[] = ["tab"]) => {
      setSp(clearFilters(sp, keep), { replace: true });
    },
    [sp, setSp],
  );

  return { filters, set, reset, active, searchParams: sp };
}