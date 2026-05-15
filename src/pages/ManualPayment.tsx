import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Loader2, Upload, CheckCircle2, Clock, XCircle, Banknote, QrCode, FileText, Eye,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch_label: string | null;
  logo_url: string | null;
  notes: string | null;
}
interface QrisEntry {
  id: string;
  label: string;
  qris_image_url: string;
  merchant_name: string;
  notes: string | null;
}
interface BookingRow {
  id: string;
  user_id: string;
  service_name: string;
  service_price: number;
  payment_status: string;
  branch: string | null;
}
interface ProofRow {
  id: string;
  status: string;
  reject_reason: string | null;
  created_at: string;
  proof_url: string;
  method: string;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const proofSchema = z.object({
  sender_name: z.string().trim().min(2, "Nama pengirim minimal 2 karakter").max(100),
  sender_bank: z.string().trim().max(60).optional(),
  transfer_amount: z.number().positive("Nominal harus > 0"),
  transfer_date: z.string().min(1, "Tanggal wajib diisi"),
  notes: z.string().max(500).optional(),
});

const MAX_PROOF_SIZE = 10 * 1024 * 1024; // 10MB

const isPdfFile = (f: File) =>
  f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isImageFile = (f: File) =>
  f.type.startsWith("image/") ||
  /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name);
const sanitizedExt = (f: File) => {
  const dot = f.name.lastIndexOf(".");
  const rawExt = dot > -1 ? f.name.slice(dot + 1) : "";
  const mimeExt = (f.type.split("/")[1] || "").replace("jpeg", "jpg");
  const ext = (rawExt || mimeExt || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
  return ext || "jpg";
};
const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url);

