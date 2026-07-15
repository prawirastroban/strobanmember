import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Enum DB: 'staff' = Owner (full access), 'admin' = CS Pusat (almost full),
// 'admin_cabang' = Admin Cabang (scoped), 'mekanik' = Mekanik Cabang
// (branch-scoped mechanic for SPK), 'head_mekanik' = Head Mekanik Cabang
// (SPK review/QC), 'customer' = Customer.
type AppRole = "admin" | "staff" | "admin_cabang" | "mekanik" | "head_mekanik" | "customer";

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [assignedBranch, setAssignedBranch] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setAssignedBranch(null);
      setIsLoading(false);
      return;
    }

    const fetchRoles = async () => {
      const [{ data: roleRows }, { data: profileRow }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("assigned_branch").eq("id", user.id).maybeSingle(),
      ]);
      if (roleRows) setRoles(roleRows.map((r) => r.role as AppRole));
      setAssignedBranch((profileRow as any)?.assigned_branch ?? null);
      setIsLoading(false);
    };

    fetchRoles();
  }, [user]);

  // Role flags (DB enum -> business meaning)
  const isStaff = roles.includes("staff");           // Owner: full access
  const isAdmin = roles.includes("admin");           // CS: full except marketing & roles
  const isAdminCabang = roles.includes("admin_cabang"); // Branch-scoped
  const isMekanik = roles.includes("mekanik");       // Mekanik cabang (SPK scope)
  const isHeadMekanik = roles.includes("head_mekanik"); // Head Mekanik cabang (SPK review)
  // Roles that ONLY see SPK menu inside the dashboard panel.
  const isSpkOnly = (isMekanik || isHeadMekanik) && !isStaff && !isAdmin && !isAdminCabang;
  const isCustomer = !isStaff && !isAdmin && !isAdminCabang && !isMekanik && !isHeadMekanik;

  // Can open /dashboard panel (mekanik & head_mekanik also use dashboard for SPK)
  const isAdminOrStaff = isStaff || isAdmin || isAdminCabang || isMekanik || isHeadMekanik;

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
    isHeadMekanik,
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
