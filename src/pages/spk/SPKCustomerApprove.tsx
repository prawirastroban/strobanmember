// Customer self-approval page for SPKs originated from an app booking.
// Accessible at /spk/:id/approve. Guarded to the SPK owner (customer_id === auth.uid()).
// Walk-in SPKs (no booking_id) fall back to in-shop signature at Canvas Section 11.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Sparkles, Wrench, AlertTriangle, Loader2 } from "lucide-react";
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
import { WorkflowEngine } from "@/runtime/spk/WorkflowEngine";
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
        onBack={() => navigate("/my-booking")}
      />
    );
  }

  // Guard 1: must be owner of the SPK.
  if (user && spk.customer_id && spk.customer_id !== user.id) {
    return (
      <GuardScreen
        title="Tidak diizinkan"
        message="Halaman approval ini hanya untuk pemilik SPK."
        onBack={() => navigate("/my-booking")}
      />
    );
  }

  // Guard 2: only app-booking SPKs get self-approval. Walk-ins sign at the shop.
  if (!spk.booking_id) {
    return (
      <GuardScreen
        title="Approval di bengkel"
        message="SPK ini bukan berasal dari booking aplikasi. Silakan tanda tangan langsung di device bengkel saat serah-terima."
        onBack={() => navigate("/my-booking")}
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

  const persistSignature = async (dataUrl: string | null, source: "app" | null, extra?: Record<string, any>) => {
    const nextData = {
      ...(dataObj ?? {}),
      signature_customer: dataUrl,
      signature_customer_source: source,
      signature_customer_signed_at: dataUrl ? new Date().toISOString() : null,
      ...(extra ?? {}),
    };
    const { error } = await supabase.from("spk_orders").update({ data: nextData as any }).eq("id", spk.id);
    return error;
  };

  const handleApprove = async () => {
    if (!signature) {
      toast.error("Silakan tanda tangan terlebih dahulu");
      return;
    }
    setSubmitting(true);
    try {
      const err = await persistSignature(signature, "app");
      if (err) throw err;

      // Attempt workflow transition — best-effort. If it fails (e.g. not in the
      // exact expected status), the signature is still saved.
      if (awaitingApproval) {
        await WorkflowEngine.run({
          spk_id: spk.id,
          workflow_code: "spk_default",
          to_status: "qc_pending",
          reason: "customer_approved_via_app",
          ctx: { actor: { user_id: user?.id ?? null, role: "customer" as any } },
        });
      }

      toast.success("Terima kasih! Persetujuan tersimpan.");
      navigate("/my-booking");
    } catch (e: any) {
      toast.error("Gagal menyimpan persetujuan", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevisionSubmit = async () => {
    setSubmitting(true);
    try {
      await supabase
        .from("spk_orders")
        .update({
          data: {
            ...(dataObj ?? {}),
            customer_revision_note: revisionNote,
            customer_revision_requested_at: new Date().toISOString(),
          } as any,
        })
        .eq("id", spk.id);
      toast.success("Permintaan revisi dikirim ke bengkel");
      setRejectOpen(false);
      navigate("/my-booking");
    } catch (e: any) {
      toast.error("Gagal mengirim revisi", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

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

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Tanda Tangan Persetujuan</p>
            <p className="text-xs text-muted-foreground">
              Dengan menandatangani di bawah ini, Anda menyetujui pekerjaan yang tertera pada SPK ini.
            </p>
            <SignaturePad
              label="Tanda tangan Anda"
              onChange={(v) => setSignature(v)}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={submitting}
            onClick={() => setRejectOpen(true)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Perlu Revisi
          </Button>
          <Button
            className="bg-primary text-primary-foreground"
            disabled={submitting || !signature}
            onClick={handleApprove}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {submitting ? "Menyimpan…" : "Setuju & Tanda Tangan"}
          </Button>
        </div>
      </main>

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