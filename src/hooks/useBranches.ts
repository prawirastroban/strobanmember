import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

export interface BranchOption {
  id: string;       // uuid
  slug: string;     // e.g. "bandung"
  name: string;     // e.g. "Stroban Bandung"
}

let cache: BranchOption[] | null = null;
let inflight: Promise<BranchOption[]> | null = null;

async function fetchBranches(): Promise<BranchOption[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase
      .from("branches")
      .select("id,slug,name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    cache = (data || []) as BranchOption[];
    inflight = null;
    return cache;
  })();
  return inflight;
}

/** Force refresh — call after editing branches in BranchManager. */
export function invalidateBranchesCache() {
  cache = null;
}

/**
 * Shared hook for branch dropdowns/filters across admin & booking flows.
 * Returns active branches sorted by sort_order from `branches` table.
 */
export function useBranches() {
  const [branches, setBranches] = useState<BranchOption[]>(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    fetchBranches().then((rows) => {
      if (!active) return;
      setBranches(rows);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return { branches, loading };
}

/**
 * Scoped variant: for `admin_cabang` users, restricts the returned list
 * to only their assigned branch and exposes lock metadata so callers
 * can disable/hide "All branches" options.
 *
 * `lockedBranch` is the matched branch slug (preferred) or name fallback.
 */
export function useScopedBranches() {
  const { branches, loading } = useBranches();
  const { isAdminCabang, userBranch, isLoading: roleLoading } = useUserRole();

  if (isAdminCabang && userBranch) {
    const match = branches.find(
      (b) =>
        b.slug?.toLowerCase() === userBranch.toLowerCase() ||
        b.name?.toLowerCase() === userBranch.toLowerCase(),
    );
    const scoped = match ? [match] : [];
    const lockedBranch = match?.slug ?? userBranch;
    return {
      branches: scoped,
      loading: loading || roleLoading,
      isLocked: true,
      lockedBranch,
      lockedBranchName: match?.name ?? userBranch,
    };
  }

  return {
    branches,
    loading: loading || roleLoading,
    isLocked: false,
    lockedBranch: null as string | null,
    lockedBranchName: null as string | null,
  };
}