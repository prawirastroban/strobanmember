import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Banknote, QrCode, Loader2, CheckCircle2, XCircle, Clock, Sparkles, MapPin } from "lucide-react";
import { toast } from "sonner";
import BookingQRCard from "@/components/booking/BookingQRCard";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  amount: number;
  serviceName: string;
  bookingStatus?: string;
  onPaymentComplete?: () => void;
}

interface SnapResult {
  transaction_status?: string;
  status_code?: string;
  order_id?: string;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: {
        onSuccess?: (r: SnapResult) => void;
        onPending?: (r: SnapResult) => void;
        onError?: (r: SnapResult) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

const PAYMENT_METHODS = [
  // Midtrans dinonaktifkan sementara — akan diaktifkan kembali setelah akun Midtrans di-ACC.
  // { value: "midtrans", label: "Midtrans (Otomatis)", icon: Sparkles, description: "QRIS, GoPay, OVO, VA, Kartu Kredit — terverifikasi otomatis", auto: true },
  { value: "pay_at_workshop", label: "Bayar Tunai di Tempat", icon: Banknote, description: "Bayar cash saat datang ke bengkel. Perlu verifikasi admin.", auto: false },
  { value: "transfer", label: "Bank Transfer Manual", icon: CreditCard, description: "Transfer manual. Perlu konfirmasi admin.", auto: false },
  { value: "qris", label: "QRIS Manual", icon: QrCode, description: "Scan QR. Perlu konfirmasi admin.", auto: false },
];

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);

const SNAP_SCRIPT_URL = "https://app.sandbox.midtrans.com/snap/snap.js";

const loadSnapScript = (clientKey: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.snap) return resolve();
    const existing = document.querySelector(`script[src="${SNAP_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Snap load failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = SNAP_SCRIPT_URL;
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Snap load failed"));
    document.head.appendChild(script);
  });

const PaymentDialog = ({ open, onOpenChange, bookingId, amount, serviceName, bookingStatus, onPaymentComplete }: PaymentDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<string>(() => "transfer");
  const [step, setStep] = useState<"select" | "processing" | "result">("select");
  const [result, setResult] = useState<"success" | "pending" | "awaiting" | "pay_later" | "failed" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("select");
    setResult(null);
  }, [open]);

  // Bayar tunai di tempat hanya tersedia setelah booking dikonfirmasi admin
  // (atau pada saat check-in/sedang dikerjakan). Selama masih menunggu konfirmasi,
  // opsi ini disembunyikan.
  const payAtWorkshopAllowed = bookingStatus
    ? ["confirmed", "checked_in", "in_progress", "finishing"].includes(bookingStatus)
    : false;
  const availableMethods = PAYMENT_METHODS.filter(
    (pm) => pm.value !== "pay_at_workshop" || payAtWorkshopAllowed
  );

  useEffect(() => {
    if (method === "pay_at_workshop" && !payAtWorkshopAllowed) {
      setMethod("transfer");
    }
  }, [method, payAtWorkshopAllowed]);

  const handleMidtransPay = async () => {
    if (!user) return;
    if (!amount || amount <= 0) {
      toast.error("Nominal pembayaran tidak valid (Rp 0). Hubungi admin untuk update harga booking.");
      return;
    }
    setIsSubmitting(true);
    setStep("processing");

    try {
      const { data, error } = await supabase.functions.invoke("midtrans-create-transaction", {
        body: {
          booking_id: bookingId,
          amount,
          customer_name: user.user_metadata?.full_name || user.email,
          customer_email: user.email,
          customer_phone: user.user_metadata?.phone || "",
          item_name: serviceName,
        },
      });

      if (error || !data?.snap_token) {
        throw new Error(error?.message || "Failed to create transaction");
      }

      await loadSnapScript(data.client_key);
      if (!window.snap) throw new Error("Snap not loaded");

      window.snap.pay(data.snap_token, {
        onSuccess: () => {
          setResult("success");
          setStep("result");
          toast.success("Pembayaran berhasil! Mengarahkan...");
          onPaymentComplete?.();
          onOpenChange(false);
          setTimeout(() => navigate(`/my-booking/${bookingId}`), 400);
        },
        onPending: () => {
          setResult("pending");
          setStep("result");
          toast.info("Menunggu pembayaran...");
          onPaymentComplete?.();
          onOpenChange(false);
          setTimeout(() => navigate(`/my-booking/${bookingId}`), 400);
        },
        onError: (r) => {
          console.error("Snap onError:", r);
          setResult("failed");
          setStep("result");
          toast.error("Pembayaran gagal");
        },
        onClose: () => {
          setStep("select");
          toast.info("Anda dapat menyelesaikan pembayaran kapan saja dari halaman status booking.");
          onOpenChange(false);
          setTimeout(() => navigate(`/my-booking/${bookingId}`), 300);
        },
      });
    } catch (err: unknown) {
      console.error("Midtrans error:", err);
      const msg = err instanceof Error ? err.message : "Gagal memulai pembayaran";
      setResult("failed");
      setStep("result");
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualPay = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setStep("processing");

    try {
      const isPayLater = method === "pay_at_workshop";

      // Upsert payment record (booking_id is unique). Manual methods always start
      // as 'pending' and require staff/admin confirmation via confirm_manual_payment RPC.
      const { data: existing } = await supabase
        .from("payments")
        .select("id, payment_status")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (existing) {
        if (existing.payment_status === "paid") {
          toast.info("Pembayaran sudah lunas.");
          onPaymentComplete?.();
          onOpenChange(false);
          return;
        }
        const { error: updErr } = await supabase
          .from("payments")
          .update({
            amount,
            payment_method: method,
            payment_status: "pending",
          })
          .eq("id", existing.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from("payments")
          .insert({
            booking_id: bookingId,
            user_id: user.id,
            amount,
            payment_method: method,
            payment_status: "pending",
          });
        if (insErr) throw insErr;
      }

      // Update booking to indicate hint of payment intent.
      // Booking status remains 'pending' until staff confirms the payment
      // (which triggers set_waiting_confirmation_on_payment).
      await supabase.from("bookings")
        .update({ payment_status: isPayLater ? "pay_later" : "awaiting_confirmation" })
        .eq("id", bookingId);

      setResult(isPayLater ? "pay_later" : "awaiting");
      setStep("result");

      if (isPayLater) {
        toast.success("Booking dijadwalkan. Bayar saat datang ke bengkel.");
      } else {
        toast.info("Bukti pembayaran akan diverifikasi admin.");
      }

      onPaymentComplete?.();
      onOpenChange(false);
      setTimeout(() => navigate(`/my-booking/${bookingId}`), 700);
    } catch (err) {
      console.error("Payment error:", err);
      setResult("failed");
      setStep("result");
      toast.error("Gagal memproses pembayaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePay = () => {
    if (method === "midtrans") handleMidtransPay();
    else handleManualPay();
  };

  const handleRetry = () => {
    setStep("select");
    setResult(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    if (result) onPaymentComplete?.();
    const wasResolved = result === "success" || result === "awaiting" || result === "pay_later";
    setTimeout(() => {
      setStep("select");
      setResult(null);
      if (wasResolved) navigate(`/my-booking/${bookingId}`);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Pembayaran
          </DialogTitle>
          <DialogDescription>{serviceName}</DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-5">
            <div className="text-center py-3">
              <p className="text-sm text-muted-foreground">Total Pembayaran</p>
              <p className="text-3xl font-bold text-primary">{formatIDR(amount)}</p>
            </div>

            <RadioGroup value={method} onValueChange={setMethod} className="space-y-2">
              {availableMethods.map((pm) => (
                <Label
                  key={pm.value}
                  htmlFor={pm.value}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:ring-2 has-[:checked]:ring-primary/50 has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value={pm.value} id={pm.value} />
                  <pm.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm flex items-center gap-2">
                      {pm.label}
                      {pm.auto ? (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-600">Otomatis</Badge>
                      ) : pm.value === "pay_at_workshop" ? (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-500/40 text-blue-600">Bayar Nanti</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary">Verifikasi</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{pm.description}</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>

            <Button onClick={handlePay} disabled={isSubmitting} className="w-full gap-2">
              <CreditCard className="h-4 w-4" />
              {method === "pay_at_workshop" ? "Lanjutkan Bayar Tunai di Tempat" : method === "midtrans" ? "Bayar Sekarang" : "Kirim & Tunggu Verifikasi"}
            </Button>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memproses...</p>
          </div>
        )}

        {step === "result" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            {result === "success" && (
              <>
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                <p className="text-lg font-semibold">Pembayaran Berhasil!</p>
                <Badge className="bg-primary/20 text-primary">Menunggu Konfirmasi Bengkel</Badge>
                <p className="text-sm text-muted-foreground text-center">
                  Anda akan diarahkan ke halaman status booking.
                </p>
              </>
            )}
            {result === "pending" && (
              <>
                <Clock className="h-16 w-16 text-primary" />
                <p className="text-lg font-semibold">Menunggu Pembayaran</p>
                <Badge className="bg-primary/20 text-primary">Pending</Badge>
                <p className="text-sm text-muted-foreground text-center">Silakan selesaikan pembayaran sesuai metode yang dipilih.</p>
              </>
            )}
            {result === "awaiting" && (
              <>
                <Clock className="h-16 w-16 text-primary" />
                <p className="text-lg font-semibold">Menunggu Verifikasi Staff</p>
                <Badge className="bg-primary/20 text-primary">Awaiting Confirmation</Badge>
                <p className="text-sm text-muted-foreground text-center">
                  Tunjukkan QR di bawah ini ke kasir cabang untuk konfirmasi pembayaran.
                </p>
                <BookingQRCard bookingId={bookingId} amount={amount} paymentMethod={method} compact />
              </>
            )}
            {result === "pay_later" && (
              <>
                <MapPin className="h-16 w-16 text-blue-500" />
                <p className="text-lg font-semibold">Bayar di Tempat</p>
                <Badge className="bg-blue-500/20 text-blue-500">Pay at Workshop</Badge>
                <p className="text-sm text-muted-foreground text-center">
                  Tunjukkan QR ini di kasir bengkel saat tiba untuk konfirmasi.
                </p>
                <BookingQRCard bookingId={bookingId} amount={amount} paymentMethod={method} compact />
              </>
            )}
            {result === "failed" && (
              <>
                <XCircle className="h-16 w-16 text-red-500" />
                <p className="text-lg font-semibold">Pembayaran Gagal</p>
                <Badge className="bg-red-500/20 text-red-400">Failed</Badge>
                <Button variant="outline" onClick={handleRetry} className="mt-2">Coba Lagi</Button>
              </>
            )}
            <Button onClick={handleClose} className="mt-4 w-full">
              {result === "failed" ? "Tutup" : "Selesai"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
