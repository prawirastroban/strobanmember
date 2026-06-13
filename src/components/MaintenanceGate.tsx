import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Wrench } from "lucide-react";

interface MaintenanceState {
  active: boolean;
  reason?: string;
  estimated_end?: string;
  message?: string;
}

const MaintenanceGate = () => {
  const { isStaff } = useUserRole();
  const [state, setState] = useState<MaintenanceState>({ active: false });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();
      const v = (data?.value as unknown as MaintenanceState | null) ?? { active: false };
      setState({ active: Boolean(v.active), reason: v.reason, message: v.message, estimated_end: v.estimated_end });
    };
    void load();
    const ch = supabase.channel("maintenance_watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, (p) => {
        const key = (p.new as { key?: string } | null)?.key;
        if (key === "maintenance_mode") void load();
      })
      .subscribe();
    const id = window.setInterval(load, 60_000);
    return () => { void supabase.removeChannel(ch); window.clearInterval(id); };
  }, []);

  if (!state.active || isStaff) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-white/15 bg-card/80 backdrop-blur-xl p-8 text-center space-y-4 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400/15 text-yellow-500 ring-1 ring-yellow-400/30">
          <Wrench className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Sedang Maintenance</h1>
        <p className="text-sm text-muted-foreground">
          {state.message || "Kami sedang melakukan pemeliharaan sistem. Mohon coba beberapa saat lagi."}
        </p>
        {state.reason && (
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-left">
            <div className="font-medium mb-1">Alasan:</div>
            <div className="text-muted-foreground">{state.reason}</div>
          </div>
        )}
        {state.estimated_end && (
          <div className="text-xs text-muted-foreground">
            Estimasi selesai: <span className="font-medium">{new Date(state.estimated_end).toLocaleString("id-ID")}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceGate;