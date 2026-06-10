import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Loader2, Wallet } from "lucide-react";

type AdjustType = "credit" | "debit" | "adjust";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerId: string;
  customerName?: string;
  currentBalance?: number;
  onSaved?: () => void;
}

const CONFIRM_THRESHOLD = 500000;

const AdminCashbackAdjustDialog = ({
  open, onOpenChange, customerId, customerName, currentBalance, onSaved,
}: Props) => {
  const { toast } = useToast();
  const [type, setType] = useState<AdjustType>("credit");
  const [amount, setAmount] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const reset = () => {
    setType("credit");
    setAmount(null);
    setDescription("");
    setExpiresAt("");
  };

  const validate = (): string | null => {
    if (!amount || amount <= 0) return "Nominal harus lebih besar dari 0";
    if (description.trim().length < 3) return "Keterangan wajib diisi (min 3 karakter)";
    if (description.trim().length > 200) return "Keterangan maksimal 200 karakter";
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      toast({ variant: "destructive", title: "Tidak valid", description: err });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("admin_adjust_cashback" as any, {
      _user_id: customerId,
      _amount: amount,
      _type: type,
      _description: description.trim(),
      _expires_at: type === "credit" && expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
      return;
    }
    toast({
      title: "Berhasil",
      description: `Saldo baru: Rp ${Number(data ?? 0).toLocaleString("id-ID")}`,
    });
    reset();
    onOpenChange(false);
    onSaved?.();
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      toast({ variant: "destructive", title: "Tidak valid", description: err });
      return;
    }
    if ((amount ?? 0) >= CONFIRM_THRESHOLD) {
      setConfirmOpen(true);
    } else {
      submit();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Sesuaikan Saldo Cashback
            </DialogTitle>
            <DialogDescription>
              {customerName ? `Untuk ${customerName}.` : ""} Saldo saat ini:{" "}
              <span className="font-semibold text-foreground">
                Rp {Number(currentBalance ?? 0).toLocaleString("id-ID")}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Jenis</Label>
              <Select value={type} onValueChange={(v) => setType(v as AdjustType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Tambah saldo (credit)</SelectItem>
                  <SelectItem value="debit">Kurangi saldo (debit)</SelectItem>
                  <SelectItem value="adjust">Penyesuaian (adjust)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nominal</Label>
              <CurrencyInput value={amount} onValueChange={setAmount} placeholder="0" />
            </div>

            <div className="space-y-2">
              <Label>Keterangan / Alasan</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="cth: Kompensasi keluhan #123, bonus loyalitas, koreksi salah credit"
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{description.length}/200</p>
            </div>

            {type === "credit" && (
              <div className="space-y-2">
                <Label>Berlaku sampai (opsional)</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Kosongkan = default 1 tahun dari sekarang.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi nominal besar</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan {type === "debit" ? "mengurangi" : type === "adjust" ? "menyesuaikan" : "menambah"}{" "}
              <span className="font-semibold">Rp {Number(amount ?? 0).toLocaleString("id-ID")}</span>{" "}
              ke saldo cashback {customerName || "pelanggan"}. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { setConfirmOpen(false); await submit(); }}
              disabled={submitting}
            >
              Ya, lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminCashbackAdjustDialog;