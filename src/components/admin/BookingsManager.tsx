import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, Car, Clock, CheckCircle2, Wrench, Bell, XCircle, ShieldCheck, AlertTriangle, Flame, Ban, StickyNote, ScanLine, MoreVertical, Pencil, Trash2,
} from "lucide-react";
import { CreditCard, Banknote, QrCode, Wallet, Info, Receipt, User2, MapPin, Calendar as CalendarIcon, UserCog, UserCheck, FileText, ExternalLink, Hourglass, Smartphone } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PaymentDialog from "@/components/PaymentDialog";
import { getBookingStatusMeta } from "@/lib/bookingStatus";
import {
  getBookingPriority, PRIORITY_META, PRIORITY_RANK, isConfirmOverdue, bookingDateTime,
} from "@/lib/bookingPriority";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MobileBookingRow } from "./MobileBookingRow";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  canMoveToStatus, restrictedReasonMessage, isStatusRestricted, isBookingDateReached,
} from "@/lib/bookingDateRule";
import FilterBarV2, { type QuickChip, type ActiveChip } from "./filters/FilterBarV2";
import { DEFAULT_TIMELINE, TimelineValue, getDateRange, isTimelineDefault, TIMELINE_PRESETS } from "@/utils/timelineFilter";
import { useFilterPresets } from "@/hooks/useFilterPresets";
import { isActionNeeded, ACTION_BADGE_CLASS } from "@/lib/actionNeeded";
import { useScopedBranches } from "@/hooks/useBranches";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DialogFooter, DialogDescription } from "@/components/ui/dialog";
import BookingScanner from "./BookingScanner";
import ReviewFollowUpPanel from "./ReviewFollowUpPanel";
import PickupActions, { PickupBadge } from "./PickupActions";
import TransferProofButton from "./keuangan/TransferProofButton";
import { useUserRole } from "@/hooks/useUserRole";
import EditBookingDialog from "./EditBookingDialog";
import DeleteBookingDialog from "./DeleteBookingDialog";
import { SPKService } from "@/services/spk/SPKService";
import BookingEstimasiDialog from "./BookingEstimasiDialog";
import { computeEstimasiTotal, countFilledItems, parseEstimasi } from "@/lib/spk/estimasi";
import { useAuth } from "@/contexts/AuthContext";
import EditBeforeCancelDialog from "./EditBeforeCancelDialog";
import QueueEstimateDialog from "./QueueEstimateDialog";
import { logAdminAction } from "@/lib/auditLog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  service_type: string;
  booking_date: string;
  booking_time: string;
  status: string;
  service_status: string;
  created_at: string;
  car_type: string | null;
  car_plate_number: string | null;
  branch: string | null;
  payment_status: string;
  payment_method?: string | null;
  service_price?: number;
  user_id?: string;
  cancel_requested?: boolean;
  cancel_reason?: string | null;
  updated_at?: string;
  customer_notes?: string | null;
  service_location?: string | null;
  pickup_address?: string | null;
  pickup_distance_km?: number | null;
  pickup_status?: string | null;
  pickup_return?: boolean | null;
  pickup_odometer_start?: number | null;
  pickup_odometer_end?: number | null;
  pickup_handover_photos?: any;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  created_by?: string | null;
  original_service_price?: number | null;
  discount_amount?: number | null;
  discount_code?: string | null;
  discount_label?: string | null;
  discount_source?: string | null;
  queue_estimated_start?: string | null;
  queue_note?: string | null;
  queue_set_at?: string | null;
}

const PAY_METHOD_OPTIONS = [
  { value: "cash", label: "Tunai", icon: Banknote },
  { value: "transfer", label: "Transfer Bank", icon: CreditCard },
  { value: "qris", label: "QRIS", icon: QrCode },
];

