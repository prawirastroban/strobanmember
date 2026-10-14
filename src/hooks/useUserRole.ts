import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Enum DB: 'staff' = Owner (full access), 'admin' = CS Pusat (almost full),
// 'admin_cabang' = Admin Cabang (scoped), 'mekanik' = Mekanik Cabang
// (branch-scoped mechanic for SPK), 'customer' = Customer.
// Legacy 'head_mekanik' is normalized to 'mekanik' on read.
type AppRole = "admin" | "staff" | "admin_cabang" | "mekanik" | "customer";

const cacheKey = (id: string) => `roles:v1:${id}`;
function readCache(id: string | undefined): { roles: AppRole[]; branch: string | null } | null {
  if (!id) return null;
  try {
    const raw = localStorage.getItem(cacheKey(id));
    if (!raw) return null;
    const p = JSON.parse(raw);
    return Array.isArray(p?.roles) ? { roles: p.roles, branch: p.branch ?? null } : null;
  } catch { return null; }
}

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const initial = readCache(userId);
  const [roles, setRoles] = useState<AppRole[]>(initial?.roles ?? []);
  const [assignedBranch, setAssignedBranch] = useState<string | null>(initial?.branch ?? null);
  const [isLoading, setIsLoading] = useState(!initial);

  useEffect(() => {
    if (!userId) {
      setRoles([]);
      setAssignedBranch(null);
      // While auth is still restoring the session, stay in the loading state
      // so guards don't redirect a signed-in user before roles are known.
      if (!authLoading) setIsLoading(false);
      return;
    }

    // Use cached roles instantly (no loader on resume/refresh); revalidate in background.
    const cached = readCache(userId);
    if (cached) {
      setRoles(cached.roles);
      setAssignedBranch(cached.branch);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setRoles([]);
    }

    let cancelled = false;
    const fetchRoles = async () => {
      const [{ data: roleRows }, { data: profileRow }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("assigned_branch").eq("id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      const nextRoles = roleRows
        ? roleRows.map((r) => (r.role === "head_mekanik" ? "mekanik" : (r.role as AppRole)))
        : cached?.roles ?? [];
      const branch = (profileRow as any)?.assigned_branch ?? null;
      setRoles(nextRoles);
      setAssignedBranch(branch);
      setIsLoading(false);
      if (roleRows) {
        try { localStorage.setItem(cacheKey(userId), JSON.stringify({ roles: nextRoles, branch })); } catch { /* ignore */ }
      }
    };

    fetchRoles();
    return () => { cancelled = true; };
  }, [userId, authLoading]);

  // Role flags (DB enum -> business meaning)
  const isStaff = roles.includes("staff");           // Owner: full access
  const isAdmin = roles.includes("admin");           // CS: full except marketing & roles
  const isAdminCabang = roles.includes("admin_cabang"); // Branch-scoped
  const isMekanik = roles.includes("mekanik");       // Mekanik cabang (SPK scope)
  // Roles that ONLY see SPK menu inside the dashboard panel.
  const isSpkOnly = isMekanik && !isStaff && !isAdmin && !isAdminCabang;
  const isCustomer = !isStaff && !isAdmin && !isAdminCabang && !isMekanik;

  // Can open /dashboard panel (mekanik also uses dashboard for SPK)
  const isAdminOrStaff = isStaff || isAdmin || isAdminCabang || isMekanik;

  // Owner-only capabilities (Marketing, Roles Manager, Inventory, Financial)
  const canManageMarketing = isStaff;
  const canManageRoles = isStaff;
  const canManageInventory = isStaff;
  const canManageFinancial = isStaff || isAdmin;

  return {
    roles,
    isStaff,
    isOwner: isStaff,
    isAdmin,
    isAdminCabang,
    isMekanik,
    // Back-compat alias — legacy head_mekanik is merged into mekanik.
    isHeadMekanik: false,
    isSpkOnly,
    isCustomer,
    isAdminOrStaff,
    canManageMarketing,
    canManageRoles,
    canManageInventory,
    canManageFinancial,
    userBranch: assignedBranch,
    isLoading,
  };
}
