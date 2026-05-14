import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Wallet, Users as UsersIcon, Banknote, Ticket, Trophy, Upload, Eye, CheckCircle2, Clock, Send, XCircle } from "lucide-react";

type Settings = {
  signup_bonus: number;
  booking_commission_pct: number;
  min_withdraw: number;
  voucher_conversion_rate: number;
  voucher_validity_days: number;
  is_active: boolean;
  point_value_rp: number;
  terms_text: string;
  terms_version: number;
  active_from: string | null;
  active_until: string | null;
};

const formatRp = (n: number) => "Rp " + Math.round(Number(n || 0)).toLocaleString("id-ID");
const formatDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const formatDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

const ReferralManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    signup_bonus: 10000,
    booking_commission_pct: 5,
    min_withdraw: 50000,
    voucher_conversion_rate: 1,
    voucher_validity_days: 90,
    is_active: true,
    point_value_rp: 2500,
    terms_text: "",
    terms_version: 1,
    active_from: null,
    active_until: null,
  });
  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [payOpen, setPayOpen] = useState<any | null>(null);
  const [payNote, setPayNote] = useState("");
  const [payFile, setPayFile] = useState<File | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState<any | null>(null);
  const [wFilter, setWFilter] = useState<"all" | "pending" | "approved" | "paid" | "rejected">("all");
  const [approveOpen, setApproveOpen] = useState<any | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [bumpTermsVersion, setBumpTermsVersion] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [s, c, w, v, b] = await Promise.all([
      supabase.from("referral_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("referral_commissions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("referral_withdrawals").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("referral_vouchers").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("referral_balances").select("*").order("total_earned", { ascending: false }).limit(20),
    ]);
    if (s.data) setSettings(s.data as any);
    setCommissions(c.data || []);
    setWithdrawals(w.data || []);
    setVouchers(v.data || []);
    setLeaders(b.data || []);

    // hydrate names for commissions, withdrawals, leaders
    const userIds = new Set<string>();
    (c.data || []).forEach((r: any) => { userIds.add(r.referrer_id); userIds.add(r.referee_id); });
    (w.data || []).forEach((r: any) => userIds.add(r.user_id));
    (v.data || []).forEach((r: any) => userIds.add(r.user_id));
    (b.data || []).forEach((r: any) => userIds.add(r.user_id));
    if (userIds.size) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, phone, referral_code")
        .in("id", Array.from(userIds));
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p; });
      setCommissions((c.data || []).map((r: any) => ({ ...r, _referrer: map[r.referrer_id], _referee: map[r.referee_id] })));
      setWithdrawals((w.data || []).map((r: any) => ({ ...r, _user: map[r.user_id] })));
      setVouchers((v.data || []).map((r: any) => ({ ...r, _user: map[r.user_id] })));
      setLeaders((b.data || []).map((r: any) => ({ ...r, _user: map[r.user_id] })));
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // realtime: refresh on withdrawal changes
  useEffect(() => {
    const ch = supabase
      .channel("ref-withdrawals-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "referral_withdrawals" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("referral_settings")
      .update({
        signup_bonus: Number(settings.signup_bonus) || 0,
        booking_commission_pct: Number(settings.booking_commission_pct) || 0,
        min_withdraw: Number(settings.min_withdraw) || 0,
        voucher_conversion_rate: Number(settings.voucher_conversion_rate) || 1,
        voucher_validity_days: Number(settings.voucher_validity_days) || 90,
        is_active: settings.is_active,
        point_value_rp: Number(settings.point_value_rp) || 2500,
        terms_text: settings.terms_text || "",
        terms_version: bumpTermsVersion
          ? (Number(settings.terms_version) || 1) + 1
          : (Number(settings.terms_version) || 1),
        active_from: settings.active_from || null,
        active_until: settings.active_until || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    if (error) toast({ title: "Gagal simpan", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Pengaturan disimpan" });
      if (bumpTermsVersion) {
        setSettings((s) => ({ ...s, terms_version: (Number(s.terms_version) || 1) + 1 }));
        setBumpTermsVersion(false);
      }
    }
  };

  const submitApprove = async () => {
    if (!approveOpen) return;
    setApproveSubmitting(true);
    const { data, error } = await supabase.rpc("approve_referral_withdrawal", {
      _id: approveOpen.id,
      _note: approveNote.trim() || null,
    });
    setApproveSubmitting(false);
    if (error || !(data as any)?.success) {
      toast({ title: "Gagal menyetujui", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Pencairan disetujui", description: "Status: Siap Transfer. Lanjutkan transfer & unggah bukti." });
      setApproveOpen(null);
      setApproveNote("");
      loadAll();
    }
  };

  const markPaid = async (id: string) => {
    const { data, error } = await supabase.rpc("mark_referral_withdrawal_paid", { _id: id, _proof_url: null });
    if (error || !(data as any)?.success) {
      toast({ title: "Gagal", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Ditandai sudah dibayar" });
      loadAll();
    }
  };

  const submitPaid = async () => {
    if (!payOpen) return;
    if (!payFile) {
      toast({ title: "Bukti transfer wajib", description: "Unggah bukti transfer sebelum menandai sudah ditransfer.", variant: "destructive" });
      return;
    }
    if (payFile.size > 5 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Maksimal 5MB.", variant: "destructive" });
      return;
    }
    setPaySubmitting(true);
    let proofUrl: string | null = null;
    try {
      if (payFile) {
        const ext = payFile.name.split(".").pop() || "jpg";
        const path = `${payOpen.id}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("withdrawal-proofs").upload(path, payFile, { upsert: true });
        if (up.error) throw up.error;
        const { data: signed } = await supabase.storage.from("withdrawal-proofs").createSignedUrl(path, 60 * 60 * 24 * 365);
        proofUrl = signed?.signedUrl || path;
      }
      const { data, error } = await supabase.rpc("mark_referral_withdrawal_paid", { _id: payOpen.id, _proof_url: proofUrl });
      if (error || !(data as any)?.success) throw new Error(error?.message || (data as any)?.error || "Gagal");
      if (payNote) {
        await supabase.from("referral_withdrawals").update({ admin_note: payNote }).eq("id", payOpen.id);
      }
      toast({ title: "Pencairan ditandai sudah ditransfer" });
      setPayOpen(null); setPayNote(""); setPayFile(null);
      loadAll();
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    } finally {
      setPaySubmitting(false);
    }
  };

  const reject = async () => {
    if (!rejectOpen) return;
    const { data, error } = await supabase.rpc("reject_referral_withdrawal", { _id: rejectOpen, _reason: rejectReason || "Ditolak" });
    if (error || !(data as any)?.success) {
      toast({ title: "Gagal", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Pencairan ditolak" });
      setRejectOpen(null);
      setRejectReason("");
      loadAll();
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      available: { cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", label: "tersedia" },
      pending: { cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", label: "Menunggu" },
      approved: { cls: "bg-sky-500/15 text-sky-600 border-sky-500/30", label: "Siap Transfer" },
      paid: { cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", label: "Sudah Ditransfer" },
      rejected: { cls: "bg-red-500/15 text-red-600 border-red-500/30", label: "Ditolak" },
      cancelled: { cls: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30", label: "Dibatalkan" },
      active: { cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", label: "aktif" },
      used: { cls: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30", label: "terpakai" },
      expired: { cls: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30", label: "kadaluarsa" },
    };
    const m = map[s] || { cls: "", label: s };
    return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
  };

  const totalCommission = commissions.reduce((sum, r) => r.status !== "cancelled" ? sum + Number(r.amount) : sum, 0);
  const totalPending = withdrawals.filter((w) => w.status === "pending").length;
  const wCount = (st: string) => st === "all" ? withdrawals.length : withdrawals.filter((w) => w.status === st).length;
  const filteredW = wFilter === "all" ? withdrawals : withdrawals.filter((w) => w.status === wFilter);
  const totalActiveVoucher = vouchers.filter((v) => v.status === "active").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="backdrop-blur-md bg-card/60 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center"><Wallet className="h-5 w-5 text-primary" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Total Komisi</div>
              <div className="font-semibold">{formatRp(totalCommission)}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-md bg-card/60 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center"><Banknote className="h-5 w-5 text-amber-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Pencairan Pending</div>
              <div className="font-semibold">{totalPending}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-md bg-card/60 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center"><Ticket className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Voucher Aktif</div>
              <div className="font-semibold">{totalActiveVoucher}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-md bg-card/60 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-sky-500/15 flex items-center justify-center"><UsersIcon className="h-5 w-5 text-sky-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Top Referrer</div>
              <div className="font-semibold">{leaders.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          <TabsTrigger value="commissions">Komisi ({commissions.length})</TabsTrigger>
          <TabsTrigger value="withdrawals">Pencairan ({withdrawals.length})</TabsTrigger>
          <TabsTrigger value="vouchers">Voucher ({vouchers.length})</TabsTrigger>
          <TabsTrigger value="leaders">Top Referrer</TabsTrigger>
        </TabsList>

        {/* SETTINGS */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Komisi Referral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Program Aktif</div>
                  <div className="text-xs text-muted-foreground">Nonaktifkan untuk menghentikan komisi baru</div>
                </div>
                <Switch checked={settings.is_active} onCheckedChange={(v) => setSettings({ ...settings, is_active: v })} />
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <div>
                  <div className="font-medium">Periode Program Aktif</div>
                  <div className="text-xs text-muted-foreground">
                    Atur rentang tanggal program berlaku. Kosongkan = tanpa batas. Di luar periode, fitur referral dinonaktifkan otomatis untuk user.
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mulai Tanggal</Label>
                    <Input
                      type="date"
                      value={settings.active_from || ""}
                      onChange={(e) => setSettings({ ...settings, active_from: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sampai Tanggal</Label>
                    <Input
                      type="date"
                      value={settings.active_until || ""}
                      min={settings.active_from || undefined}
                      onChange={(e) => setSettings({ ...settings, active_until: e.target.value || null })}
                    />
                  </div>
                </div>
                {(settings.active_from || settings.active_until) && (() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const inRange =
                    (!settings.active_from || settings.active_from <= today) &&
                    (!settings.active_until || settings.active_until >= today);
                  const beforeStart = settings.active_from && settings.active_from > today;
                  return (
                    <div className={`text-xs rounded-md px-2 py-1.5 ${inRange ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                      {inRange
                        ? "Status hari ini: BERLAKU"
                        : beforeStart
                          ? `Belum dimulai (mulai ${settings.active_from})`
                          : `Sudah berakhir (sampai ${settings.active_until})`}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Bonus saat Referee Daftar (Rp)</Label>
                  <Input type="number" value={settings.signup_bonus}
                    onChange={(e) => setSettings({ ...settings, signup_bonus: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Diberikan saat user baru terverifikasi.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Komisi Booking (%)</Label>
                  <Input type="number" step="0.1" value={settings.booking_commission_pct}
                    onChange={(e) => setSettings({ ...settings, booking_commission_pct: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Persen dari nilai booking saat status paid.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Minimum Tarik Tunai (Rp)</Label>
                  <Input type="number" value={settings.min_withdraw}
                    onChange={(e) => setSettings({ ...settings, min_withdraw: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rasio Konversi Voucher</Label>
                  <Input type="number" step="0.1" value={settings.voucher_conversion_rate}
                    onChange={(e) => setSettings({ ...settings, voucher_conversion_rate: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">1.0 = nilai sama, 1.2 = bonus 20% bila tukar voucher.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Masa Berlaku Voucher (hari)</Label>
                  <Input type="number" value={settings.voucher_validity_days}
                    onChange={(e) => setSettings({ ...settings, voucher_validity_days: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nilai 1 Poin (Rp)</Label>
                  <Input type="number" value={settings.point_value_rp}
                    onChange={(e) => setSettings({ ...settings, point_value_rp: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Contoh: 2500 = setiap 1 poin user setara Rp 2.500.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Syarat & Ketentuan Program Referral</Label>
                <Textarea
                  rows={8}
                  value={settings.terms_text || ""}
                  onChange={(e) => setSettings({ ...settings, terms_text: e.target.value })}
                  placeholder={"Contoh:\n1. Komisi diberikan setelah referee terverifikasi & melakukan booking lunas.\n2. Penyalahgunaan akan menggugurkan saldo poin.\n3. Pencairan diproses 1-2 hari kerja.\n4. ..."}
                />
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-muted-foreground">Versi saat ini: <strong>v{settings.terms_version}</strong></p>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bumpTermsVersion}
                      onChange={(e) => setBumpTermsVersion(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Naikkan versi (paksa user setujui ulang)
                  </label>
                </div>
              </div>

              <Button onClick={saveSettings} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Pengaturan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMMISSIONS */}
        <TabsContent value="commissions">
          <Card>
            <CardContent className="p-0">
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {commissions.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 text-sm">Belum ada komisi</div>
                )}
                {commissions.map((r) => (
                  <div key={r.id} className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r._referrer?.full_name || r.referrer_id.slice(0, 8)}</div>
                        <div className="text-[11px] text-muted-foreground">dari {r._referee?.full_name || r.referee_id.slice(0, 8)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-primary">{formatRp(r.amount)}</div>
                        <div className="text-[10px] text-muted-foreground">{formatDate(r.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                      {statusBadge(r.status)}
                    </div>
                    {r.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{r.description}</div>}
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referee</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada komisi</TableCell></TableRow>
                  )}
                  {commissions.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{formatDate(r.created_at)}</TableCell>
                      <TableCell className="text-sm">{r._referrer?.full_name || r.referrer_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">{r._referee?.full_name || r.referee_id.slice(0, 8)}</TableCell>
                      <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatRp(r.amount)}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">{r.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WITHDRAWALS */}
        <TabsContent value="withdrawals">
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-wrap gap-1.5 p-3 border-b">
                {([
                  ["all", "Semua"],
                  ["pending", "Menunggu"],
                  ["approved", "Siap Transfer"],
                  ["paid", "Selesai"],
                  ["rejected", "Ditolak"],
                ] as const).map(([k, label]) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={wFilter === k ? "default" : "outline"}
                    onClick={() => setWFilter(k as any)}
                    className="h-8 gap-1.5"
                  >
                    {label}
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{wCount(k)}</Badge>
                  </Button>
                ))}
              </div>
              <div className="px-3 py-2 border-b bg-muted/30 text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Alur status:</span> Menunggu → <span className="text-sky-600">Setujui</span> → Siap Transfer → <span className="text-emerald-600">Tandai Sudah Ditransfer</span> (wajib lampirkan bukti) → Sudah Ditransfer.
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {filteredW.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 text-sm">Belum ada permintaan</div>
                )}
                {filteredW.map((w) => (
                  <div key={w.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{w._user?.full_name || w.user_id.slice(0, 8)}</div>
                        <div className="text-[11px] text-muted-foreground">{w._user?.phone || "-"}</div>
                      </div>
                      {statusBadge(w.status)}
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div className="text-[12px] min-w-0">
                        <div className="font-medium truncate">{w.bank_name}</div>
                        <div className="text-muted-foreground font-mono truncate">{w.account_number}</div>
                        <div className="text-muted-foreground truncate">a.n. {w.account_holder}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold text-primary">{formatRp(w.amount)}</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Diajukan: {formatDateTime(w.created_at)}</div>
                      {w.processed_at && (
                        <div className="flex items-center gap-1">
                          {w.status === "rejected" ? <XCircle className="h-3 w-3 text-red-500" /> : w.status === "paid" ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Send className="h-3 w-3 text-sky-500" />}
                          {w.status === "rejected" ? "Ditolak" : w.status === "paid" ? "Ditransfer" : "Disetujui"}: {formatDateTime(w.processed_at)}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {w.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => { setApproveOpen(w); setApproveNote(""); }}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Setujui
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setRejectOpen(w.id); setRejectReason(""); }}>Tolak</Button>
                        </>
                      )}
                      {w.status === "approved" && (
                        <>
                          <Button size="sm" className="gap-1 col-span-2" onClick={() => { setPayOpen(w); setPayNote(""); setPayFile(null); }}>
                            <Send className="h-3.5 w-3.5" /> Tandai Sudah Ditransfer
                          </Button>
                          <Button size="sm" variant="destructive" className="col-span-2" onClick={() => { setRejectOpen(w.id); setRejectReason(""); }}>Tolak</Button>
                        </>
                      )}
                      {(w.status === "paid" || w.status === "rejected") && (
                        <Button size="sm" variant="outline" className="gap-1 col-span-2" onClick={() => setDetailOpen(w)}>
                          <Eye className="h-3.5 w-3.5" /> Detail
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Bank / Rekening</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Riwayat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredW.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada permintaan</TableCell></TableRow>
                  )}
                  {filteredW.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDateTime(w.created_at)}</TableCell>
                      <TableCell className="text-sm">
                        <div>{w._user?.full_name || w.user_id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{w._user?.phone}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{w.bank_name}</div>
                        <div className="text-xs text-muted-foreground">{w.account_number} • {w.account_holder}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatRp(w.amount)}</TableCell>
                      <TableCell>{statusBadge(w.status)}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground space-y-0.5 min-w-[160px]">
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(w.created_at)}</div>
                        {w.processed_at && (
                          <div className="flex items-center gap-1">
                            {w.status === "rejected" ? <XCircle className="h-3 w-3 text-red-500" /> : w.status === "paid" ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Send className="h-3 w-3 text-sky-500" />}
                            {formatDateTime(w.processed_at)}
                          </div>
                        )}
                      </TableCell>
                       <TableCell className="text-right">
                         <div className="flex flex-col sm:flex-row sm:justify-end gap-1">
                           {w.status === "pending" && (
                             <>
                               <Button size="sm" variant="outline" className="gap-1 w-full sm:w-auto" onClick={() => { setApproveOpen(w); setApproveNote(""); }}>
                                 <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Setujui
                               </Button>
                               <Button size="sm" variant="destructive" className="w-full sm:w-auto" onClick={() => { setRejectOpen(w.id); setRejectReason(""); }}>Tolak</Button>
                             </>
                           )}
                           {w.status === "approved" && (
                             <>
                               <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={() => { setPayOpen(w); setPayNote(""); setPayFile(null); }}>
                                 <Send className="h-3.5 w-3.5" /> Tandai Sudah Ditransfer
                               </Button>
                               <Button size="sm" variant="destructive" className="w-full sm:w-auto" onClick={() => { setRejectOpen(w.id); setRejectReason(""); }}>Tolak</Button>
                             </>
                           )}
                           {(w.status === "paid" || w.status === "rejected") && (
                             <Button size="sm" variant="outline" className="gap-1 w-full sm:w-auto" onClick={() => setDetailOpen(w)}>
                               <Eye className="h-3.5 w-3.5" /> Detail
                             </Button>
                           )}
                         </div>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VOUCHERS */}
        <TabsContent value="vouchers">
          <Card>
            <CardContent className="p-0">
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {vouchers.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 text-sm">Belum ada voucher</div>
                )}
                {vouchers.map((v) => (
                  <div key={v.id} className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold truncate">{v.code}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{v._user?.full_name || v.user_id.slice(0, 8)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-primary">{formatRp(v.amount)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-muted-foreground">Berlaku s/d {formatDate(v.expires_at)}</span>
                      {statusBadge(v.status)}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Pemilik</TableHead>
                    <TableHead className="text-right">Nilai</TableHead>
                    <TableHead>Berlaku s/d</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada voucher</TableCell></TableRow>
                  )}
                  {vouchers.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs">{v.code}</TableCell>
                      <TableCell className="text-sm">{v._user?.full_name || v.user_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-right font-medium">{formatRp(v.amount)}</TableCell>
                      <TableCell className="text-xs">{formatDate(v.expires_at)}</TableCell>
                      <TableCell>{statusBadge(v.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEADERS */}
        <TabsContent value="leaders">
          <Card>
            <CardContent className="p-0">
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {leaders.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 text-sm">Belum ada data</div>
                )}
                {leaders.map((l, i) => (
                  <div key={l.user_id} className="p-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                      {i < 3 ? <Trophy className={`h-4 w-4 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : "text-amber-700"}`} /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{l._user?.full_name || l.user_id.slice(0, 8)}</div>
                      <div className="font-mono text-[11px] text-muted-foreground truncate">{l._user?.referral_code || "-"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-primary">{formatRp(l.total_earned)}</div>
                      <div className="text-[10px] text-muted-foreground">Saldo {formatRp(l.available_balance)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead className="text-right">Total Diterima</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Sudah Cair</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaders.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
                  )}
                  {leaders.map((l, i) => (
                    <TableRow key={l.user_id}>
                      <TableCell className="text-sm">
                        {i < 3 ? <Trophy className={`h-4 w-4 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : "text-amber-700"}`} /> : i + 1}
                      </TableCell>
                      <TableCell className="text-sm">{l._user?.full_name || l.user_id.slice(0, 8)}</TableCell>
                      <TableCell className="font-mono text-xs">{l._user?.referral_code || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatRp(l.total_earned)}</TableCell>
                      <TableCell className="text-right">{formatRp(l.available_balance)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatRp(l.total_withdrawn)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectOpen} onOpenChange={(o) => !o && setRejectOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tolak Pencairan</DialogTitle></DialogHeader>
          <Textarea placeholder="Alasan penolakan..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(null)}>Batal</Button>
            <Button variant="destructive" onClick={reject}>Tolak Pencairan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tandai sudah ditransfer */}
      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tandai Sudah Ditransfer</DialogTitle></DialogHeader>
          {payOpen && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">User</span><span className="font-medium">{payOpen._user?.full_name || payOpen.user_id.slice(0, 8)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Jumlah</span><span className="font-semibold text-primary">{formatRp(payOpen.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span>{payOpen.bank_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rekening</span><span className="font-mono">{payOpen.account_number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Atas Nama</span><span>{payOpen.account_holder}</span></div>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Bukti Transfer <span className="text-red-500">*</span>
                </Label>
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => setPayFile(e.target.files?.[0] || null)} />
                <p className="text-[11px] text-muted-foreground">Wajib diunggah. Gambar atau PDF, maksimal 5MB.</p>
                {payFile && <p className="text-xs text-emerald-600">✓ {payFile.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Catatan (opsional)</Label>
                <Textarea placeholder="Misal: ditransfer via BCA mobile..." value={payNote} onChange={(e) => setPayNote(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Batal</Button>
            <Button onClick={submitPaid} disabled={paySubmitting || !payFile} className="gap-1.5">
              {paySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Konfirmasi Sudah Ditransfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setujui pencairan */}
      <Dialog open={!!approveOpen} onOpenChange={(o) => !o && setApproveOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Setujui Pencairan</DialogTitle></DialogHeader>
          {approveOpen && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">User</span><span className="font-medium">{approveOpen._user?.full_name || approveOpen.user_id.slice(0, 8)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Jumlah</span><span className="font-semibold text-primary">{formatRp(approveOpen.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span>{approveOpen.bank_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rekening</span><span className="font-mono">{approveOpen.account_number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Atas Nama</span><span>{approveOpen.account_holder}</span></div>
              </div>
              <div className="rounded-md bg-sky-500/10 border border-sky-500/30 p-2 text-[11px] text-sky-700 dark:text-sky-300">
                Setelah disetujui, status berubah jadi <b>Siap Transfer</b>. Lakukan transfer manual lalu tandai dengan bukti transfer.
              </div>
              <div className="space-y-1.5">
                <Label>Catatan untuk user (opsional)</Label>
                <Textarea placeholder="Misal: akan ditransfer hari ini..." value={approveNote} onChange={(e) => setApproveNote(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(null)}>Batal</Button>
            <Button onClick={submitApprove} disabled={approveSubmitting} className="gap-1.5">
              {approveSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Ya, Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail pencairan */}
      <Dialog open={!!detailOpen} onOpenChange={(o) => !o && setDetailOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detail Pencairan</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                {statusBadge(detailOpen.status)}
              </div>
              <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">User</span><span className="font-medium">{detailOpen._user?.full_name || detailOpen.user_id.slice(0, 8)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Jumlah</span><span className="font-semibold text-primary">{formatRp(detailOpen.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span>{detailOpen.bank_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rekening</span><span className="font-mono">{detailOpen.account_number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Atas Nama</span><span>{detailOpen.account_holder}</span></div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Riwayat</div>
                <div className="flex items-center gap-2 text-xs"><Clock className="h-3.5 w-3.5" /> Diajukan: {formatDateTime(detailOpen.created_at)}</div>
                {detailOpen.processed_at && (
                  <div className="flex items-center gap-2 text-xs">
                    {detailOpen.status === "rejected" ? <XCircle className="h-3.5 w-3.5 text-red-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {detailOpen.status === "rejected" ? "Ditolak" : "Ditransfer"}: {formatDateTime(detailOpen.processed_at)}
                  </div>
                )}
              </div>
              {detailOpen.admin_note && (
                <div className="rounded-lg border p-2 text-xs"><span className="text-muted-foreground">Catatan staff: </span>{detailOpen.admin_note}</div>
              )}
              {detailOpen.proof_url && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Bukti Transfer</Label>
                  <a href={detailOpen.proof_url} target="_blank" rel="noreferrer" className="block">
                    <img src={detailOpen.proof_url} alt="Bukti transfer" className="rounded-lg border max-h-64 w-full object-contain bg-muted" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    <Button variant="outline" size="sm" className="mt-2 gap-1.5 w-full"><Eye className="h-3.5 w-3.5" /> Buka Bukti</Button>
                  </a>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferralManager;