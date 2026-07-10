// Customer self-approval page for SPKs originated from an app booking.
// Accessible at /spk/:id/approve. Guarded to the SPK owner (customer_id === auth.uid()).
// Walk-in SPKs (no booking_id) fall back to in-shop signature at Canvas Section 11.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Sparkles, Wrench, AlertTriangle, Loader2, PenLine, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SignaturePad } from "@/components/spk/canvas/SignaturePad";
import { toast } from "sonner";

type SpkRow = {
  id: string;
  spk_number: string;
  status: string;
  customer_id: string | null;
  booking_id: string | null;
  opened_at: string | null;
  ai_health_report: any;
  data: any;
};

export default function SPKCustomerApprove() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [spk, setSpk] = useState<SpkRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  const goBackToBooking = async () => {
    if (!spk?.booking_id) {
      navigate("/profile", { replace: true });
      return;
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("status")
      .eq("id", spk.booking_id)
      .maybeSingle();

    const status = booking?.status;
    if (status === "completed") {
      navigate(`/service/completed/${spk.booking_id}`, { replace: true });
      return;
    }
    if (["checked_in", "in_progress", "finishing"].includes(status ?? "") || !status) {
      navigate(`/service/progress/${spk.booking_id}`, { replace: true });
      return;
    }
    navigate(`/my-booking/${spk.booking_id}`, { replace: true });
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("spk_orders")
        .select("id, spk_number, status, customer_id, booking_id, opened_at, ai_health_report, data")
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setSpk(data as SpkRow | null);
        // Prefill signature if already saved
        const existing = (data as any)?.data?.signature_customer;
        if (existing) setSignature(existing);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat SPK…
      </div>
    );
  }

  if (!spk) {
    return (
      <GuardScreen
        title="SPK tidak ditemukan"
        message="Tautan approval sudah tidak valid."
        onBack={() => navigate("/profile")}
      />
    );
  }

  // Guard 1: must be owner of the SPK.
  if (user && spk.customer_id && spk.customer_id !== user.id) {
    return (
      <GuardScreen
        title="Tidak diizinkan"
        message="Halaman approval ini hanya untuk pemilik SPK."
        onBack={() => navigate("/profile")}
      />
    );
  }

  // Guard 2: only app-booking SPKs get self-approval. Walk-ins sign at the shop.
  if (!spk.booking_id) {
    return (
      <GuardScreen
        title="Approval di bengkel"
        message="SPK ini bukan berasal dari booking aplikasi. Silakan tanda tangan langsung di device bengkel saat serah-terima."
        onBack={() => navigate("/profile")}
      />
    );
  }

  const awaitingApproval = spk.status === "awaiting_customer_approval";
  const alreadyApproved = !!spk.data?.signature_customer && !awaitingApproval;
  const dataObj = (spk.data ?? {}) as Record<string, any>;
  const complaint = dataObj.customer_complaint || dataObj.complaint || dataObj.keluhan_customer || "-";
  const workItems: string[] = Array.isArray(dataObj.work_items)
    ? dataObj.work_items
    : Array.isArray(dataObj.order_items)
    ? dataObj.order_items
    : [];
  const health = spk.ai_health_report;

  const YN = (v: unknown) =>
    v === true || v === "true" || v === "ok" || v === "good"
      ? "OK"
      : v === false || v === "bad"
      ? "Bad"
      : v == null || v === ""
      ? "—"
      : String(v);
  const F = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
  const d = dataObj;
  const detailGroups: { title: string; items: { label: string; value: string }[] }[] = [
    {
      title: "Order Sales Advisor",
      items: [
        { label: "Oli Merek", value: F(d.service_oil_brand) },
        { label: "Oli Qty (L)", value: F(d.service_oil_qty) },
        { label: "Paket Service", value: F(d.service_package) },
        { label: "Order Lainnya", value: F(d.service_extra) },
      ],
    },
    {
      title: "Diagnostic — Engine",
      items: [
        { label: "Air Filter", value: YN(d.engine_air_filter) },
        { label: "Oil Filter", value: YN(d.engine_oil_filter) },
        { label: "Fuel Filter", value: YN(d.engine_fuel_filter) },
        { label: "Aki", value: YN(d.engine_battery) },
        { label: "Radiator", value: YN(d.engine_radiator) },
        { label: "V-Belt", value: YN(d.engine_vbelt) },
        { label: "Timing Belt", value: YN(d.engine_timing_belt) },
        { label: "Busi", value: YN(d.engine_busi) },
      ],
    },
    {
      title: "Tyre Check",
      items: [
        { label: "FL", value: F(d.tyre_fl_status) },
        { label: "FR", value: F(d.tyre_fr_status) },
        { label: "RL", value: F(d.tyre_rl_status) },
        { label: "RR", value: F(d.tyre_rr_status) },
        { label: "Tekanan FL/FR", value: `${F(d.tyre_fl_psi)} / ${F(d.tyre_fr_psi)} psi` },
        { label: "Tekanan RL/RR", value: `${F(d.tyre_rl_psi)} / ${F(d.tyre_rr_psi)} psi` },
      ],
    },
    {
      title: "AC Check",
      items: [
        { label: "Kompresor", value: YN(d.ac_compressor) },
        { label: "Kondensor", value: YN(d.ac_condenser) },
        { label: "Freon", value: F(d.ac_freon) },
        { label: "Suhu Kabin", value: F(d.ac_temp) },
      ],
    },
    {
      title: "Suspension & Brake",
      items: [
        { label: "Shock Depan", value: YN(d.insp_suspension_front) },
        { label: "Shock Belakang", value: YN(d.insp_suspension_rear) },
        { label: "Ball Joint", value: YN(d.insp_ball_joint) },
        { label: "Tie Rod", value: YN(d.insp_tie_rod) },
        { label: "Brake Depan", value: YN(d.insp_brake_front) },
        { label: "Brake Belakang", value: YN(d.insp_brake_rear) },
      ],
    },
    {
      title: "Waktu Pengerjaan",
      items: [
        { label: "Mulai", value: F(d.time_start) },
        { label: "Selesai", value: F(d.time_end) },
        { label: "Durasi", value: F(d.time_duration) },
        { label: "Mekanik", value: F(d.mechanic_name) },
      ],
    },
  ];

  const handleApprove = async () => {
    if (!signature) {
      toast.error("Silakan tanda tangan terlebih dahulu");
      return;
    }
    setSubmitting(true);
    try {
      // Bundled via SECURITY DEFINER RPC — customers can't UPDATE spk_orders
      // directly under RLS. RPC saves the signature and flips the status.
      const { error } = await supabase.rpc("customer_approve_spk", {
        _spk_id: spk.id,
        _signature: signature,
      });
      if (error) throw error;

      const { data: updatedSpk, error: reloadError } = await supabase
        .from("spk_orders")
        .select("id, spk_number, status, customer_id, booking_id, opened_at, ai_health_report, data")
        .eq("id", spk.id)
        .maybeSingle();

      if (reloadError) throw reloadError;
      if (!updatedSpk || updatedSpk.status === "awaiting_customer_approval") {
        toast.error("Approval belum memperbarui status SPK", {
          description: "Silakan coba lagi atau hubungi staff bengkel.",
        });
        return;
      }

      setSpk(updatedSpk as SpkRow);
      toast.success("Terima kasih! Persetujuan tersimpan.");
      await goBackToBooking();
    } catch (e: any) {
      toast.error("Gagal menyimpan persetujuan", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevisionSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("customer_request_spk_revision", {
        _spk_id: spk.id,
        _note: revisionNote,
      });
      if (error) throw error;
      toast.success("Permintaan revisi dikirim ke bengkel");
      setRejectOpen(false);
      await goBackToBooking();
    } catch (e: any) {
      toast.error("Gagal mengirim revisi", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const actionButtons = (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button
        variant="outline"
        className="h-12 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={submitting}
        onClick={() => setRejectOpen(true)}
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Perlu Revisi
      </Button>
      <Button
        className="h-12 bg-primary text-primary-foreground font-bold shadow-sm"
        disabled={submitting || !signature}
        onClick={handleApprove}
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        {submitting ? "Menyimpan…" : "Approve & Tanda Tangan"}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold truncate">Persetujuan SPK</h1>
            <p className="text-xs text-muted-foreground truncate">{spk.spk_number}</p>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase">{spk.status}</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4 space-y-4">
        {awaitingApproval && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 flex items-start gap-3">
              <PenLine className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-destructive">SPK menunggu persetujuan Anda</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Isi tanda tangan digital, lalu tekan tombol Approve di bawah halaman.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {alreadyApproved && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">SPK ini sudah Anda setujui</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Anda dapat kembali menandatangani ulang bila ada perubahan.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Ringkasan Pekerjaan</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Keluhan</p>
              <p className="text-sm">{complaint}</p>
            </div>
            {workItems.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Item Pekerjaan</p>
                <ul className="text-sm list-disc pl-5 space-y-0.5">
                  {workItems.map((w, i) => (<li key={i}>{typeof w === "string" ? w : JSON.stringify(w)}</li>))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Detail Lengkap SPK</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  onClick={() => navigate(`/spk/${spk.id}/print`)}
                >
                  <FileText className="h-3.5 w-3.5" /> Lihat Format SPK
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => navigate(`/spk/${spk.id}/print`)}
                >
                  <Download className="h-3.5 w-3.5" /> Unduh PDF
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {detailGroups.map((g) => (
                <div key={g.title} className="rounded-lg border border-border p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                    {g.title}
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {g.items.map((it) => (
                      <div key={it.label} className="flex items-baseline gap-2 border-b border-dashed border-border/70 pb-0.5">
                        <span className="text-[10px] uppercase text-muted-foreground shrink-0 min-w-[80px]">
                          {it.label}
                        </span>
                        <span className="text-xs font-medium break-words">{it.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {d.mechanic_note && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                    Catatan Mekanik
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{d.mechanic_note}</p>
                </div>
              )}

              {(d.signature_admin || d.signature_qc) && (
                <div className="grid grid-cols-2 gap-3">
                  <SignaturePreview label="Admin / Sales Advisor" dataUrl={d.signature_admin} />
                  <SignaturePreview label="Mekanik QC" dataUrl={d.signature_qc} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {health && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Analisis Kesehatan Kendaraan (AI)</p>
              </div>
              {health.overall_status && (
                <p className="text-sm mb-1">
                  Status keseluruhan: <span className="font-semibold">{health.overall_status}</span>
                </p>
              )}
              {health.summary && (
                <p className="text-xs text-muted-foreground">{health.summary}</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/40 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold">Form Tanda Tangan Digital</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Dengan menandatangani di bawah ini, Anda menyetujui pekerjaan yang tertera pada SPK ini.
            </p>
            <SignaturePad
              label="Tanda tangan Anda"
              onChange={(v) => setSignature(v)}
            />
            {!signature && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                Tanda tangan wajib diisi sebelum tombol Approve dapat ditekan.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="hidden pt-2 sm:block">{actionButtons}</div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto max-w-2xl space-y-2">
          {!signature && (
            <p className="text-center text-[11px] font-medium text-muted-foreground">
              Bubuhkan tanda tangan untuk mengaktifkan tombol approve.
            </p>
          )}
          {actionButtons}
        </div>
      </div>

      <AlertDialog open={rejectOpen} onOpenChange={(o) => !o && setRejectOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Minta Revisi</AlertDialogTitle>
            <AlertDialogDescription>
              Tuliskan bagian yang perlu direvisi. Bengkel akan menghubungi Anda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            placeholder="Contoh: mohon cek ulang bagian rem depan…"
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting || !revisionNote.trim()}
              onClick={(e) => { e.preventDefault(); handleRevisionSubmit(); }}
            >
              Kirim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GuardScreen({ title, message, onBack }: { title: string; message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
      <AlertTriangle className="h-10 w-10 text-muted-foreground/60" />
      <h1 className="text-lg font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      <Button variant="outline" onClick={onBack} className="mt-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
      </Button>
    </div>
  );
}