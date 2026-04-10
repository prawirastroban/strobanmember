import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserVerification() {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsVerified(null);
      setIsLoading(false);
      return;
    }

    const fetchVerification = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_verified")
        .eq("id", user.id)
        .single();

      if (data) {
        setIsVerified((data as any).is_verified ?? false);
      }
      setIsLoading(false);
    };

    fetchVerification();

    // Listen for realtime updates
    const channel = supabase
      .channel("user-verification-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          setIsVerified((payload.new as any).is_verified ?? false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { isVerified, isLoading };
}
