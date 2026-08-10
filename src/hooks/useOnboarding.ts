import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export const ONBOARDING_TOTAL_STEPS = 4;

export function useOnboarding() {
  const { user } = useAuth();
  const { roles, isLoading: rolesLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: profile }, { count }] = await Promise.all([
      supabase
        .from("profiles")
        .select("phone, onboarding_completed_at, onboarding_step")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
    setPhone((profile?.phone as string | null) ?? null);
    setCompletedAt((profile?.onboarding_completed_at as string | null) ?? null);
    setStep(Number(profile?.onboarding_step ?? 0));
    setVehicleCount(count ?? 0);
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user, refresh]);

  const saveStep = useCallback(
    async (next: number) => {
      setStep(next);
      if (!user) return;
      await supabase.from("profiles").update({ onboarding_step: next }).eq("id", user.id);
    },
    [user],
  );

  const complete = useCallback(async () => {
    const now = new Date().toISOString();
    setCompletedAt(now);
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarding_completed_at: now, onboarding_step: ONBOARDING_TOTAL_STEPS })
      .eq("id", user.id);
  }, [user]);

  const isCustomer = !rolesLoading && (roles.length === 0 || roles.includes("customer"));
  const hasPhone = !!phone && phone.trim().length >= 8;
  const hasVehicle = vehicleCount > 0;

  return {
    loading: loading || rolesLoading,
    isCustomer,
    shouldShow: !!user && !loading && !rolesLoading && isCustomer && !completedAt,
    step,
    phone,
    hasPhone,
    hasVehicle,
    vehicleCount,
    saveStep,
    complete,
    refresh,
  };
}