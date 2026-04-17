import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, FlaskConical } from "lucide-react";
import { toast } from "sonner";

interface SnapResult {
  transaction_status?: string;
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

const SNAP_SCRIPT_URL = "https://app.sandbox.midtrans.com/snap/snap.js";

const loadSnap = (clientKey: string) =>
  new Promise<void>((resolve, reject) => {
    if (window.snap) return resolve();
    const existing = document.querySelector(`script[src="${SNAP_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Snap load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = SNAP_SCRIPT_URL;
    s.setAttribute("data-client-key", clientKey);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Snap load failed"));
    document.head.appendChild(s);
  });

const TestPaymentButton = ({ onComplete }: { onComplete?: () => void }) => {
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      console.log("[TEST PAYMENT] Invoking midtrans-test-transaction…");
      const { data, error } = await supabase.functions.invoke("midtrans-test-transaction", { body: {} });
      if (error || !data?.snap_token) throw new Error(error?.message || "Failed to create test transaction");

      console.log("[TEST PAYMENT] order_id:", data.order_id, "booking:", data.booking_id);
      toast.success(`Test transaksi dibuat: ${data.order_id}`);

      await loadSnap(data.client_key);
      if (!window.snap) throw new Error("Snap not loaded");

      window.snap.pay(data.snap_token, {
        onSuccess: (r) => {
          console.log("[TEST PAYMENT] success", r);
          toast.success("Test pembayaran berhasil");
          onComplete?.();
        },
        onPending: (r) => {
          console.log("[TEST PAYMENT] pending", r);
          toast.info("Test pembayaran pending");
          onComplete?.();
        },
        onError: (r) => {
          console.error("[TEST PAYMENT] error", r);
          toast.error("Test pembayaran gagal");
          onComplete?.();
        },
        onClose: () => {
          console.log("[TEST PAYMENT] popup closed");
          onComplete?.();
        },
      });
    } catch (err) {
      console.error("[TEST PAYMENT] error:", err);
      toast.error(err instanceof Error ? err.message : "Gagal membuat test transaksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleTest} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
      Test Payment Midtrans
    </Button>
  );
};

export default TestPaymentButton;