const ManualPayment = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const initialMethod = (params.get("method") === "qris" ? "qris" : "transfer") as "transfer" | "qris";

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [qris, setQris] = useState<QrisEntry | null>(null);
  const [latestProof, setLatestProof] = useState<ProofRow | null>(null);
  const [tab, setTab] = useState<"transfer" | "qris">(initialMethod);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Local preview for selected file (image only)
  useEffect(() => {
    if (!file || !isImageFile(file) || isPdfFile(file)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!bookingId || !user) return;
    const load = async () => {
      setLoading(true);
      const [bRes, aRes, qRes, pRes] = await Promise.all([
        supabase.from("bookings").select("id,user_id,service_name,service_price,payment_status,branch").eq("id", bookingId).maybeSingle(),
        supabase.from("manual_payment_accounts").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("manual_payment_qris").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("manual_payment_proofs").select("id,status,reject_reason,created_at,proof_url,method").eq("booking_id", bookingId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (bRes.data) {
        setBooking(bRes.data as BookingRow);
        setTransferAmount(String(bRes.data.service_price ?? ""));
        setSenderName(user.user_metadata?.full_name || user.email || "");
      }
      setAccounts((aRes.data as BankAccount[]) || []);
      const qrisList = ((qRes.data as (QrisEntry & { branch: string | null })[]) || []);
      const bookingBranch = (bRes.data as { branch: string | null } | null)?.branch ?? null;
      const branchMatch = bookingBranch ? qrisList.find((q) => q.branch === bookingBranch) : null;
      const globalMatch = qrisList.find((q) => !q.branch);
      setQris(branchMatch || globalMatch || qrisList[0] || null);
      setLatestProof((pRes.data as ProofRow | null) || null);
      if ((aRes.data || []).length > 0) setSelectedBankId((aRes.data as BankAccount[])[0].id);
      setLoading(false);
    };
    load();
  }, [bookingId, user]);

  const copyText = async (text: string, label = "Disalin") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  const handleSubmit = async () => {
    if (!user || !booking || !bookingId) return;
    if (!file) {
      toast.error("Wajib upload bukti transfer (gambar/PDF).");
      return;
    }
    if (file.size > MAX_PROOF_SIZE) {
      toast.error("Ukuran file maksimal 10MB.");
      return;
    }
    if (!isImageFile(file) && !isPdfFile(file)) {
      toast.error("Format hanya gambar (JPG/PNG/WEBP/HEIC) atau PDF.");
      return;
    }
    const parsed = proofSchema.safeParse({
      sender_name: senderName,
      sender_bank: senderBank || undefined,
      transfer_amount: Number(transferAmount),
      transfer_date: transferDate,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Form tidak valid");
      return;
    }
    if (tab === "transfer" && !selectedBankId) {
      toast.error("Pilih rekening tujuan terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    try {
      const ext = sanitizedExt(file);
      const path = `${user.id}/${bookingId}/${Date.now()}.${ext}`;
      const contentType =
        file.type ||
        (isPdfFile(file) ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`);
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: false, contentType });
      if (upErr) {
        const m = upErr.message || "";
        if (/exceeded|too large|size/i.test(m)) throw new Error("File terlalu besar untuk diupload.");
        if (/not authorized|permission|policy|row-level/i.test(m)) throw new Error("Tidak diizinkan mengupload. Coba sign out & login ulang.");
        if (/bucket/i.test(m)) throw new Error("Penyimpanan bukti tidak tersedia. Hubungi admin.");
        throw new Error("Upload gagal: " + m);
      }
      const { data: pub } = supabase.storage.from("payment-proofs").getPublicUrl(path);

      const { data, error } = await supabase.rpc("submit_manual_payment_proof", {
        _booking_id: bookingId,
        _method: tab,
        _bank_account_id: tab === "transfer" ? selectedBankId : null,
        _qris_id: tab === "qris" ? qris?.id ?? null : null,
        _sender_name: parsed.data.sender_name,
        _sender_bank: parsed.data.sender_bank ?? null,
        _transfer_amount: parsed.data.transfer_amount,
        _transfer_date: parsed.data.transfer_date,
        _proof_url: pub.publicUrl,
        _notes: parsed.data.notes ?? null,
      });
      if (error) throw error;
      const res = data as { success: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || "Gagal kirim bukti");

      toast.success("Bukti berhasil dikirim. Menunggu verifikasi admin.");
      // Refresh latestProof so user sees thumbnail immediately
      const { data: refreshed } = await supabase
        .from("manual_payment_proofs")
        .select("id,status,reject_reason,created_at,proof_url,method")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLatestProof((refreshed as ProofRow | null) || null);
      setFile(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal mengirim bukti";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Booking tidak ditemukan.</p>
        <Button asChild><Link to="/">Kembali</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-16 space-y-3">
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pembayaran Manual</CardTitle>
            <p className="text-xs text-muted-foreground">{booking.service_name}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total tagihan</p>
                <p className="text-2xl font-bold text-primary">{formatIDR(booking.service_price)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => copyText(String(booking.service_price), "Nominal disalin")}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Salin
              </Button>
            </div>

            {latestProof && (
              <div className={`rounded-lg border px-3 py-2 text-xs ${
                latestProof.status === "pending" ? "border-amber-400/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" :
                latestProof.status === "approved" ? "border-emerald-400/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" :
                "border-red-400/40 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200"
              }`}>
                <div className="flex items-center gap-2 font-medium">
                  {latestProof.status === "pending" && <><Clock className="h-3.5 w-3.5" /> Bukti pembayaran sedang diverifikasi.</>}
                  {latestProof.status === "approved" && <><CheckCircle2 className="h-3.5 w-3.5" /> Pembayaran sudah diverifikasi.</>}
                  {latestProof.status === "rejected" && <><XCircle className="h-3.5 w-3.5" /> Bukti ditolak. {latestProof.reject_reason ? `Alasan: ${latestProof.reject_reason}` : "Silakan upload ulang."}</>}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {isPdfUrl(latestProof.proof_url) ? (
                    <div className="h-14 w-14 rounded border bg-background/60 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={latestProof.proof_url}
                      alt="Bukti"
                      className="h-14 w-14 object-cover rounded border"
                      loading="lazy"
                    />
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 h-8"
                    onClick={() => setViewerOpen(true)}
                  >
                    <Eye className="h-3.5 w-3.5" /> Lihat bukti
                  </Button>
                  {latestProof.status !== "rejected" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => navigate(`/my-booking/${bookingId}`)}
                    >
                      Kembali ke booking
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "transfer" | "qris")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transfer" className="gap-1"><Banknote className="h-4 w-4" /> Transfer Bank</TabsTrigger>
            <TabsTrigger value="qris" className="gap-1"><QrCode className="h-4 w-4" /> QRIS</TabsTrigger>
          </TabsList>

          <TabsContent value="transfer" className="space-y-3 mt-4">
            {accounts.length === 0 ? (
              <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
                Belum ada rekening tersedia. Hubungi admin via WhatsApp.
              </CardContent></Card>
            ) : accounts.map((acc) => {
              const selected = selectedBankId === acc.id;
              return (
                <button key={acc.id} type="button" onClick={() => setSelectedBankId(acc.id)}
                  className={`w-full text-left rounded-xl border p-3 transition ${selected ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:bg-muted/40"}`}>
                  <div className="flex items-center gap-3">
                    {acc.logo_url ? (
                      <img src={acc.logo_url} alt={acc.bank_name} className="h-8 w-8 object-contain rounded" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{acc.bank_name.slice(0, 3)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{acc.bank_name} {acc.branch_label && <span className="text-muted-foreground font-normal">· {acc.branch_label}</span>}</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-base">{acc.account_number}</p>
                        <button type="button" onClick={(e) => { e.stopPropagation(); copyText(acc.account_number, "Nomor rekening disalin"); }}
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                          <Copy className="h-3 w-3" /> salin
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">a.n {acc.account_holder}</p>
                      {acc.notes && <p className="text-[11px] text-muted-foreground mt-1">{acc.notes}</p>}
                    </div>
                    {selected && <Badge variant="outline" className="border-primary/40 text-primary">Dipilih</Badge>}
                  </div>
                </button>
              );
            })}
          </TabsContent>

          <TabsContent value="qris" className="space-y-3 mt-4">
            {!qris ? (
              <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
                Belum ada QRIS aktif. Hubungi admin.
              </CardContent></Card>
            ) : (
              <Card>
                <CardContent className="py-4 text-center space-y-2">
                  <p className="text-sm font-semibold">{qris.merchant_name}</p>
                  <img src={qris.qris_image_url} alt="QRIS" className="mx-auto max-w-[260px] w-full rounded-lg border" />
                  <p className="text-xs text-muted-foreground">{qris.label}</p>
                  {qris.notes && <p className="text-[11px] text-muted-foreground">{qris.notes}</p>}
                  <Button size="sm" variant="outline" asChild>
                    <a href={qris.qris_image_url} download target="_blank" rel="noopener noreferrer">Download QR</a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Konfirmasi & Upload Bukti</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="sender">Nama Pengirim *</Label>
                <Input id="sender" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
              </div>
              {tab === "transfer" && (
                <div className="col-span-2">
                  <Label htmlFor="sb">Bank Pengirim</Label>
                  <Input id="sb" value={senderBank} onChange={(e) => setSenderBank(e.target.value)} placeholder="cth. BCA" />
                </div>
              )}
              <div>
                <Label htmlFor="amt">Nominal *</Label>
                <CurrencyInput
                  id="amt"
                  value={transferAmount === "" ? null : Number(transferAmount)}
                  onValueChange={(v) => setTransferAmount(v === null ? "" : String(v))}
                />
              </div>
              <div>
                <Label htmlFor="td">Tanggal Transfer *</Label>
                <Input id="td" type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="proof">Bukti Transfer (Foto/PDF, max 10MB) *</Label>
                <Input id="proof" type="file" accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                {file && <p className="text-[11px] text-muted-foreground mt-1">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
                {file && (
                  <div className="mt-2 flex items-center gap-2">
                    {previewUrl ? (
                      <img src={previewUrl} alt="preview" className="h-20 w-20 object-cover rounded border" />
                    ) : isPdfFile(file) ? (
                      <div className="h-20 w-20 rounded border bg-muted/40 flex flex-col items-center justify-center text-[10px] text-muted-foreground">
                        <FileText className="h-6 w-6" /> PDF
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded border bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">
                        File
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <Label htmlFor="nt">Catatan (opsional)</Label>
                <Textarea id="nt" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Kirim Bukti & Tunggu Verifikasi
            </Button>
          </CardContent>
        </Card>
      </div>

      {latestProof && (
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Bukti Pembayaran</DialogTitle>
            </DialogHeader>
            {isPdfUrl(latestProof.proof_url) ? (
              <iframe
                src={latestProof.proof_url}
                title="Bukti PDF"
                className="w-full h-[70vh] rounded border"
              />
            ) : (
              <img
                src={latestProof.proof_url}
                alt="Bukti"
                className="w-full max-h-[70vh] object-contain rounded"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" asChild>
                <a href={latestProof.proof_url} target="_blank" rel="noopener noreferrer">
                  Buka di tab baru
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ManualPayment;