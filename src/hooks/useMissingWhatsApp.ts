import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMissingWhatsApp() {
  const { user } = useAuth();
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPhone(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setPhone((data?.phone as string | null) ?? null);
        setLoading(false);
      });

    // Safe Realtime: only receive a metadata event, then re-fetch the phone
    // via the authenticated, RLS-guarded API. Realtime never carries the
    // phone value itself.
    const channel = supabase
      .channel(`profile-phone-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profile_events", filter: `user_id=eq.${user.id}` },
        async () => {
          const { data } = await supabase
            .from("profiles")
            .select("phone")
            .eq("id", user.id)
            .maybeSingle();
          setPhone((data?.phone as string | null) ?? null);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isMissing = !!user && !loading && !(phone && phone.trim().length >= 8);
  return { isMissing, loading, phone };
}