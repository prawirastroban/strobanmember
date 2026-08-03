import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CarFront, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type ActiveService = {
  bookingId: string;
  status: string;
  pendingSpkId: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu konfirmasi bengkel",
  confirmed: "Booking dikonfirmasi",
  checked_in: "Kendaraan sudah check-in",
  in_progress: "Sedang dikerjakan mekanik",
  ready: "Siap diambil",
};

/**
 * Floating pop-up notification for the customer's active service.
 * Replaces the old cart pill (cart now lives in the header) and navigates
 * to the live Tracking Service page.
 */
const FloatingServiceStatus = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [active, setActive] = useState<ActiveService | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) {
      setActive(null);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data: pendingSpk } = await supabase
        .from("spk_orders")
        .select("id, booking_id, status")
        .eq("customer_id", user.id)
        .eq("status", "awaiting_customer_approval")
        .not("booking_id", "is", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (pendingSpk?.id) {
        setActive({
          bookingId: pendingSpk.booking_id ?? pendingSpk.id,
          status: pendingSpk.status,
          pendingSpkId: pendingSpk.id,
        });
        return;
      }

      const { data } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("user_id", user.id)
        .not("status", "in", "(completed,cancelled)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setActive(data ? { bookingId: data.id, status: data.status, pendingSpkId: null } : null);
    };

    load();

    const channel = supabase
      .channel("floating-service-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spk_orders", filter: `customer_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const hidden =
    !active ||
    dismissed ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/service/progress") ||
    pathname.startsWith("/my-booking") ||
    pathname.startsWith("/spk/");

  if (hidden || !active) return null;

  const needsApproval = !!active.pendingSpkId;
  const title = needsApproval ? "SPK menunggu persetujuan" : "Status Pengerjaan";
  const desc = needsApproval
    ? "Ketuk untuk meninjau & menyetujui SPK Anda"
    : STATUS_LABEL[active.status] ?? "Ketuk untuk lihat progres servis";

  const open = () => {
    if (active.pendingSpkId) {
      navigate(`/spk/${active.pendingSpkId}/approve`);
      return;
    }
    navigate(
      active.status === "in_progress"
        ? `/service/progress/${active.bookingId}`
        : `/my-booking/${active.bookingId}`,
    );
  };

  return (
    <div
      className={cn(
        "fixed z-40 px-3 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:px-0 md:max-w-md",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
      )}
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem + 0.5rem)" }}
      role="region"
      aria-label="Status pengerjaan servis"
    >
      <button
        type="button"
        onClick={open}
        className={cn(
          "group w-full flex items-center gap-3 rounded-full px-4 py-3 text-left",
          "bg-primary text-primary-foreground",
          "shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.7),0_0_18px_hsl(var(--primary)/0.45)]",
          "border border-primary/40 backdrop-blur-md",
          "transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]",
        )}
      >
        <span className="relative flex items-center justify-center h-10 w-10 rounded-full bg-primary-foreground/15 shrink-0">
          <CarFront className="h-5 w-5" />
          <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse ring-2 ring-primary" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">{title}</p>
          <p className="text-[11px] opacity-90 truncate leading-tight">{desc}</p>
        </div>
        <span
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          role="button"
          aria-label="Tutup notifikasi status"
          className="flex items-center justify-center h-7 w-7 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 shrink-0 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </span>
      </button>
    </div>
  );
};

export default FloatingServiceStatus;