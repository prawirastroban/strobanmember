import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Settings, Send, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useUserRole } from "@/hooks/useUserRole";

interface Schedule { enabled: boolean; hour: number; minute: number; }
interface Template { message: string; include_link: boolean; }

const DEFAULT_TEMPLATE = `Halo {name} 👋\n\nTerima kasih sudah menggunakan layanan *{service}* di *Sahabat Stroban Service*.\n\nMohon luangkan waktu sebentar untuk memberi rating & tanggapan Anda di link berikut:\n{link}\n\nTanggapan Anda sangat berarti bagi kami 🙏`;

export default function ReviewReminderSettings() {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [cfg, setCfg] = useState<Schedule>({ enabled: false, hour: 10, minute: 0 });
  const [tpl, setTpl] = useState<Template>({ message: DEFAULT_TEMPLATE, include_link: true });

  const load = async () => {
    setLoading(true);
    const [{ data: sched }, { data: tplRow }] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "review_reminder_schedule").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "review_reminder_template").maybeSingle(),
    ]);
    if (sched?.value) setCfg(sched.value as unknown as Schedule);
    if (tplRow?.value) {
      const v = tplRow.value as any;
      setTpl({ message: v.message || DEFAULT_TEMPLATE, include_link: v.include_link !== false });
    }
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const save = async () => {
    setSaving(true);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("app_settings")
        .update({ value: cfg as any, updated_at: new Date().toISOString() })
        .eq("key", "review_reminder_schedule"),
      supabase.from("app_settings")
        .upsert({ key: "review_reminder_template", value: tpl as any, updated_at: new Date().toISOString() }),
    ]);
    setSaving(false);
    const error = e1 || e2;
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pengaturan tersimpan", description: cfg.enabled ? `Aktif - kirim setiap hari ${String(cfg.hour).padStart(2,"0")}:${String(cfg.minute).padStart(2,"0")} WIB` : "Jadwal otomatis dinonaktifkan" });
  };

  const runTest = async (dryRun: boolean) => {
    if (!dryRun) {
      const ok = window.confirm(
        "Kirim WhatsApp reminder sekarang?\n\n" +
        "• Maks 10 pesan per eksekusi\n" +
        "• Jeda 1.5 detik antar pesan (anti-blokir)\n" +
        "• Pesan otomatis berhenti jika 3 kegagalan beruntun\n\n" +
        "Pastikan device WA di Fonnte aktif & terhubung."
      );
      if (!ok) return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-review-reminders", {
        body: { force: true, dry_run: dryRun, limit: 10, throttle_ms: 1500 },
      });
      if (error) throw error;
      if (dryRun) {
        toast({
          title: "Dry-run",
          description: `${data?.count ?? 0} total target, ${data?.valid_count ?? 0} nomor valid, akan dikirim ${data?.will_send_in_next_run ?? 0} di run berikutnya`,
        });
      } else if (data?.circuit_open) {
        toast({
          title: "⚠️ Pengiriman dihentikan",
          description: data?.hint || "Device Fonnte mungkin di-block. Cek dashboard Fonnte.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Pengiriman selesai",
          description: `Terkirim ${data?.sent ?? 0} · Gagal ${data?.failed ?? 0} · Skip ${data?.skipped ?? 0}`,
        });
      }
    } catch (e: any) {
      toast({ title: "Test gagal", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2 gap-1 shrink-0">
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">Pengaturan</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Jadwal WA Reminder Review</DialogTitle>
          <DialogDescription>
            Kirim WhatsApp reminder otomatis ke pelanggan yang booking-nya sudah selesai namun belum direview.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Memuat...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="font-medium">Jadwal Otomatis</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cfg.enabled ? `Aktif - setiap hari ${String(cfg.hour).padStart(2,"0")}:${String(cfg.minute).padStart(2,"0")} WIB` : "Nonaktif"}
                </p>
              </div>
              <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg(c => ({ ...c, enabled: v }))} disabled={!isAdmin} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Jam (0-23)</Label>
                <Input type="number" min={0} max={23} value={cfg.hour}
                  onChange={(e) => setCfg(c => ({ ...c, hour: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) }))}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <Label className="text-xs">Menit (0-59)</Label>
                <Input type="number" min={0} max={59} value={cfg.minute}
                  onChange={(e) => setCfg(c => ({ ...c, minute: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) }))}
                  disabled={!isAdmin}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">Test pengiriman:</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => runTest(true)} disabled={testing}>
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Dry-run
                </Button>
                <Button size="sm" className="flex-1 gap-1.5" onClick={() => runTest(false)} disabled={testing}>
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Kirim Sekarang
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                "Dry-run" hanya menampilkan jumlah target tanpa mengirim WA.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Tutup</Button>
          <Button onClick={save} disabled={!isAdmin || saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}