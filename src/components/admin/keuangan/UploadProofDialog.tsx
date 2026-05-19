import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, QrCode, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  customerUserId: string;
  customerName?: string;
  servicePrice?: number;
  defaultMethod?: string | null;
  onUploaded?: () => void;
}

const UploadProofDialog = ({
  open, onOpenChange, bookingId, customerUserId, customerName, servicePrice, defaultMethod, onUploaded,
}: Props) => {
  const initialMethod: "transfer" | "qris" =
    defaultMethod === "qris" ? "qris" : "transfer";
  const [method, setMethod] = useState<"transfer" | "qris">(initialMethod);
  const [senderName, setSenderName] = useState(customerName || "");
  const [senderBank, setSenderBank] = useState("");
  const [amount, setAmount] = useState<string>(String(servicePrice ?? ""));
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [markPaid, setMarkPaid] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMethod(defaultMethod === "qris" ? "qris" : "transfer");
      setSenderName(customerName || "");
      setSenderBank("");
      setAmount(String(servicePrice ?? ""));
      setTransferDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setFile(null);
      setMarkPaid(true);
    }
  }, [open, defaultMethod, customerName, servicePrice]);

  const handleSubmit = async () => {
    if (!file) { toast.error("Wajib pilih file bukti."); return; }
    if (file.size > MAX) { toast.error("Maksimal 10MB."); return; }
    if (!isImg(file) && !isPdf(file)) { toast.error("Hanya gambar atau PDF."); return; }
    const parsed = schema.safeParse({
      sender_name: senderName,
      sender_bank: senderBank || undefined,
      transfer_amount: Number(amount),
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
      const path = `${customerUserId}/${bookingId}/admin-${Date.now()}.${ext}`;
      const contentType = file.type || (isPdf(file) ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`);
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: false, contentType });
      if (upErr) throw new Error("Upload gagal: " + upErr.message);
      const { data: pub } = supabase.storage.from("payment-proofs").getPublicUrl(path);

      const { data, error } = await supabase.rpc("staff_submit_manual_payment_proof", {
        _booking_id: bookingId,
        _method: method,
        _sender_name: parsed.data.sender_name,
        _sender_bank: parsed.data.sender_bank ?? null,
        _transfer_amount: parsed.data.transfer_amount,
        _transfer_date: parsed.data.transfer_date,
        _proof_url: pub.publicUrl,
        _notes: parsed.data.notes ?? null,
        _mark_paid: markPaid,
      });
      if (error) throw error;
      const res = data as { success: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || "Gagal menyimpan bukti");

      toast.success(markPaid ? "Bukti tersimpan & ditandai Lunas" : "Bukti tersimpan, menunggu verifikasi");
      onUploaded?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengupload bukti");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" /> Upload Bukti Pembayaran
          </DialogTitle>
          <DialogDescription className="text-xs">
            Lampirkan bukti transfer/QRIS untuk pelanggan yang bayar di cabang.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Tabs value={method} onValueChange={(v) => setMethod(v as "transfer" | "qris")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transfer" className="gap-1"><Banknote className="h-3.5 w-3.5" /> Transfer</TabsTrigger>
              <TabsTrigger value="qris" className="gap-1"><QrCode className="h-3.5 w-3.5" /> QRIS</TabsTrigger>
            </TabsList>
          </Tabs>

          <div>
            <Label htmlFor="sender" className="text-xs">Nama Pengirim *</Label>
            <Input id="sender" value={senderName} onChange={(e) => setSenderName(e.target.value)} className="h-9" />
          </div>
          {method === "transfer" && (
            <div>
              <Label htmlFor="bank" className="text-xs">Bank Pengirim</Label>
              <Input id="bank" value={senderBank} onChange={(e) => setSenderBank(e.target.value)} placeholder="cth: BCA" className="h-9" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nominal *</Label>
              <CurrencyInput
                value={amount === "" ? null : Number(amount)}
                onValueChange={(v) => setAmount(v == null ? "" : String(v))}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="td" className="text-xs">Tanggal Transfer *</Label>
              <Input id="td" type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} className="h-9" />
            </div>
          </div>
          <div>
            <Label htmlFor="notes" className="text-xs">Catatan (opsional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div>
            <Label htmlFor="file" className="text-xs">File Bukti (Gambar / PDF, maks 10MB) *</Label>
            <Input
              id="file"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="h-9"
            />
            {file && <p className="text-[11px] text-muted-foreground mt-1 truncate">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
          </div>
          <label className="flex items-center gap-2 rounded-lg border p-2 bg-muted/30 cursor-pointer">
            <Checkbox checked={markPaid} onCheckedChange={(v) => setMarkPaid(v === true)} />
            <span className="text-xs">Tandai pembayaran langsung <span className="font-semibold">Lunas</span></span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Batal</Button>
          <Button onClick={handleSubmit} disabled={busy} className="gap-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Simpan Bukti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadProofDialog;