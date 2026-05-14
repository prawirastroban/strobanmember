import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Wallet, Banknote, Ticket, Loader2, Gift, Users as UsersIcon, ShieldAlert, FileText } from "lucide-react";
import { shareReferral } from "@/lib/shareReferral";
import ReferralTermsDialog from "@/components/referral/ReferralTermsDialog";

const formatRp = (n: number) => "Rp " + Math.round(Number(n || 0)).toLocaleString("id-ID");
const formatPts = (p: number) => `${Math.max(0, Math.floor(Number(p || 0))).toLocaleString("id-ID")} poin`;
const formatDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const Referral = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [balance, setBalance] = useState<any>({
    available_balance: 0,
    pending_balance: 0,
    total_earned: 0,
    total_withdrawn: 0,
  });
  const [settings, setSettings] = useState<any>({ signup_bonus: 10000, booking_commission_pct: 5, min_withdraw: 50000, voucher_conversion_rate: 1, is_active: true, point_value_rp: 2500, terms_text: "", terms_version: 1 });
  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [refereeCount, setRefereeCount] = useState(0);

  // dialog states
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [wdAmount, setWdAmount] = useState("");
  const [wdBank, setWdBank] = useState("");
  const [wdAcc, setWdAcc] = useState("");
  const [wdHolder, setWdHolder] = useState("");
  const [cvAmount, setCvAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsReadOnly, setTermsReadOnly] = useState(false);
  const [termsSubmitting, setTermsSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [p, b, s, c, w, v, r] = await Promise.all([
      supabase.from("profiles").select("id, full_name, referral_code, is_verified, referral_terms_accepted_at, referral_terms_version").eq("id", user.id).maybeSingle(),
      supabase.from("referral_balances").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("referral_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("referral_commissions").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("referral_withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("referral_vouchers").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", user.id),
    ]);
    setProfile(p.data);
    if (b.data) setBalance(b.data);
    if (s.data) setSettings(s.data);
    setCommissions(c.data || []);
    setWithdrawals(w.data || []);
    setVouchers(v.data || []);
    setRefereeCount(r.count || 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Determine if user must accept (or re-accept) the T&C
  const needsAccept = !!profile?.is_verified && (
    !profile?.referral_terms_accepted_at ||
    Number(profile?.referral_terms_version || 0) < Number(settings?.terms_version || 1)
  );

  useEffect(() => {
    if (!loading && needsAccept) {
      setTermsReadOnly(false);
      setTermsOpen(true);
    }
  }, [loading, needsAccept]);

  const acceptTerms = async () => {
    if (!user) return;
    setTermsSubmitting(true);
    const { error } = await supabase.from("profiles").update({
      referral_terms_accepted_at: new Date().toISOString(),
      referral_terms_version: Number(settings?.terms_version || 1),
    }).eq("id", user.id);
    setTermsSubmitting(false);
    if (error) {
      toast({ title: "Gagal menyimpan persetujuan", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Terima kasih", description: "Anda kini dapat menggunakan program referral." });
    setTermsOpen(false);
    load();
  };

  const guard = (cb: () => void) => {
    if (needsAccept) {
      setTermsReadOnly(false);
      setTermsOpen(true);
      return;
    }
    cb();
  };

  // Point conversion helpers
  const pointValue = Number(settings?.point_value_rp || 2500) || 2500;
  const rpToPts = (rp: number) => Math.floor(Number(rp || 0) / pointValue);
  const ptsToRp = (p: number) => Math.round(Number(p || 0) * pointValue);
  const minWithdrawPts = rpToPts(Number(settings?.min_withdraw || 0));
  const availPts = rpToPts(Number(balance.available_balance || 0));

  // Active-period gating
  const todayStr = new Date().toISOString().slice(0, 10);
  const beforeStart = !!settings?.active_from && settings.active_from > todayStr;
  const afterEnd = !!settings?.active_until && settings.active_until < todayStr;
  const programActive = settings?.is_active !== false && !beforeStart && !afterEnd;
  const periodLabel = beforeStart
    ? `Program akan dimulai pada ${settings?.active_from}`
    : afterEnd
      ? `Program telah berakhir pada ${settings?.active_until}`
      : settings?.is_active === false
        ? "Program referral sedang dinonaktifkan oleh admin"
        : "";

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const refLink = profile?.referral_code ? `${baseUrl}/?ref=${profile.referral_code}` : "";

  const copy = async (text: string, msg = "Disalin") => {
    try { await navigator.clipboard.writeText(text); toast({ title: msg }); } catch {}
  };

  const shareWA = () => {
    if (!profile?.referral_code || !refLink) {
      toast({ title: "Kode referral belum tersedia", variant: "destructive" });
      return;
    }
    shareReferral({
      code: profile.referral_code,
      link: refLink,
      onCopied: (msg) => toast({ title: "Disalin", description: msg }),
      onError: (msg) => toast({ title: "Gagal membagikan", description: msg, variant: "destructive" }),
    });
  };

  const submitWithdraw = async () => {
    const amountRp = ptsToRp(Number(wdAmount));
    setSubmitting(true);
    const { data, error } = await supabase.rpc("request_referral_withdrawal", {
      _amount: amountRp, _bank_name: wdBank, _account_number: wdAcc, _account_holder: wdHolder,
    });
    setSubmitting(false);
    if (error || !(data as any)?.success) {
      toast({ title: "Gagal", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Permintaan terkirim", description: "Admin akan memproses dalam 1-2 hari kerja" });
      setWithdrawOpen(false);
      setWdAmount(""); setWdBank(""); setWdAcc(""); setWdHolder("");
      load();
    }
  };

  const submitConvert = async () => {
    const amountRp = ptsToRp(Number(cvAmount));
    setSubmitting(true);
    const { data, error } = await supabase.rpc("convert_referral_to_voucher", { _amount: amountRp });
    setSubmitting(false);
    if (error || !(data as any)?.success) {
      toast({ title: "Gagal", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Voucher dibuat 🎉", description: `Kode: ${(data as any).code}` });
      setConvertOpen(false);
      setCvAmount("");
      load();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!profile?.is_verified) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-2xl py-10">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <ShieldAlert className="h-12 w-12 mx-auto text-amber-500" />
              <h2 className="text-xl font-semibold">Akun Belum Terverifikasi</h2>
              <p className="text-sm text-muted-foreground">
                Program referral hanya untuk akun terverifikasi. Daftar dengan Google agar otomatis terverifikasi & dapat kode referral.
              </p>
              <Button onClick={() => navigate("/")}>Kembali</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="container max-w-5xl py-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">Program Referral</h1>
          <p className="text-sm text-muted-foreground">Ajak teman & dapat komisi tunai atau voucher diskon service.</p>
        </div>

        {/* Hero card with code */}
        <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Gift className="h-4 w-4 text-primary" /> Kode Referral Anda
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="font-mono text-2xl md:text-3xl font-bold tracking-wider text-primary">
                {profile?.referral_code || "—"}
              </div>
              <Button size="sm" variant="outline" onClick={() => copy(profile.referral_code, "Kode disalin")} className="gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Salin
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input readOnly value={refLink} className="font-mono text-xs" />
              <Button onClick={() => copy(refLink, "Link disalin")} variant="outline" className="gap-1.5">
                <Copy className="h-4 w-4" /> Salin Link
              </Button>
              <Button onClick={() => guard(shareWA)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Share2 className="h-4 w-4" /> Bagikan WA
              </Button>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-md p-3 space-y-1">
              <div>• Nilai tukar: <strong>1 poin = {formatRp(pointValue)}</strong>.</div>
              <div>• Bonus pendaftaran: <strong>{rpToPts(Number(settings.signup_bonus)).toLocaleString("id-ID")} poin</strong> tiap referee terverifikasi.</div>
              <div>• Komisi booking: <strong>{settings.booking_commission_pct}%</strong> dari nilai booking lunas (dalam bentuk poin).</div>
              <div>• Minimum tarik tunai: <strong>{minWithdrawPts.toLocaleString("id-ID")} poin</strong> ({formatRp(Number(settings.min_withdraw))}).</div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setTermsReadOnly(true); setTermsOpen(true); }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
              >
                <FileText className="h-3 w-3" /> Lihat Syarat & Ketentuan
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Balance grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> Poin Tersedia</div>
              <div className="text-lg font-bold mt-1">{formatPts(availPts)}</div>
              <div className="text-[10px] text-muted-foreground">≈ {formatRp(balance.available_balance)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Total Poin Didapat</div>
              <div className="text-lg font-bold mt-1">{formatPts(rpToPts(balance.total_earned))}</div>
              <div className="text-[10px] text-muted-foreground">≈ {formatRp(balance.total_earned)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Poin Sudah Cair</div>
              <div className="text-lg font-bold mt-1">{formatPts(rpToPts(balance.total_withdrawn))}</div>
              <div className="text-[10px] text-muted-foreground">≈ {formatRp(balance.total_withdrawn)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><UsersIcon className="h-3.5 w-3.5" /> Referee</div>
              <div className="text-lg font-bold mt-1">{refereeCount} orang</div>
            </CardContent>
          </Card>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => guard(() => setWithdrawOpen(true))} disabled={!programActive || availPts < minWithdrawPts} className="gap-2">
            <Banknote className="h-4 w-4" /> Tarik Tunai
          </Button>
          <Button onClick={() => guard(() => setConvertOpen(true))} disabled={!programActive || availPts <= 0} variant="outline" className="gap-2">
            <Ticket className="h-4 w-4" /> Tukar Voucher
          </Button>
        </div>
        {!programActive && periodLabel && (
          <div className="text-xs rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/30 px-3 py-2">
            {periodLabel}. Fitur tarik tunai & tukar voucher dinonaktifkan sementara.
          </div>
        )}

        {/* Tabs history */}
        <Tabs defaultValue="commissions">
          <TabsList>
            <TabsTrigger value="commissions">Riwayat Komisi</TabsTrigger>
            <TabsTrigger value="withdrawals">Pencairan</TabsTrigger>
            <TabsTrigger value="vouchers">Voucher Saya</TabsTrigger>
          </TabsList>
          <TabsContent value="commissions">
            <Card><CardContent className="p-3 space-y-2">
              {commissions.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Belum ada komisi</div>}
              {commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b last:border-0 py-2">
                  <div className="text-sm">
                    <div className="font-medium">{c.description}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(c.created_at)} · {c.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatPts(rpToPts(c.amount))}</div>
                    <div className="text-[10px] text-muted-foreground">≈ {formatRp(c.amount)}</div>
                    <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="withdrawals">
            <Card><CardContent className="p-3 space-y-2">
              {withdrawals.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Belum ada pencairan</div>}
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between border-b last:border-0 py-2">
                  <div className="text-sm">
                    <div className="font-medium">{w.bank_name} · {w.account_number}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(w.created_at)} · {w.account_holder}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatPts(rpToPts(w.amount))}</div>
                    <div className="text-[10px] text-muted-foreground">≈ {formatRp(w.amount)}</div>
                    <Badge variant="outline" className="text-[10px]">{w.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="vouchers">
            <Card><CardContent className="p-3 space-y-2">
              {vouchers.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Belum ada voucher</div>}
              {vouchers.map((v) => (
                <div key={v.id} className="flex items-center justify-between border-b last:border-0 py-2 gap-2">
                  <div className="text-sm min-w-0">
                    <div className="font-mono font-medium truncate">{v.code}</div>
                    <div className="text-xs text-muted-foreground">Berlaku s/d {formatDate(v.expires_at)}</div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="font-semibold">{formatRp(v.amount)}</div>
                    <div className="flex gap-1 items-center">
                      <Badge variant="outline" className="text-[10px]">{v.status}</Badge>
                      {v.status === "active" && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => copy(v.code, "Kode voucher disalin")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Withdraw dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarik Tunai Komisi</DialogTitle>
            <DialogDescription>Poin tersedia: {formatPts(availPts)} · Minimum: {minWithdrawPts.toLocaleString("id-ID")} poin (1 poin = {formatRp(pointValue)})</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nominal (Poin)</Label>
              <Input type="number" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} placeholder={String(minWithdrawPts)} />
              {Number(wdAmount) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Setara {formatRp(ptsToRp(Number(wdAmount)))}</p>
              )}
            </div>
            <div><Label>Nama Bank</Label><Input value={wdBank} onChange={(e) => setWdBank(e.target.value)} placeholder="BCA / Mandiri / BRI ..." /></div>
            <div><Label>Nomor Rekening</Label><Input value={wdAcc} onChange={(e) => setWdAcc(e.target.value)} /></div>
            <div><Label>Atas Nama</Label><Input value={wdHolder} onChange={(e) => setWdHolder(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Batal</Button>
            <Button onClick={submitWithdraw} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ajukan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert voucher dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tukar Saldo jadi Voucher</DialogTitle>
            <DialogDescription>
              Voucher bisa dipakai untuk diskon service Anda atau dibagi ke siapa saja.
              {Number(settings.voucher_conversion_rate) !== 1 && ` Rasio konversi: ${settings.voucher_conversion_rate}x.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nominal (Poin)</Label>
              <Input type="number" value={cvAmount} onChange={(e) => setCvAmount(e.target.value)} />
              {Number(cvAmount) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Setara {formatRp(ptsToRp(Number(cvAmount)))}</p>
              )}
            </div>
            {Number(cvAmount) > 0 && (
              <div className="text-sm text-muted-foreground">
                Anda akan mendapat voucher senilai <strong>{formatRp(ptsToRp(Number(cvAmount)) * Number(settings.voucher_conversion_rate || 1))}</strong>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Batal</Button>
            <Button onClick={submitConvert} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Tukar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReferralTermsDialog
        open={termsOpen}
        onOpenChange={(v) => {
          setTermsOpen(v);
          if (!v && needsAccept && !termsReadOnly) navigate("/");
        }}
        termsText={settings?.terms_text}
        termsVersion={Number(settings?.terms_version || 1)}
        readOnly={termsReadOnly}
        submitting={termsSubmitting}
        onAccept={acceptTerms}
        onCancel={() => { setTermsOpen(false); navigate("/"); }}
      />

    </div>
  );
};

export default Referral;