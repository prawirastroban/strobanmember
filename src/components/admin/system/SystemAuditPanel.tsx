import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, ShieldCheck, Loader2 } from "lucide-react";
import PageAuditPanel from "@/components/admin/PageAuditPanel";
import PlayStoreReadinessChecklist from "@/components/admin/system/PlayStoreReadinessChecklist";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

const SystemAuditPanel = () => {
  const { toast } = useToast();
  const { isAdmin, isStaff } = useUserRole();
  const [busy, setBusy] = useState(false);

  const runBackfill = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-ops", {
        body: { action: "backfill_unconfirmed" },
      });
      if (error || !(data as any)?.success) {
        toast({
          variant: "destructive",
          title: "Backfill gagal",
          description: (data as any)?.error || error?.message || "Tidak dapat menjalankan backfill",
        });
        return;
      }
      const d = data as any;
      toast({
        title: "Backfill selesai",
        description: `Total belum terkonfirmasi: ${d.total_unconfirmed}. Diaktifkan: ${d.fixed}. Gagal: ${d.failures?.length || 0}.`,
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-5 w-5 text-primary" /> System Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Pemeriksaan otomatis: broken pages, dead routes, missing permissions, duplicate pages, version mismatch & cache conflict.
          </p>
        </CardContent>
      </Card>

      {(isAdmin || isStaff) && (
      <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-emerald-500" /> Pemulihan Akun Login
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Aktifkan ulang akun yang tidak bisa login karena status email belum
            terkonfirmasi (warisan signup lama). Aman dijalankan berulang kali —
            hanya menyentuh akun dengan profil <code>is_verified = true</code>.
          </p>
          <Button onClick={runBackfill} disabled={busy} size="sm">
            {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Memproses…</> : "Aktifkan ulang akun belum terkonfirmasi"}
          </Button>
        </CardContent>
      </Card>
      )}

      <PlayStoreReadinessChecklist />
      <PageAuditPanel />
    </div>
  );
};

export default SystemAuditPanel;