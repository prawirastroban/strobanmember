import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { hardReload } from "@/lib/appVersion";
import { toast } from "sonner";

export function useClientCommands() {
  const { user } = useAuth();
  useEffect(() => {
    const ch = supabase.channel("client_commands");
    ch.on("broadcast", { event: "cmd" }, async (msg) => {
      const payload = msg.payload as { action: string; target?: string; except?: string | null };
      const target = payload.target ?? "*";
      if (target !== "*" && target !== user?.id) return;
      // Skip clients explicitly excluded (e.g. the admin who triggered a broadcast refresh)
      if (payload.except && payload.except === user?.id) return;
      switch (payload.action) {
        case "refresh":
        case "update":
          toast.info("Aplikasi sedang diperbarui...");
          await hardReload();
          break;
        case "clear_cache":
          try {
            if ("caches" in window) {
              const names = await caches.keys();
              await Promise.allSettled(names.filter(n => !/firebase|fcm/i.test(n)).map(n => caches.delete(n)));
            }
          } catch { /* ignore */ }
          toast.success("Cache dibersihkan");
          break;
        case "logout":
          await supabase.auth.signOut();
          window.location.replace("/auth");
          break;
      }
    }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user?.id]);
}