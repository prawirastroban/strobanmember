import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Enum DB: 'staff' = Owner (full access), 'admin' = CS (almost full),
// 'admin_cabang' = Branch admin (scoped), 'customer' = Customer.
type AppRole = "admin" | "staff" | "admin_cabang" | "customer";

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
  const isCustomer = !isStaff && !isAdmin && !isAdminCabang;

  // Can open /dashboard panel
  const isAdminOrStaff = isStaff || isAdmin || isAdminCabang;

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
