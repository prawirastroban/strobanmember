import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Loader2, Upload, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const MAX = 10 * 1024 * 1024;
const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isImg = (f: File) =>
  f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name);
const extOf = (f: File) => {
  const dot = f.name.lastIndexOf(".");
  const raw = dot > -1 ? f.name.slice(dot + 1) : "";
  const mime = (f.type.split("/")[1] || "").replace("jpeg", "jpg");
  return ((raw || mime || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg").slice(0, 5);
};

const schema = z.object({
  sender_name: z.string().trim().min(2, "Nama pengirim minimal 2 karakter").max(100),
  sender_bank: z.string().trim().max(60).optional(),
  transfer_amount: z.number().positive("Nominal harus > 0"),
  transfer_date: z.string().min(1, "Tanggal wajib diisi"),
  notes: z.string().max(500).optional(),
});

interface Props {
  bookingId: string;
  branch: string | null;
  method: "transfer" | "qris";
  amount: number;
  onUploaded?: () => void;
}

export function InlineProofUpload({ bookingId, branch, method, amount, onUploaded }: Props) {
  const { user } = useAuth();
  const [senderName, setSenderName] = useState<string>(
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email || "",
  );
  const [senderBank, setSenderBank] = useState("");
  const [transferAmount, setTransferAmount] = useState<string>(String(amount || ""));
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bankId, setBankId] = useState<string | null>(null);
  const [qrisId, setQrisId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTransferAmount(String(amount || ""));
  }, [amount]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (method === "transfer") {
        const { data } = await supabase
          .from("manual_payment_accounts")
          .select("id, branch")
          .eq("is_active", true)
          .order("sort_order");
        const all = (data as { id: string; branch: string | null }[]) || [];
        const match = (branch ? all.find((a) => a.branch === branch) : null) || all.find((a) => !a.branch) || all[0];
        if (!cancelled) setBankId(match?.id ?? null);
      } else {
        const { data } = await supabase
          .from("manual_payment_qris")
          .select("id, branch")
          .eq("is_active", true)
          .order("sort_order");
        const all = (data as { id: string; branch: string | null }[]) || [];
        const match = (branch ? all.find((q) => q.branch === branch) : null) || all.find((q) => !q.branch) || all[0];
        if (!cancelled) setQrisId(match?.id ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branch, method]);

  useEffect(() => {
    if (!file || !isImg(file) || isPdf(file)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submit = async () => {
    if (!user) {
      toast.error("Silakan login ulang.");
      return;
    }
    if (!file) {
      toast.error("Pilih file bukti dari Galeri atau File HP Anda.");
      return;
    }
    if (file.size > MAX) {
      toast.error("Ukuran file maksimal 10MB.");
      return;
    }
    if (!isImg(file) && !isPdf(file)) {
      toast.error("Format hanya gambar (JPG/PNG/WEBP/HEIC) atau PDF.");
      return;
    }
    const parsed = schema.safeParse({
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

    setBusy(true);
    try {
      const ext = extOf(file);
      const path = `${user.id}/${bookingId}/${Date.now()}.${ext}`;
      const contentType =
        file.type || (isPdf(file) ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`);
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: false, contentType });
      if (upErr) throw new Error("Upload gagal: " + upErr.message);
      const { data: pub } = supabase.storage.from("payment-proofs").getPublicUrl(path);

      const { data, error } = await supabase.rpc("submit_manual_payment_proof", {
        _booking_id: bookingId,
        _method: method,
        _bank_account_id: method === "transfer" ? bankId : null,
        _qris_id: method === "qris" ? qrisId : null,
        _sender_name: parsed.data.sender_name,
        _sender_bank: parsed.data.sender_bank ?? null,
        _transfer_amount: parsed.data.transfer_amount,
        _transfer_date: parsed.data.transfer_date,
        _proof_url: pub.publicUrl,
        _notes: parsed.data.notes ?? null,
      });
      if (error) throw error;
      const res = data as { success: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || "Gagal menyimpan bukti");

      toast.success("Bukti berhasil dikirim. Menunggu verifikasi admin.");
      setFile(null);
      setNotes("");
      onUploaded?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim bukti");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label htmlFor="ip-sender" className="text-xs">Nama Pengirim *</Label>
          <Input id="ip-sender" className="h-9" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
        </div>
        {method === "transfer" && (
          <div className="col-span-2">
            <Label htmlFor="ip-bank" className="text-xs">Bank Pengirim</Label>
            <Input id="ip-bank" className="h-9" value={senderBank} onChange={(e) => setSenderBank(e.target.value)} placeholder="cth: BCA" />
          </div>
        )}
        <div>
          <Label htmlFor="ip-amt" className="text-xs">Nominal *</Label>
          <CurrencyInput
            id="ip-amt"
            className="h-9"
            value={transferAmount === "" ? null : Number(transferAmount)}
            onValueChange={(v) => setTransferAmount(v === null ? "" : String(v))}
          />
        </div>
        <div>
          <Label htmlFor="ip-td" className="text-xs">Tanggal Transfer *</Label>
          <Input id="ip-td" type="date" className="h-9" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="ip-file" className="text-xs">Bukti (Foto / PDF, maks 10MB) *</Label>
          {/* Hidden input + tombol custom → reliable di Chrome Android / iOS / WebView */}
          <input
            ref={fileRef}
            id="ip-file"
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="w-full h-11 justify-start gap-3 rounded-xl border-dashed"
          >
            <Upload className="h-4 w-4 text-primary" />
            <span className="truncate text-xs">{file ? file.name : "Pilih File dari Galeri / Dokumen"}</span>
          </Button>
          <p className="text-[10.5px] text-muted-foreground mt-1 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> Pilih dari Galeri atau File di HP Anda.
          </p>
          {file && (
            <div className="mt-2 flex items-center gap-2">
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="h-16 w-16 object-cover rounded border" />
              ) : isPdf(file) ? (
                <div className="h-16 w-16 rounded border bg-muted/40 flex flex-col items-center justify-center text-[10px] text-muted-foreground">
                  <FileText className="h-5 w-5" /> PDF
                </div>
              ) : (
                <div className="h-16 w-16 rounded border bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">
                  File
                </div>
              )}
              <div className="text-[11px] text-muted-foreground truncate">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </div>
            </div>
          )}
        </div>
        <div className="col-span-2">
          <Label htmlFor="ip-notes" className="text-xs">Catatan (opsional)</Label>
          <Textarea id="ip-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <Button onClick={submit} disabled={busy} className="w-full gap-2 h-10 rounded-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Kirim Bukti Pembayaran
      </Button>
    </div>
  );
}

export default InlineProofUpload;