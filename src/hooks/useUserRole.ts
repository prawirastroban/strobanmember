import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "admin" | "staff" | "customer";

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!error && data) {
        setRoles(data.map((r) => r.role as AppRole));
      }
      setIsLoading(false);
    };

    fetchRoles();
  }, [user]);

  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff") || isAdmin;
  const isCustomer = roles.includes("customer") || (!isAdmin && !isStaff);

  return {
    roles,
    isAdmin,
    isStaff,
    isCustomer,
    isLoading,
  };
}
