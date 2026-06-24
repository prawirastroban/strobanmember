import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { hardReload, APP_VERSION, compareVersion } from "@/lib/appVersion";
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
          {
            // Guard against refresh-loops: only reload when the client build is
            // strictly older than the broadcast target version. If equal/newer,
            // do nothing — no modal, no cache clear, no reload.
            const targetVersion = (msg.payload as { version?: string }).version;
            if (targetVersion && compareVersion(APP_VERSION, targetVersion) >= 0) {
              return;
            }
            toast.info("Aplikasi sedang diperbarui...");
            await hardReload(targetVersion);
          }
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