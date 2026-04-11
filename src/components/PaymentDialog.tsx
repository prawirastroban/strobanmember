import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Banknote, QrCode, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  amount: number;
  serviceName: string;
  onPaymentComplete?: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote, description: "Bayar di tempat" },
  { value: "transfer", label: "Bank Transfer", icon: CreditCard, description: "Transfer bank" },
  { value: "qris", label: "QRIS", icon: QrCode, description: "Scan QR Code" },
];

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);

const PaymentDialog = ({ open, onOpenChange, bookingId, amount, serviceName, onPaymentComplete }: PaymentDialogProps) => {
  const { user } = useAuth();
  const [method, setMethod] = useState("cash");
  const [step, setStep] = useState<"select" | "processing" | "result">("select");
  const [result, setResult] = useState<"success" | "pending" | "failed" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePay = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setStep("processing");

    try {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          booking_id: bookingId,
          user_id: user.id,
          amount,
          payment_method: method,
          payment_status: "pending",
        })
        .select("id")
        .single();

      if (paymentError) throw paymentError;

      // Simulate payment processing
      await new Promise((r) => setTimeout(r, 2000));

      // Simulate result (cash = success, transfer = pending, qris = random)
      let simulatedResult: "success" | "pending" | "failed";
      if (method === "cash") simulatedResult = "success";
      else if (method === "transfer") simulatedResult = "pending";
      else simulatedResult = Math.random() > 0.3 ? "success" : "pending";

      // Update payment status
      await supabase
        .from("payments")
        .update({ payment_status: simulatedResult })
        .eq("id", payment.id);

      // Update booking status & payment_status
      const bookingStatus = simulatedResult === "success" ? "confirmed" : simulatedResult === "pending" ? "pending" : "pending";
      const bookingPaymentStatus = simulatedResult === "success" ? "paid" : simulatedResult === "pending" ? "pending_payment" : "failed";

      await supabase
        .from("bookings")
        .update({ status: bookingStatus, payment_status: bookingPaymentStatus })
        .eq("id", bookingId);

      setResult(simulatedResult);
      setStep("result");

      if (simulatedResult === "success") {
        toast.success("Pembayaran berhasil!");
      } else if (simulatedResult === "pending") {
        toast.info("Pembayaran sedang diproses");
      }
    } catch (err: unknown) {
      console.error("Payment error:", err);
      // Try to mark as failed
      await supabase.from("bookings").update({ payment_status: "failed" }).eq("id", bookingId);
      setResult("failed");
      setStep("result");
      toast.error("Pembayaran gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setStep("select");
    setResult(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    if (result) {
      onPaymentComplete?.();
    }
    setTimeout(() => {
      setStep("select");
      setResult(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
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
              {PAYMENT_METHODS.map((pm) => (
                <Label
                  key={pm.value}
                  htmlFor={pm.value}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:ring-2 has-[:checked]:ring-primary/50 has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value={pm.value} id={pm.value} />
                  <pm.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{pm.label}</p>
                    <p className="text-xs text-muted-foreground">{pm.description}</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>

            <Button onClick={handlePay} disabled={isSubmitting} className="w-full gap-2">
              <CreditCard className="h-4 w-4" /> Bayar Sekarang
            </Button>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memproses pembayaran...</p>
          </div>
        )}

        {step === "result" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            {result === "success" && (
              <>
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                <p className="text-lg font-semibold">Pembayaran Berhasil!</p>
                <Badge className="bg-emerald-500/20 text-emerald-400">Confirmed</Badge>
              </>
            )}
            {result === "pending" && (
              <>
                <Clock className="h-16 w-16 text-yellow-500" />
                <p className="text-lg font-semibold">Menunggu Pembayaran</p>
                <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>
                <p className="text-sm text-muted-foreground text-center">Silakan selesaikan pembayaran sesuai metode yang dipilih.</p>
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