const PAY_STATUS_OPTIONS = [
  { value: "unpaid", label: "Belum Lunas" },
  { value: "pending", label: "Pending" },
  { value: "awaiting_confirmation", label: "Menunggu Verifikasi" },
  { value: "paid", label: "Lunas" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Diterima", icon: Clock },
  { value: "confirmed", label: "Dikonfirmasi", icon: CheckCircle2 },
  { value: "checked_in", label: "Check-In", icon: Car },
  { value: "in_progress", label: "Sedang Dikerjakan", icon: Wrench },
  { value: "completed", label: "Selesai", icon: CheckCircle2 },
  { value: "cancelled", label: "Dibatalkan", icon: XCircle },
];

const BookingsManager = () => {
  const { branches, isLocked, lockedBranch } = useScopedBranches();
  const { isStaff, isOwner, roles } = useUserRole();
  const { user } = useAuth();
  const [cancelPrompt, setCancelPrompt] = useState<{
    booking: Booking;
    mode: "cancel" | "approve_cancel";
  } | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("action") === "scan") {
      setScanOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  }, []);
  // Auto-open booking detail when ?id=<bookingId> is present (deep-link from feedback / notifications).
  useEffect(() => {
    const focusId = searchParams.get("id");
    if (!focusId) return;
    let cancelled = false;
    (async () => {
      const local = bookings.find((b) => b.id === focusId);
      if (local) {
        setDetailBooking(local);
      } else {
        const { data } = await supabase.from("bookings").select("*").eq("id", focusId).maybeSingle();
        if (!cancelled && data) setDetailBooking(data as unknown as Booking);
      }
      const next = new URLSearchParams(searchParams);
      next.delete("id");
      setSearchParams(next, { replace: true });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, bookings]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState(lockedBranch ?? "all");
  useEffect(() => {
    if (isLocked && lockedBranch && branchFilter !== lockedBranch) {
      setBranchFilter(lockedBranch);
    }
  }, [isLocked, lockedBranch]);
  const [onlyActionNeeded, setOnlyActionNeeded] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [priceRange, setPriceRange] = useState<[number | null, number | null]>([null, null]);
  const [onlyCancelRequest, setOnlyCancelRequest] = useState(false);
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [onlyPickup, setOnlyPickup] = useState(false);
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);
  const [timeline, setTimeline] = useState<TimelineValue>(DEFAULT_TIMELINE);
  const [now, setNow] = useState(() => new Date());
  // Per-row busy state: prevents double-click duplicate submits across all action buttons.
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();
  const [blockedDialog, setBlockedDialog] = useState<{
    open: boolean; bookingDate: string;
  }>({ open: false, bookingDate: "" });
  const [payDialog, setPayDialog] = useState<{ id: string; amount: number; status: string; service: string } | null>(null);
  const [payMethodMap, setPayMethodMap] = useState<Record<string, string>>({});
  const [creatorMap, setCreatorMap] = useState<Record<string, { name: string; isStaff: boolean }>>({});
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [queueBooking, setQueueBooking] = useState<Booking | null>(null);
  const [estimasiTarget, setEstimasiTarget] = useState<Booking | null>(null);
  // bookingId -> ringkasan estimasi dari draft SPK terkait (sumber tunggal).
  const [estimasiMap, setEstimasiMap] = useState<Record<string, { total: number; items: number }>>({});

  // Ambil estimasi seluruh SPK milik booking yang sedang tampil (satu query batch).
  const loadEstimasi = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await supabase
      .from("spk_orders")
      .select("booking_id, data, created_at")
      .in("booking_id", ids)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });
    const next: Record<string, { total: number; items: number }> = {};
    (data ?? []).forEach((row: any) => {
      if (!row.booking_id) return;
      const snap = parseEstimasi(row.data);
      // Baris terbaru menang (order ascending → assignment terakhir = terbaru).
      next[row.booking_id] = { total: computeEstimasiTotal(snap), items: countFilledItems(snap.items) };
    });
    setEstimasiMap((prev) => {
      const merged = { ...prev };
      ids.forEach((id) => { delete merged[id]; });
      return { ...merged, ...next };
    });
  };

  useEffect(() => {
    if (bookings.length === 0) return;
    const ids = bookings.map((b) => b.id);
    loadEstimasi(ids);
    // Sinkron dua arah: perubahan estimasi dari Canvas SPK langsung tercermin.
    const channel = supabase
      .channel("bookings-spk-estimasi")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spk_orders" },
        (payload) => {
          const bookingId =
            (payload.new as any)?.booking_id ?? (payload.old as any)?.booking_id ?? null;
          if (bookingId && ids.includes(bookingId)) loadEstimasi([bookingId]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings.map((b) => b.id).join(",")]);

  // Resolve human-readable name + staff flag for each unique created_by (other than the customer themself).
  useEffect(() => {
    if (bookings.length === 0) return;
    const ids = Array.from(
      new Set(
        bookings
          .map((b) => b.created_by)
          .filter((id): id is string => !!id && !creatorMap[id]),
      ),
    );
    if (ids.length === 0) return;
    (async () => {
      const [{ data: profs }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", ids),
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      const staffSet = new Set(
        (roleRows ?? [])
          .filter((r: any) => r.role === "staff" || r.role === "admin" || r.role === "admin_cabang")
          .map((r: any) => r.user_id as string),
      );
      const next: Record<string, { name: string; isStaff: boolean }> = {};
      (profs ?? []).forEach((p: any) => {
        next[p.id] = {
          name: p.full_name || p.id.slice(0, 8),
          isStaff: staffSet.has(p.id),
        };
      });
      // Any ids not in profiles still get a fallback so we don't re-query
      ids.forEach((id) => {
        if (!next[id]) next[id] = { name: id.slice(0, 8), isStaff: staffSet.has(id) };
      });
      setCreatorMap((prev) => ({ ...prev, ...next }));
    })();
  }, [bookings]);

  const getCreatorLabel = (b: Booking): { text: string; isStaff: boolean } | null => {
    if (!b.created_by) return null;
    if (b.created_by === b.user_id) return { text: "Pelanggan", isStaff: false };
    const info = creatorMap[b.created_by];
    if (!info) return { text: "Staff", isStaff: true };
    return { text: info.name, isStaff: info.isStaff };
  };

  // Sync payment_method from bookings rows (single source of truth).
  // Customer-selected method writes to bookings.payment_method; we mirror to payments
  // table when admin sets it, but reads always come from bookings.
  useEffect(() => {
    if (bookings.length === 0) return;
    const m: Record<string, string> = {};
    bookings.forEach((b) => { if (b.payment_method) m[b.id] = b.payment_method; });
    setPayMethodMap((prev) => ({ ...prev, ...m }));
  }, [bookings]);

  const setPaymentMethod = async (booking: Booking, method: string) => {
    setPayMethodMap((prev) => ({ ...prev, [booking.id]: method }));
    // Write to bookings.payment_method (canonical source shared with customer).
    await supabase.from("bookings").update({ payment_method: method }).eq("id", booking.id);
    // Mirror to payments table for financial reports.
    const { data: existing } = await supabase
      .from("payments").select("id").eq("booking_id", booking.id).maybeSingle();
    if (existing?.id) {
      await supabase.from("payments").update({ payment_method: method }).eq("id", existing.id);
    } else {
      await supabase.from("payments").insert({
        booking_id: booking.id,
        user_id: booking.user_id,
        amount: booking.service_price ?? 0,
        payment_method: method,
        payment_status: "pending",
      });
    }
    toast({ title: "Metode pembayaran disimpan", description: method });
  };

  const setPaymentStatus = async (booking: Booking, newStatus: string) => {
    if (busyId) return;
    // Forward-only guard: non-owner cannot change away from "paid".
    if (!isOwner && booking.payment_status === "paid" && newStatus !== "paid") {
      toast({
        variant: "destructive",
        title: "Status pembayaran terkunci",
        description: "Pembayaran yang sudah Lunas tidak dapat diubah.",
      });
      return;
    }
    const method = payMethodMap[booking.id];
    if (!method) {
      toast({ variant: "destructive", title: "Pilih metode pembayaran", description: "Silakan pilih metode pembayaran terlebih dahulu." });
      return;
    }
    setBusyId(booking.id);
    const { data: existing } = await supabase
      .from("payments").select("id").eq("booking_id", booking.id).maybeSingle();
    if (existing?.id) {
      await supabase.from("payments").update({
        payment_status: newStatus, payment_method: method,
      }).eq("id", existing.id);
    } else {
      await supabase.from("payments").insert({
        booking_id: booking.id,
        user_id: booking.user_id,
        amount: booking.service_price ?? 0,
        payment_method: method,
        payment_status: newStatus,
      });
    }
    const { error } = await supabase
      .from("bookings").update({ payment_status: newStatus }).eq("id", booking.id);
    setBusyId(null);
    if (error) {
      if (/FORWARD_ONLY_PAYMENT_STATUS/.test(error.message)) {
        toast({
          variant: "destructive",
          title: "Status pembayaran terkunci",
          description: "Pembayaran yang sudah Lunas tidak dapat diubah.",
        });
        return;
      }
      toast({ variant: "destructive", title: "Gagal", description: error.message });
      return;
    }
    setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, payment_status: newStatus } : b));
    toast({ title: newStatus === "paid" ? "✅ Ditandai Lunas" : "Status pembayaran diperbarui" });
    await supabase.from("activity_logs").insert({
      type: "payment_manual_admin",
      description: `Admin set payment ${newStatus} (${method}) for booking ${booking.id}`,
      metadata: { booking_id: booking.id, method, status: newStatus },
    });
    logAdminAction({
      action: "booking.payment_change",
      targetId: booking.id,
      targetLabel: `${booking.customer_name} • ${booking.service_name}`,
      before: { payment_status: booking.payment_status },
      after: { payment_status: newStatus, payment_method: method },
      metadata: { branch: booking.branch },
    });
  };

  // Tick every 30s so priority + overdue warnings refresh in real time
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Debounce search input by 350ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const dateRange = useMemo(() => getDateRange(timeline), [timeline]);

  const fetchBookings = async () => {
    setIsLoading(true);
    let query = supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false });

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (branchFilter !== "all") query = query.eq("branch", branchFilter);
    // Timeline filter on created_at
    query = query
      .gte("created_at", `${dateRange.start}T00:00:00`)
      .lte("created_at", `${dateRange.end}T23:59:59`);

    const { data, error } = await query;
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setBookings(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [statusFilter, branchFilter, dateRange.start, dateRange.end]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Realtime subscription for new/updated bookings
  useEffect(() => {
    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          const newBooking = payload.new as Booking;
          toast({
            title: "📋 Booking Baru!",
            description: `${newBooking.customer_name} — ${newBooking.service_name} (${newBooking.booking_date})`,
          });
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Booking Baru Masuk!", {
              body: `${newBooking.customer_name} — ${newBooking.service_name}\n${newBooking.booking_date} ${newBooking.booking_time}`,
              icon: "/favicon.png",
            });
          }
          // Add to list only if it matches the active filters (status, branch, timeline on created_at)
          const matchesStatus = statusFilter === "all" || newBooking.status === statusFilter;
          const matchesBranch = branchFilter === "all" || newBooking.branch === branchFilter;
          const createdMs = new Date(newBooking.created_at).getTime();
          const startMs = new Date(`${dateRange.start}T00:00:00`).getTime();
          const endMs = new Date(`${dateRange.end}T23:59:59`).getTime();
          const matchesTimeline = createdMs >= startMs && createdMs <= endMs;
          if (matchesStatus && matchesBranch && matchesTimeline) {
            setBookings((prev) => [newBooking, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings" },
        (payload) => {
          const updated = payload.new as Booking;
          const oldStatus = (payload.old as Partial<Booking>)?.status;
          if (oldStatus !== updated.status) {
            const label = STATUS_OPTIONS.find((s) => s.value === updated.status)?.label || updated.status;
            toast({
              title: `🔄 Status Diperbarui`,
              description: `${updated.customer_name}: ${label}`,
            });
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Status Booking Berubah", {
                body: `${updated.customer_name} → ${label}`,
                icon: "/favicon.png",
              });
            }
          }
          setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
          if (updated.payment_method) {
            setPayMethodMap((prev) => ({ ...prev, [updated.id]: updated.payment_method! }));
          }
        }
      )
      .subscribe();

    // Separate channel for payments table — keeps payment_method + payment_status in sync
    const paymentsChannel = supabase
      .channel("payments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        (payload) => {
          const row = (payload.new ?? payload.old) as any;
          if (!row?.booking_id) return;
          if (row.payment_method) {
            setPayMethodMap((prev) => ({ ...prev, [row.booking_id]: row.payment_method }));
          }
          if (row.payment_status) {
            setBookings((prev) => prev.map((b) =>
              b.id === row.booking_id && b.payment_status !== row.payment_status
                ? { ...b, payment_status: row.payment_status } : b
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [toast, statusFilter, branchFilter, dateRange.start, dateRange.end]);

  const updateStatus = async (id: string, newStatus: string) => {
    if (busyId) return;
    const target = bookings.find((b) => b.id === id);
    // Intercept cancel: promote editing over cancellation to reduce duplicate re-bookings.
    if (target && newStatus === "cancelled" && target.status !== "cancelled") {
      setCancelPrompt({ booking: target, mode: "cancel" });
      return;
    }
    // Forward-only guard (UI-side, non-owner)
    if (target && !isOwner) {
      const ord = (s: string) =>
        ({ pending: 1, waiting_confirmation: 2, confirmed: 3, checked_in: 4, in_progress: 5, completed: 6, cancelled: 99 } as Record<string, number>)[s] ?? 0;
      const goingBackward =
        newStatus !== "cancelled" && ord(newStatus) < ord(target.status);
      const fromTerminal = target.status === "completed" || target.status === "cancelled";
      if (goingBackward || (fromTerminal && newStatus !== target.status)) {
        toast({
          variant: "destructive",
          title: "Status terkunci",
          description: `Status booking tidak dapat dimundurkan dari "${target.status}" ke "${newStatus}".`,
        });
        return;
      }
    }
    // Rule: status check_in / in_progress / completed hanya bisa di tanggal booking
    if (target && !canMoveToStatus(newStatus, target.booking_date)) {
      setBlockedDialog({ open: true, bookingDate: target.booking_date });
      return;
    }
    if (target && newStatus === "completed" && target.payment_status !== "paid") {
      toast({
        variant: "destructive",
        title: "Pembayaran belum dikonfirmasi",
        description: "Booking tidak bisa diselesaikan sebelum pembayaran dikonfirmasi (paid).",
      });
      return;
    }
    setBusyId(id);
    const statusPayload = newStatus === "completed"
      ? { status: newStatus, service_status: "completed" }
      : { status: newStatus };
    const { error } = await supabase.from("bookings").update(statusPayload).eq("id", id);
    setBusyId(null);
    if (error) {
      if (/FORWARD_ONLY_BOOKING_STATUS/.test(error.message) && target) {
        toast({
          variant: "destructive",
          title: "Status terkunci",
          description: `Status booking tidak dapat dimundurkan dari "${target.status}" ke "${newStatus}".`,
        });
        return;
      }
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } else {
      toast({ title: "Status updated" });
      setBookings((prev) => prev.map((b) => (b.id === id ? {
        ...b,
        status: newStatus,
        service_status: newStatus === "completed" ? "completed" : b.service_status,
      } : b)));
      logAdminAction({
        action: "booking.status_change",
        targetId: id,
        targetLabel: target ? `${target.customer_name} • ${target.service_name}` : undefined,
        before: { status: target?.status },
        after: { status: newStatus },
        metadata: { branch: target?.branch },
      });
      // Auto-create SPK on transition to in_progress (idempotent)
      if (newStatus === "in_progress" && target) {
        try {
          const actorRole = isStaff ? "owner" : isOwner ? "owner" : "admin_cabang";
          const spkResult = await SPKService.createFromBooking(id, {
            actor: { user_id: user?.id ?? null, role: actorRole as any },
            occurred_at: new Date().toISOString(),
          });
          if (spkResult.ok === true) {
            const spk = spkResult.data;
            toast({
              title: "SPK dibuat",
              description: `${spk.spk_number} • Buka Canvas untuk mulai inspeksi.`,
            });
          }
        } catch (e) {
          // non-blocking
          console.warn("[SPK] auto-create failed", e);
        }
      }
    }
  };

  const confirmBooking = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    const { data, error } = await supabase.rpc("confirm_booking", { _booking_id: id });
    setBusyId(null);
    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      toast({
        variant: "destructive",
        title: "Gagal konfirmasi",
        description: error?.message || result?.error || "Unknown error",
      });
      return;
    }
    toast({ title: "✅ Booking dikonfirmasi", description: "Servis dimulai. Customer akan diarahkan otomatis." });
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "confirmed", service_status: "confirmed" } : b))
    );
    const t = bookings.find((b) => b.id === id);
    logAdminAction({
      action: "booking.confirm",
      targetId: id,
      targetLabel: t ? `${t.customer_name} • ${t.service_name}` : undefined,
      after: { status: "confirmed" },
      metadata: { branch: t?.branch },
    });
  };

  const approveCancellation = async (id: string, skipPrompt = false) => {
    if (busyId) return;
    const target = bookings.find((b) => b.id === id);
    // Intercept: prompt to edit instead of confirming cancellation.
    if (target && !skipPrompt) {
      setCancelPrompt({ booking: target, mode: "approve_cancel" });
      return;
    }
    setBusyId(id);
    const { data, error } = await supabase.rpc("approve_booking_cancellation", { _booking_id: id });
    setBusyId(null);
    const r = data as { success?: boolean; error?: string } | null;
    if (error || !r?.success) {
      toast({ variant: "destructive", title: "Gagal", description: error?.message || r?.error });
      return;
    }
    toast({ title: "Pembatalan disetujui" });
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled", cancel_requested: false } : b)));
    const t = bookings.find((b) => b.id === id);
    logAdminAction({
      action: "booking.cancel_approve",
      targetId: id,
      targetLabel: t ? `${t.customer_name} • ${t.service_name}` : undefined,
      metadata: { branch: t?.branch },
    });
  };

  const rejectCancellation = async (id: string) => {
    if (busyId) return;
    const reason = window.prompt("Alasan penolakan (opsional):") || "";
    setBusyId(id);
    const { data, error } = await supabase.rpc("reject_booking_cancellation", { _booking_id: id, _reason: reason });
    setBusyId(null);
    const r = data as { success?: boolean; error?: string } | null;
    if (error || !r?.success) {
      toast({ variant: "destructive", title: "Gagal", description: error?.message || r?.error });
      return;
    }
    toast({ title: "Permintaan ditolak" });
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, cancel_requested: false, cancel_reason: null } : b)));
    const t = bookings.find((b) => b.id === id);
    logAdminAction({
      action: "booking.cancel_reject",
      targetId: id,
      targetLabel: t ? `${t.customer_name} • ${t.service_name}` : undefined,
      metadata: { reason, branch: t?.branch },
    });
  };

  const filtered = bookings
    .filter(
      (b) =>
        b.customer_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        b.customer_email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        b.service_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (b.car_plate_number?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false) ||
        (b.customer_phone?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false)
    )
    .filter((b) => (onlyActionNeeded ? isActionNeeded("booking", b) : true))
    .filter((b) => (onlyCancelRequest ? !!b.cancel_requested && b.status !== "cancelled" : true))
    .filter((b) => (onlyUnpaid ? b.payment_status !== "paid" : true))
    .filter((b) => (onlyPickup ? (b.pickup_status && b.pickup_status !== "idle") : true))
    .filter((b) => (paymentStatusFilter === "all" ? true : b.payment_status === paymentStatusFilter))
    .filter((b) => (paymentMethodFilter === "all" ? true : (payMethodMap[b.id] || "") === paymentMethodFilter))
    .filter((b) => (locationFilter === "all" ? true : (b.service_location || "workshop") === locationFilter))
    .filter((b) => (customerFilter === "all" ? true : `${b.customer_name}__${b.customer_phone}` === customerFilter))
    .filter((b) => {
      const p = Number(b.service_price ?? 0);
      if (priceRange[0] != null && p < priceRange[0]) return false;
      if (priceRange[1] != null && p > priceRange[1]) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      // 1. Pending cancellation requests (still active) always at the very top, newest first
      const aCancelReq = a.cancel_requested && a.status !== "cancelled" ? 0 : 1;
      const bCancelReq = b.cancel_requested && b.status !== "cancelled" ? 0 : 1;
      if (aCancelReq !== bCancelReq) return aCancelReq - bCancelReq;
      if (aCancelReq === 0) {
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      }
      // 2. New bookings awaiting confirmation, newest first
      const aWait = a.status === "waiting_confirmation" ? 0 : 1;
      const bWait = b.status === "waiting_confirmation" ? 0 : 1;
      if (aWait !== bWait) return aWait - bWait;
      if (aWait === 0) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const pa = PRIORITY_RANK[getBookingPriority(a.status, a.booking_date, a.booking_time, now)];
      const pb = PRIORITY_RANK[getBookingPriority(b.status, b.booking_date, b.booking_time, now)];
      if (pa !== pb) return pa - pb;
      // tie-break: earliest booking_date+time first
      return (
        new Date(`${a.booking_date}T00:00:00`).getTime() -
        new Date(`${b.booking_date}T00:00:00`).getTime()
      );
    });

  const waitingCount = bookings.filter(
    (b) =>
      b.status === "waiting_confirmation" ||
      (b.status === "pending" && ["paid", "pay_later"].includes(b.payment_status))
  ).length;
  const inProgress = bookings
    .filter((b) => ["in_progress", "confirmed", "checked_in"].includes(b.status))
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
    );

  // Unique customer list for filter dropdown
  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    bookings.forEach((b) => {
      const key = `${b.customer_name}__${b.customer_phone}`;
      if (!map.has(key)) {
        map.set(key, `${b.customer_name}${b.customer_phone ? ` · ${b.customer_phone}` : ""}`);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [bookings]);

  // === Filter helpers (FilterBarV2) =========================================
  const resetAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setBranchFilter(isLocked && lockedBranch ? lockedBranch : "all");
    setOnlyActionNeeded(false);
    setOnlyCancelRequest(false);
    setOnlyUnpaid(false);
    setOnlyPickup(false);
    setPaymentStatusFilter("all");
    setPaymentMethodFilter("all");
    setLocationFilter("all");
    setCustomerFilter("all");
    setPriceRange([null, null]);
    setTimeline(DEFAULT_TIMELINE);
  };

  const isFilterActive =
    !!searchQuery ||
    statusFilter !== "all" ||
    (branchFilter !== "all" && !isLocked) ||
    onlyActionNeeded || onlyCancelRequest || onlyUnpaid || onlyPickup ||
    paymentStatusFilter !== "all" ||
    paymentMethodFilter !== "all" ||
    locationFilter !== "all" ||
    customerFilter !== "all" ||
    priceRange[0] !== null || priceRange[1] !== null ||
    !isTimelineDefault(timeline);

  const { presets, save: savePreset, remove: removePreset } =
    useFilterPresets("bookings");

  const currentPresetPayload = () => ({
    search: searchQuery,
    timeline,
    quickChips: [
      onlyActionNeeded ? "action_needed" : "",
      onlyCancelRequest ? "cancel_req" : "",
      onlyUnpaid ? "unpaid" : "",
      onlyPickup ? "pickup" : "",
    ].filter(Boolean),
    dropdowns: {
      status: statusFilter,
      branch: branchFilter,
      customer: customerFilter,
      pay_status: paymentStatusFilter,
      pay_method: paymentMethodFilter,
      location: locationFilter,
    },
    ranges: { price: priceRange },
    multi: {},
    logic: "AND" as const,
  });

  const applyPresetPayload = (payload: any) => {
    if (!payload) return;
    if (typeof payload.search === "string") setSearchQuery(payload.search);
    if (payload.timeline) setTimeline(payload.timeline);
    const qc: string[] = payload.quickChips || [];
    setOnlyActionNeeded(qc.includes("action_needed"));
    setOnlyCancelRequest(qc.includes("cancel_req"));
    setOnlyUnpaid(qc.includes("unpaid"));
    setOnlyPickup(qc.includes("pickup"));
    const d = payload.dropdowns || {};
    if (d.status) setStatusFilter(d.status);
    if (d.branch && !isLocked) setBranchFilter(d.branch);
    if (d.customer) setCustomerFilter(d.customer);
    if (d.pay_status) setPaymentStatusFilter(d.pay_status);
    if (d.pay_method) setPaymentMethodFilter(d.pay_method);
    if (d.location) setLocationFilter(d.location);
    if (payload.ranges?.price) setPriceRange(payload.ranges.price);
  };

  const quickChips: QuickChip[] = [
    { key: "today", label: "Hari Ini", active: timeline.preset === "today",
      onClick: () => setTimeline({ preset: timeline.preset === "today" ? "this_month" : "today" }) },
    { key: "this_week", label: "Minggu Ini", active: timeline.preset === "this_week",
      onClick: () => setTimeline({ preset: timeline.preset === "this_week" ? "this_month" : "this_week" }) },
    { key: "this_month", label: "Bulan Ini", active: timeline.preset === "this_month",
      onClick: () => setTimeline({ preset: "this_month" }) },
    { key: "action_needed", label: "⚡ Perlu Aksi", active: onlyActionNeeded,
      onClick: () => setOnlyActionNeeded((v) => !v),
      count: bookings.filter((b) => isActionNeeded("booking", b)).length },
    { key: "unpaid", label: "💸 Belum Bayar", active: onlyUnpaid,
      onClick: () => setOnlyUnpaid((v) => !v),
      count: bookings.filter((b) => b.payment_status !== "paid").length },
    { key: "pickup", label: "🚗 Pickup Aktif", active: onlyPickup,
      onClick: () => setOnlyPickup((v) => !v),
      count: bookings.filter((b) => b.pickup_status && b.pickup_status !== "idle").length },
  ];

  const branchLabel = (slug: string) =>
    branches.find((b) => b.slug === slug)?.name || slug;
  const statusLabel = (s: string) =>
    STATUS_OPTIONS.find((x) => x.value === s)?.label || s;
  const customerLabel = (k: string) =>
    customerOptions.find((c) => c.value === k)?.label || k;
  const timelineLabel = (t: TimelineValue) =>
    TIMELINE_PRESETS.find((p) => p.value === t.preset)?.label || t.preset;

  const activeChips: ActiveChip[] = [
    !isTimelineDefault(timeline) && {
      key: "timeline", label: timelineLabel(timeline),
      onRemove: () => setTimeline(DEFAULT_TIMELINE),
    },
    statusFilter !== "all" && {
      key: "status", label: `Status: ${statusLabel(statusFilter)}`,
      onRemove: () => setStatusFilter("all"),
    },
    !isLocked && branchFilter !== "all" && {
      key: "branch", label: `Cabang: ${branchLabel(branchFilter)}`,
      onRemove: () => setBranchFilter("all"),
    },
    customerFilter !== "all" && {
      key: "customer", label: `Pelanggan: ${customerLabel(customerFilter)}`,
      onRemove: () => setCustomerFilter("all"),
    },
    paymentStatusFilter !== "all" && {
      key: "pay_status", label: `Bayar: ${paymentStatusFilter}`,
      onRemove: () => setPaymentStatusFilter("all"),
    },
    paymentMethodFilter !== "all" && {
      key: "pay_method", label: `Metode: ${paymentMethodFilter}`,
      onRemove: () => setPaymentMethodFilter("all"),
    },
    locationFilter !== "all" && {
      key: "location", label: `Lokasi: ${locationFilter === "pickup" ? "Pickup" : "Bengkel"}`,
      onRemove: () => setLocationFilter("all"),
    },
    onlyCancelRequest && {
      key: "cancel_req", label: "Pembatalan",
      onRemove: () => setOnlyCancelRequest(false),
    },
    (priceRange[0] !== null || priceRange[1] !== null) && {
      key: "price",
      label: `Nominal: ${priceRange[0] ?? "0"} – ${priceRange[1] ?? "∞"}`,
      onRemove: () => setPriceRange([null, null]),
    },
  ].filter(Boolean) as ActiveChip[];

  const handleOwnerDelete = (b: Booking) => setDeleteTarget(b);
  const handleOwnerEdit = (b: Booking) => setEditTarget(b);

  // Group bookings by booking_date for sticky date headers
  const groupByDate = (list: Booking[]) => {
    const map = new Map<string, Booking[]>();
    list.forEach((b) => {
      const key = b.booking_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return Array.from(map.entries()).map(([key, items]) => {
      const d = parseISO(key);
      let label = format(d, "EEEE, dd MMM yyyy", { locale: idLocale });
      if (isToday(d)) label = `Hari Ini · ${format(d, "dd MMM yyyy", { locale: idLocale })}`;
      else if (isTomorrow(d)) label = `Besok · ${format(d, "dd MMM yyyy", { locale: idLocale })}`;
      else if (isYesterday(d)) label = `Kemarin · ${format(d, "dd MMM yyyy", { locale: idLocale })}`;
      return { key, label, items };
    });
  };

  // Payment status badge (compact)
  const renderPaymentBadge = (b: Booking) => {
    const cls =
      b.payment_status === "paid" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" :
      b.payment_status === "pending_payment" || b.payment_status === "pending" ? "bg-primary/15 text-primary border-primary/30" :
      b.payment_status === "failed" ? "bg-red-500/15 text-red-500 border-red-500/30" :
      b.payment_status === "pay_later" ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
      "bg-muted text-muted-foreground border-border";
    const label =
      b.payment_status === "paid" ? "Lunas" :
      b.payment_status === "pay_later" ? "Bayar di Tempat" :
      b.payment_status === "pending_payment" || b.payment_status === "pending" ? "Menunggu" :
      b.payment_status === "failed" ? "Gagal" : "Belum Lunas";
    return <Badge variant="outline" className={`${cls} text-[10px] h-5`}>{label}</Badge>;
  };

  // Pick the single most relevant action for this booking state
  const renderPrimaryCTA = (booking: Booking) => {
    const busy = busyId === booking.id;
    const dateReached = isBookingDateReached(booking.booking_date);
    if (booking.cancel_requested && booking.status !== "cancelled") {
      return (
        <Button size="sm" variant="destructive" className="gap-1 h-8" disabled={busy} onClick={() => approveCancellation(booking.id)}>
          {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
          Setujui Pembatalan
        </Button>
      );
    }
    if (
      !["checked_in", "in_progress", "completed", "cancelled"].includes(booking.status) &&
      !["paid", "pay_later"].includes(booking.payment_status)
    ) {
      // Tombol "Bayar Sekarang" dihilangkan dari admin — pembayaran dipilih oleh customer
      // di halaman MyBooking. Admin cukup menunggu metode + status pembayaran masuk.
      return null;
    }
    if ((booking.status === "waiting_confirmation" || booking.status === "pending") && ["paid", "pay_later"].includes(booking.payment_status)) {
      return (
        <Button size="sm" disabled={busy} onClick={() => confirmBooking(booking.id)} className="gap-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse">
          {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {booking.payment_status === "pay_later" ? "Konfirmasi (Bayar di Tempat)" : "Konfirmasi Booking"}
        </Button>
      );
    }
    if (booking.status === "confirmed") {
      return (
        <Button
          size="sm"
          disabled={busy || !dateReached}
          title={!dateReached ? "Belum bisa Check-In sebelum tanggal booking" : undefined}
          onClick={() => updateStatus(booking.id, "checked_in")}
          className="gap-1 h-8 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        >
          {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Car className="h-3.5 w-3.5" />}
          Check-In
        </Button>
      );
    }
    if (booking.status === "checked_in") {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            disabled={busy || !dateReached}
            onClick={() => updateStatus(booking.id, "in_progress")}
            className="gap-1 h-8 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
          >
            {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
            Mulai Dikerjakan
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setQueueBooking(booking); }}
            className="gap-1 h-8"
            title="Atur estimasi antrian"
          >
            <Clock className="h-3.5 w-3.5" />
            {booking.queue_estimated_start
              ? `Antri • ${format(new Date(booking.queue_estimated_start), "HH:mm")}`
              : "Atur Estimasi"}
          </Button>
        </div>
      );
    }
    if (booking.status === "in_progress") {
      const canComplete = booking.payment_status === "paid";
      return (
        <Button
          size="sm"
          disabled={busy || !canComplete}
          title={!canComplete ? "Pembayaran belum dikonfirmasi" : undefined}
          onClick={() => updateStatus(booking.id, "completed")}
          className="gap-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
        >
          {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Selesaikan
        </Button>
      );
    }
    return null;
  };

  // Compact desktop card. opts.showPayment toggles the payment controls block.
  const renderBookingCard = (booking: Booking, opts: { showPayment?: boolean } = {}) => {
    const priority = getBookingPriority(booking.status, booking.booking_date, booking.booking_time, now);
    const overdue = isConfirmOverdue(booking.status, booking.created_at, now);
    const pmeta = PRIORITY_META[priority];
    const meta = getBookingStatusMeta(booking.status);
    const creator = getCreatorLabel(booking);
    const busy = busyId === booking.id;
    const borderColor =
      overdue || priority === "high" ? "border-l-red-500" :
      priority === "medium" ? "border-l-amber-500" :
      "border-l-border";
    return (
      <div
        key={booking.id}
        role="button"
        tabIndex={0}
        onClick={() => setDetailBooking(booking)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailBooking(booking); } }}
        className={`rounded-lg border bg-card border-l-4 ${borderColor} ${overdue ? "bg-red-500/5" : ""} p-3 hover:shadow-sm transition-shadow cursor-pointer hover:ring-1 hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/40`}
      >
        {/* Header row: badges + datetime + owner menu */}
        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={`${pmeta.badgeClass} gap-1 font-semibold text-[10px] h-5`}>
              {priority === "high" && <Flame className="h-3 w-3" />} {pmeta.label}
            </Badge>
            <Badge className={`${meta.badgeClass} border text-[10px] h-5`}>{meta.label}</Badge>
            {opts.showPayment && renderPaymentBadge(booking)}
            <PickupBadge booking={booking as any} />
            {creator && (
              creator.isStaff ? (
                <Badge
                  variant="outline"
                  className="gap-1 text-[10px] h-5 bg-violet-500/15 text-violet-600 border-violet-500/40 dark:text-violet-300 font-semibold"
                  title={`Dibuatkan oleh staff: ${creator.text}`}
                >
                  <UserCog className="h-3 w-3" /> Dibuat Staff · {creator.text}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 text-[10px] h-5 bg-sky-500/15 text-sky-600 border-sky-500/40 dark:text-sky-300 font-medium"
                  title="Dipesan langsung oleh pelanggan"
                >
                  <UserCheck className="h-3 w-3" /> Self-Booking
                </Badge>
              )
            )}
            {overdue && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 animate-pulse">
                <AlertTriangle className="h-3 w-3" /> TERLAMBAT
              </span>
            )}
            {booking.cancel_requested && booking.status !== "cancelled" && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40 text-[10px] h-5 gap-1">
                <Ban className="h-3 w-3" /> Minta Batal
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1 text-xs font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {format(parseISO(booking.booking_date), "dd MMM", { locale: idLocale })} · {booking.booking_time}
            </div>
            {booking.service_price != null && (() => {
              const disc = Number(booking.discount_amount ?? 0);
              const hasDisc = disc > 0;
              const orig = booking.original_service_price != null
                ? Number(booking.original_service_price)
                : Number(booking.service_price) + disc;
              const est = estimasiMap[booking.id]?.total ?? 0;
              const grand = Number(booking.service_price) + est;
              return (
                <div className="flex flex-col items-end leading-tight">
                  {hasDisc && (
                    <span className="text-[10px] line-through text-muted-foreground tabular-nums whitespace-nowrap">
                      Rp {orig.toLocaleString("id-ID")}
                    </span>
                  )}
                  <span className={`text-xs tabular-nums whitespace-nowrap ${est > 0 ? "text-muted-foreground" : "font-semibold text-foreground"}`}>
                    Rp {Number(booking.service_price).toLocaleString("id-ID")}
                  </span>
                  {hasDisc && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                      −Rp {disc.toLocaleString("id-ID")}
                    </span>
                  )}
                  {est > 0 && (
                    <>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                        + Estimasi Rp {est.toLocaleString("id-ID")}
                      </span>
                      <span className="text-xs font-semibold text-primary tabular-nums whitespace-nowrap">
                        Total Rp {grand.toLocaleString("id-ID")}
                      </span>
                    </>
                  )}
                </div>
              );
            })()}
            {isStaff && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleOwnerEdit(booking)} className="gap-2">
                    <Pencil className="h-4 w-4" /> Edit Transaksi
                  </DropdownMenuItem>
                  {booking.cancel_requested && booking.status !== "cancelled" && (
                    <DropdownMenuItem onClick={() => rejectCancellation(booking.id)} className="gap-2">
                      <XCircle className="h-4 w-4" /> Tolak Pembatalan
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleOwnerDelete(booking)} className="gap-2 text-red-600 focus:text-red-600">
                    <Trash2 className="h-4 w-4" /> Hapus Transaksi
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Middle row: 3-column info grid */}
        <div className="grid grid-cols-12 gap-3 text-sm">
          <div className="col-span-4 min-w-0">
            <div className="flex items-center gap-1.5">
              <User2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="font-medium truncate">{booking.customer_name}</p>
            </div>
            <p className="text-xs text-muted-foreground truncate ml-5">{booking.customer_phone || "—"}</p>
            <div className="ml-5 mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="capitalize truncate">{booking.branch || "—"}</span>
            </div>
          </div>
          <div className="col-span-3 min-w-0">
            <div className="flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="font-medium truncate">{booking.car_type || "—"}</p>
            </div>
            <p className="text-xs text-muted-foreground uppercase font-mono ml-5 truncate">{booking.car_plate_number || "—"}</p>
          </div>
          <div className="col-span-5 min-w-0">
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="font-medium truncate">{booking.service_name}</p>
              {booking.customer_notes && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 ml-1"
                      aria-label="Lihat catatan pelanggan"
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                      <Info className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 font-semibold text-amber-600 mb-1">
                      <StickyNote className="h-3 w-3" /> Catatan Pelanggan
                    </div>
                    <p className="whitespace-pre-wrap leading-snug">{booking.customer_notes}</p>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {booking.cancel_reason && booking.cancel_requested && (
              <p className="text-[11px] text-muted-foreground italic ml-5 line-clamp-1">"{booking.cancel_reason}"</p>
            )}
          </div>
        </div>

        {/* Timeline meta strip: created, countdown, last update, payment method, channel */}
        {(() => {
          const createdAt = booking.created_at ? parseISO(booking.created_at) : null;
          const updatedAt = booking.updated_at ? parseISO(booking.updated_at) : null;
          const scheduled = bookingDateTime(booking.booking_date, booking.booking_time);
          const diffMin = (scheduled.getTime() - now.getTime()) / 60000;
          const terminal = booking.status === "completed" || booking.status === "cancelled";
          let countdown: { label: string; cls: string } | null = null;
          if (!terminal) {
            const absMin = Math.abs(diffMin);
            const fmtDur = (m: number) => {
              if (m < 60) return `${Math.round(m)} mnt`;
              if (m < 60 * 24) return `${Math.floor(m / 60)} jam ${Math.round(m % 60)} mnt`;
              return `${Math.floor(m / (60 * 24))} hari`;
            };
            if (diffMin >= 0) {
              const cls = diffMin <= 30 ? "text-red-600 dark:text-red-400" :
                diffMin <= 120 ? "text-amber-600 dark:text-amber-400" :
                "text-emerald-600 dark:text-emerald-400";
              countdown = { label: `Mulai dalam ${fmtDur(absMin)}`, cls };
            } else {
              countdown = { label: `Terlambat ${fmtDur(absMin)}`, cls: "text-red-600 dark:text-red-400" };
            }
          }
          const updatedDiffMs = updatedAt && createdAt ? updatedAt.getTime() - createdAt.getTime() : 0;
          const showUpdated = updatedAt && updatedDiffMs > 60_000;
          const pmLabel = booking.payment_method
            ? (PAY_METHOD_OPTIONS.find((p) => p.value === booking.payment_method)?.label ?? booking.payment_method)
            : null;
          const channel = creator?.isStaff ? null : (booking.user_id ? "Aplikasi" : null);
          return (
            <div className="mt-2 pt-2 border-t border-dashed border-border/40 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              {createdAt && (
                <span
                  className="inline-flex items-center gap-1"
                  title={`Dibuat ${format(createdAt, "dd MMM yyyy HH:mm", { locale: idLocale })}`}
                >
                  <Clock className="h-3 w-3" />
                  Dibuat {formatDistanceToNow(createdAt, { addSuffix: true, locale: idLocale })}
                </span>
              )}
              {countdown && (
                <span className={`inline-flex items-center gap-1 font-medium ${countdown.cls}`}>
                  <Hourglass className="h-3 w-3" />
                  {countdown.label}
                </span>
              )}
              {showUpdated && updatedAt && (
                <span
                  className="inline-flex items-center gap-1"
                  title={`Update ${format(updatedAt, "dd MMM yyyy HH:mm", { locale: idLocale })}`}
                >
                  <RefreshCw className="h-3 w-3" />
                  Update {formatDistanceToNow(updatedAt, { addSuffix: true, locale: idLocale })}
                </span>
              )}
              {pmLabel && (
                <span className="inline-flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {pmLabel}
                </span>
              )}
              {channel && (
                <span className="inline-flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  via {channel}
                </span>
              )}
            </div>
          );
        })()}

        {/* Footer row: primary CTA + secondary controls */}
        <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {renderPrimaryCTA(booking)}
          <Select value={booking.status} onValueChange={(v) => updateStatus(booking.id, v)} disabled={busy}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => {
                const lockedComplete = s.value === "completed" && booking.payment_status !== "paid";
                const ord = (st: string) =>
                  ({ pending: 1, waiting_confirmation: 2, confirmed: 3, checked_in: 4, in_progress: 5, completed: 6, cancelled: 99 } as Record<string, number>)[st] ?? 0;
                const isBackward = !isOwner && s.value !== "cancelled" && ord(s.value) < ord(booking.status);
                const fromTerminal = !isOwner && (booking.status === "completed" || booking.status === "cancelled") && s.value !== booking.status;
                const locked = lockedComplete || isBackward || fromTerminal;
                return (
                  <SelectItem
                    key={s.value}
                    value={s.value}
                    disabled={locked}
                    title={isBackward || fromTerminal ? "Forward-only — ajukan koreksi ke Owner" : lockedComplete ? "Konfirmasi pembayaran dulu" : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <s.icon className="h-3.5 w-3.5" />
                      <span>{s.label}</span>
                      {(isBackward || fromTerminal) && (
                        <span className="ml-auto text-[10px] text-muted-foreground">terkunci</span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {opts.showPayment && (
            <>
              <Select value={payMethodMap[booking.id] || ""} onValueChange={(v) => setPaymentMethod(booking, v)} disabled={busy}>
                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Metode" /></SelectTrigger>
                <SelectContent>
                  {PAY_METHOD_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2"><m.icon className="h-3.5 w-3.5" />{m.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={PAY_STATUS_OPTIONS.some((s) => s.value === booking.payment_status) ? booking.payment_status : "unpaid"}
                onValueChange={(v) => setPaymentStatus(booking, v)}
                disabled={busy}
              >
                <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAY_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TransferProofButton
                bookingId={booking.id}
                paymentMethod={payMethodMap[booking.id]}
              />
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setEstimasiTarget(booking)}
          >
            <Receipt className="h-3.5 w-3.5" />
            Estimasi
            {(estimasiMap[booking.id]?.items ?? 0) > 0 && (
              <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/40">
                {estimasiMap[booking.id].items}
              </Badge>
            )}
          </Button>
          <div className="ml-auto">
            <PickupActions booking={booking as any} onUpdated={fetchBookings} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Confirmation Bookings</CardTitle>
            <CardDescription>View and manage all customer service bookings</CardDescription>
          </div>
          <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setScanOpen(true)}
            className="gap-2 h-9"
          >
            <ScanLine className="h-4 w-4" />
            Scan QR / Cari Kode
          </Button>
          <button
            type="button"
            onClick={fetchBookings}
            disabled={isLoading}
            aria-label="Refresh"
            className="shrink-0 w-[30px] h-[30px] rounded-[8px] border border-border bg-transparent flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ReviewFollowUpPanel />
        <FilterBarV2
          search={{
            placeholder: "Cari nama, telepon, plat, kode booking, layanan...",
            value: searchQuery,
            onChange: setSearchQuery,
          }}
          quickChips={quickChips}
          activeChips={activeChips}
          resultCount={filtered.length}
          isActive={isFilterActive}
          onReset={resetAllFilters}
          advanced={{
            badge: activeChips.length,
            timeline: { value: timeline, onChange: setTimeline },
            dropdowns: [
              {
                key: "status", label: "Status Booking", value: statusFilter,
                onChange: setStatusFilter,
                options: [{ label: "Semua", value: "all" },
                  ...STATUS_OPTIONS.map((s) => ({ label: s.label, value: s.value }))],
              },
              {
                key: "branch", label: "Cabang", value: branchFilter,
                onChange: isLocked ? () => {} : setBranchFilter,
                disabled: isLocked,
                options: isLocked
                  ? branches.map((b) => ({ label: b.name, value: b.slug }))
                  : [{ label: "Semua Cabang", value: "all" },
                      ...branches.map((b) => ({ label: b.name, value: b.slug }))],
              },
              {
                key: "customer", label: "Pelanggan", value: customerFilter,
                onChange: setCustomerFilter,
                options: [{ label: "Semua Pelanggan", value: "all" }, ...customerOptions],
              },
              {
                key: "pay_status", label: "Status Bayar", value: paymentStatusFilter,
                onChange: setPaymentStatusFilter,
                options: [
                  { label: "Semua", value: "all" },
                  { label: "Lunas", value: "paid" },
                  { label: "Belum Lunas", value: "unpaid" },
                  { label: "Menunggu", value: "pending" },
                  { label: "Bayar di Tempat", value: "pay_later" },
                  { label: "Gagal", value: "failed" },
                ],
              },
              {
                key: "pay_method", label: "Metode Bayar", value: paymentMethodFilter,
                onChange: setPaymentMethodFilter,
                options: [
                  { label: "Semua", value: "all" },
                  { label: "Tunai", value: "cash" },
                  { label: "Transfer", value: "transfer" },
                  { label: "QRIS", value: "qris" },
                ],
              },
              {
                key: "location", label: "Lokasi Servis", value: locationFilter,
                onChange: setLocationFilter,
                options: [
                  { label: "Semua", value: "all" },
                  { label: "Di Bengkel", value: "workshop" },
                  { label: "Pickup", value: "pickup" },
                ],
              },
            ],
            ranges: [
              {
                key: "price", label: "Nominal", value: priceRange,
                onChange: setPriceRange, prefix: "Rp",
              },
            ],
            presets: presets.map((p) => ({ id: p.id, name: p.name })),
            onApplyPreset: (id) => {
              const p = presets.find((x) => x.id === id);
              if (p) applyPresetPayload(p.payload);
            },
            onSavePreset: async (name) => { await savePreset(name, currentPresetPayload()); },
            onDeletePreset: async (id) => { await removePreset(id); },
          }}
        />

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              All Bookings
              {waitingCount > 0 && (
                <Badge className="bg-red-500 text-white animate-pulse h-5 px-1.5 text-[10px]">
                  {waitingCount} baru
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="gap-2">
              <Wrench className="h-3.5 w-3.5" />
              Sedang Dikerjakan
              {inProgress.length > 0 && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/40">
                  {inProgress.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {/* Mobile list */}
            <div className="md:hidden space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No bookings found</p>
              ) : (
                filtered.map((booking) => {
                  const priority = getBookingPriority(booking.status, booking.booking_date, booking.booking_time, now);
                  const overdue = isConfirmOverdue(booking.status, booking.created_at, now);
                  return (
                    <MobileBookingRow
                      key={booking.id}
                      booking={booking}
                      priority={priority}
                      overdue={overdue}
                      busy={busyId === booking.id}
                      statusOptions={STATUS_OPTIONS}
                      onConfirm={() => confirmBooking(booking.id)}
                      onUpdateStatus={(v) => updateStatus(booking.id, v)}
                      onApproveCancel={() => approveCancellation(booking.id)}
                      onRejectCancel={() => rejectCancellation(booking.id)}
                      paymentMethod={payMethodMap[booking.id]}
                      onSetPaymentMethod={(m) => setPaymentMethod(booking, m)}
                      onSetPaymentStatus={(s) => setPaymentStatus(booking, s)}
                      isOwner={isStaff}
                      onEdit={() => handleOwnerEdit(booking)}
                      onDelete={() => handleOwnerDelete(booking)}
                      creator={getCreatorLabel(booking)}
                    />
                  );
                })
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground text-sm">No bookings found</p>
              ) : (
                groupByDate(filtered).map((group) => (
                  <div key={group.key} className="mb-4">
                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/60 py-1.5 px-1 mb-2 flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">{group.label}</span>
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{group.items.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((booking) => renderBookingCard(booking, { showPayment: true }))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="in_progress">
            {/* Mobile list */}
            <div className="md:hidden space-y-2">
              {inProgress.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  Tidak ada servis yang sedang dikerjakan
                </p>
              ) : (
                inProgress.map((b) => {
                  const priority = getBookingPriority(b.status, b.booking_date, b.booking_time, now);
                  return (
                    <MobileBookingRow
                      key={b.id}
                      booking={b}
                      priority={priority}
                      overdue={false}
                      busy={busyId === b.id}
                      statusOptions={STATUS_OPTIONS}
                      onConfirm={() => confirmBooking(b.id)}
                      onUpdateStatus={(v) => updateStatus(b.id, v)}
                      onApproveCancel={() => approveCancellation(b.id)}
                      onRejectCancel={() => rejectCancellation(b.id)}
                      paymentMethod={payMethodMap[b.id]}
                      onSetPaymentMethod={(m) => setPaymentMethod(b, m)}
                      onSetPaymentStatus={(s) => setPaymentStatus(b, s)}
                    />
                  );
                })
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              {inProgress.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground text-sm">
                  Tidak ada servis yang sedang dikerjakan
                </p>
              ) : (
                <div className="space-y-2">
                  {inProgress.map((b) => renderBookingCard(b, { showPayment: false }))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <AlertDialog
      open={blockedDialog.open}
      onOpenChange={(o) => setBlockedDialog((p) => ({ ...p, open: o }))}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Belum Bisa Lanjut Status</AlertDialogTitle>
          <AlertDialogDescription>
            {restrictedReasonMessage(blockedDialog.bookingDate)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Mengerti</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {payDialog && (
      <PaymentDialog
        open={!!payDialog}
        onOpenChange={(o) => { if (!o) setPayDialog(null); }}
        bookingId={payDialog.id}
        amount={payDialog.amount}
        serviceName={payDialog.service}
        bookingStatus={payDialog.status}
        onPaymentComplete={() => { setPayDialog(null); fetchBookings(); }}
      />
    )}

    <Dialog open={scanOpen} onOpenChange={setScanOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            Scan QR / Cari Kode Booking
          </DialogTitle>
        </DialogHeader>
        <BookingScanner onComplete={() => { setScanOpen(false); fetchBookings(); }} />
      </DialogContent>
    </Dialog>

    {editTarget && (
      <EditBookingDialog
        open={!!editTarget}
        onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        booking={editTarget as any}
        onSaved={(u) => {
          setBookings((prev) => prev.map((b) => b.id === u.id ? { ...b, ...u } as Booking : b));
          setEditTarget(null);
        }}
      />
    )}

    {deleteTarget && (
      <DeleteBookingDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        bookingId={deleteTarget.id}
        bookingLabel={`${deleteTarget.customer_name} • ${deleteTarget.service_name}`}
        onDeleted={() => {
          setBookings((prev) => prev.filter((b) => b.id !== deleteTarget.id));
          setDeleteTarget(null);
        }}
      />
    )}

    {cancelPrompt && (
      <EditBeforeCancelDialog
        open={!!cancelPrompt}
        onOpenChange={(o) => { if (!o) setCancelPrompt(null); }}
        bookingLabel={`${cancelPrompt.booking.customer_name} • ${cancelPrompt.booking.service_name}`}
        mode={cancelPrompt.mode}
        onEdit={() => {
          setEditTarget(cancelPrompt.booking);
          setCancelPrompt(null);
        }}
        onCancelAnyway={() => {
          const b = cancelPrompt.booking;
          const mode = cancelPrompt.mode;
          setCancelPrompt(null);
          if (mode === "cancel") {
            // Direct cancel — bypass the intercept by writing status directly.
            (async () => {
              setBusyId(b.id);
              const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
              setBusyId(null);
              if (error) {
                toast({ variant: "destructive", title: "Gagal membatalkan", description: error.message });
                return;
              }
              setBookings((prev) => prev.map((x) => x.id === b.id ? { ...x, status: "cancelled" } : x));
              toast({ title: "Booking dibatalkan" });
              logAdminAction({
                action: "booking.status_change",
                targetId: b.id,
                targetLabel: `${b.customer_name} • ${b.service_name}`,
                after: { status: "cancelled" },
                metadata: { branch: b.branch },
              });
            })();
          } else {
            approveCancellation(b.id, true);
          }
        }}
      />
    )}

    <Dialog open={!!detailBooking} onOpenChange={(o) => { if (!o) setDetailBooking(null); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rincian Booking</DialogTitle>
          <DialogDescription>
            {detailBooking ? `${detailBooking.customer_name} • ${detailBooking.service_name}` : ""}
          </DialogDescription>
        </DialogHeader>
        {detailBooking && (() => {
          const b = detailBooking;
          const meta = getBookingStatusMeta(b.status);
          const priority = getBookingPriority(b.status, b.booking_date, b.booking_time, now);
          const pmeta = PRIORITY_META[priority];
          const creator = getCreatorLabel(b);
          const Row = ({ label, value }: { label: string; value: ReactNode }) => (
            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 py-1.5 border-b border-border/40 last:border-0">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-sm min-w-0 break-all [overflow-wrap:anywhere]">{value ?? "—"}</div>
            </div>
          );
          const Section = ({ title, children }: { title: string; children: ReactNode }) => (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{title}</div>
              {children}
            </div>
          );
          const cap = (v?: string | null) =>
            v ? v.charAt(0).toUpperCase() + v.slice(1) : "—";
          const payStatusLabel = (s?: string | null) =>
            s === "paid" ? "Lunas" : s === "pending" ? "Menunggu" : s === "unpaid" ? "Belum Lunas" : cap(s);
          const methodLabel = (m?: string | null) =>
            m === "qris" ? "QRIS" : m === "cash" ? "Cash" : m === "transfer" ? "Transfer Bank" : cap(m);
          const locationLabel = (l?: string | null) =>
            l === "pickup" ? "Pickup" : l === "workshop" ? "Di Bengkel" : cap(l);
          return (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={`${meta.badgeClass} border text-[10px]`}>{meta.label}</Badge>
                <Badge variant="outline" className={`${pmeta.badgeClass} text-[10px]`}>{pmeta.label}</Badge>
                {b.cancel_requested && b.status !== "cancelled" && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40 text-[10px] gap-1">
                    <Ban className="h-3 w-3" /> Minta Batal
                  </Badge>
                )}
                {creator && (
                  <Badge variant="outline" className="text-[10px]">
                    {creator.isStaff ? `Dibuat Staff: ${creator.text}` : "Self-Booking"}
                  </Badge>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <Section title="Jadwal">
                  <Row label="Tanggal" value={format(parseISO(b.booking_date), "EEEE, dd MMM yyyy", { locale: idLocale })} />
                  <Row label="Jam" value={b.booking_time} />
                  <Row label="Dibuat" value={b.created_at ? format(parseISO(b.created_at), "dd MMM yyyy HH:mm", { locale: idLocale }) : "—"} />
                  {b.updated_at && (
                    <Row label="Update Terakhir" value={format(parseISO(b.updated_at), "dd MMM yyyy HH:mm", { locale: idLocale })} />
                  )}
                </Section>

                <Section title="Pelanggan">
                  <Row label="Nama" value={b.customer_name} />
                  <Row label="Telepon" value={
                    b.customer_phone ? (
                      <a className="text-primary hover:underline" href={`https://wa.me/${b.customer_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                        {b.customer_phone}
                      </a>
                    ) : "—"
                  } />
                  <Row label="Email" value={b.customer_email || "—"} />
                  <Row label="Cabang" value={<span className="capitalize">{b.branch || "—"}</span>} />
                </Section>

                <Section title="Kendaraan">
                  <Row label="Mobil" value={b.car_type || "—"} />
                  <Row label="Plat" value={<span className="font-mono uppercase">{b.car_plate_number || "—"}</span>} />
                  <Row label="Lokasi Servis" value={locationLabel(b.service_location)} />
                </Section>

                <Section title="Layanan & Pembayaran">
                  <Row label="Layanan" value={b.service_name} />
                  {(() => {
                    const disc = Number(b.discount_amount ?? 0);
                    const hasDisc = disc > 0;
                    const total = Number(b.service_price ?? 0);
                    const orig = b.original_service_price != null
                      ? Number(b.original_service_price)
                      : total + disc;
                    const sourceLabel = (s?: string | null) =>
                      s === "promo" ? "Promo"
                      : s === "referral" ? "Voucher Referral"
                      : s === "loyalty" ? "Reward Loyalty"
                      : cap(s);
                    return (
                      <>
                        <Row
                          label="Harga Normal"
                          value={
                            <span className={hasDisc ? "line-through text-muted-foreground" : ""}>
                              Rp {orig.toLocaleString("id-ID")}
                            </span>
                          }
                        />
                        <Row
                          label="Potongan"
                          value={
                            hasDisc ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                − Rp {disc.toLocaleString("id-ID")}
                                {(b.discount_label || b.discount_code) && (
                                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                                    · {b.discount_label || b.discount_code}
                                    {b.discount_source ? ` (${sourceLabel(b.discount_source)})` : ""}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Rp 0</span>
                            )
                          }
                        />
                        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 py-1.5 mt-1 border-t border-border/60">
                          <div className="text-xs font-semibold text-foreground">Total Harga</div>
                          <div className="text-sm font-semibold text-primary min-w-0 break-all [overflow-wrap:anywhere]">
                            Rp {total.toLocaleString("id-ID")}
                          </div>
                        </div>
                        {(estimasiMap[b.id]?.total ?? 0) > 0 && (
                          <>
                            <Row
                              label="Estimasi SPK"
                              value={
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  + Rp {(estimasiMap[b.id].total).toLocaleString("id-ID")}
                                </span>
                              }
                            />
                            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 py-1.5 border-t border-border/60">
                              <div className="text-xs font-semibold text-foreground">Total + Estimasi</div>
                              <div className="text-sm font-semibold text-primary min-w-0 break-all [overflow-wrap:anywhere]">
                                Rp {(total + estimasiMap[b.id].total).toLocaleString("id-ID")}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                  <Row label="Status Bayar" value={payStatusLabel(b.payment_status)} />
                  <Row label="Metode" value={methodLabel(b.payment_method)} />
                </Section>

                {(b.pickup_address || b.pickup_status) && (
                  <Section title="Pickup">
                    <Row label="Alamat" value={b.pickup_address || "—"} />
                    <Row label="Jarak" value={b.pickup_distance_km != null ? `${b.pickup_distance_km} km` : "—"} />
                    <Row label="Status" value={cap(b.pickup_status)} />
                    <Row label="Return" value={b.pickup_return ? "Ya" : "Tidak"} />
                    {(b.pickup_odometer_start != null || b.pickup_odometer_end != null) && (
                      <Row label="Odometer" value={`${b.pickup_odometer_start ?? "—"} → ${b.pickup_odometer_end ?? "—"}`} />
                    )}
                  </Section>
                )}

                {(b.status === "checked_in" || b.queue_estimated_start || b.queue_note) && (
                  <div className="sm:col-span-2">
                    <Section title="Antrian">
                      <Row
                        label="Estimasi Mulai"
                        value={
                          b.queue_estimated_start
                            ? format(new Date(b.queue_estimated_start), "HH:mm 'WIB' · dd MMM yyyy", { locale: idLocale })
                            : "Belum diatur"
                        }
                      />
                      {b.queue_note && (
                        <div className="grid grid-cols-[110px_1fr] gap-2 items-start">
                          <span className="text-xs text-muted-foreground pt-0.5">Catatan</span>
                          <p className="text-sm italic whitespace-pre-wrap leading-snug">"{b.queue_note}"</p>
                        </div>
                      )}
                      {b.queue_set_at && (
                        <Row
                          label="Diatur"
                          value={format(new Date(b.queue_set_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                        />
                      )}
                      <div className="pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8"
                          onClick={() => { setQueueBooking(b); setDetailBooking(null); }}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {b.queue_estimated_start ? "Ubah Estimasi" : "Atur Estimasi"}
                        </Button>
                      </div>
                    </Section>
                  </div>
                )}

                {b.customer_notes && (
                  <div className="sm:col-span-2"><Section title="Catatan Pelanggan">
                    <p className="text-sm whitespace-pre-wrap leading-snug">{b.customer_notes}</p>
                  </Section></div>
                )}

                {b.cancel_requested && b.cancel_reason && (
                  <div className="sm:col-span-2"><Section title="Alasan Pembatalan">
                    <p className="text-sm italic text-muted-foreground whitespace-pre-wrap">"{b.cancel_reason}"</p>
                  </Section></div>
                )}
              </div>
            </div>
          );
        })()}
        <DialogFooter>
          {detailBooking && (
            <div className="flex flex-wrap gap-2 mr-auto">
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to={`/invoice/${detailBooking.id}`} target="_blank" rel="noreferrer">
                  <FileText className="h-3.5 w-3.5" /> Invoice
                </Link>
              </Button>
              {detailBooking.user_id && (
                <>
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link to={`/dashboard/customers/${detailBooking.user_id}`}>
                      <User2 className="h-3.5 w-3.5" /> Profil Pelanggan
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link to={`/dashboard/history?tab=payments&customer=${detailBooking.user_id}`}>
                      <CreditCard className="h-3.5 w-3.5" /> Riwayat Bayar
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}
          <Button variant="outline" onClick={() => setDetailBooking(null)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {queueBooking && (
      <QueueEstimateDialog
        open={!!queueBooking}
        onOpenChange={(o) => { if (!o) setQueueBooking(null); }}
        booking={queueBooking}
        onSaved={(next) => {
          setBookings((prev) =>
            prev.map((bk) => (bk.id === queueBooking.id ? { ...bk, ...next } : bk)),
          );
        }}
      />
    )}
    <BookingEstimasiDialog
      booking={estimasiTarget}
      onOpenChange={(o) => { if (!o) setEstimasiTarget(null); }}
      onSaved={(bookingId, total) => {
        loadEstimasi([bookingId]);
        setEstimasiMap((prev) => ({
          ...prev,
          [bookingId]: { total, items: prev[bookingId]?.items ?? 1 },
        }));
      }}
    />
    </>
  );
};

export default BookingsManager;
