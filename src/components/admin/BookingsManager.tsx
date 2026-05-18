import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
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
import { CreditCard, Banknote, QrCode, Wallet, Info, User2, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PaymentDialog from "@/components/PaymentDialog";
import { getBookingStatusMeta } from "@/lib/bookingStatus";
import {
  getBookingPriority, PRIORITY_META, PRIORITY_RANK, isConfirmOverdue,
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
import FilterBar from "./filters/FilterBar";
import { DEFAULT_TIMELINE, TimelineValue, getDateRange, isTimelineDefault } from "@/utils/timelineFilter";
import { isActionNeeded, ACTION_BADGE_CLASS } from "@/lib/actionNeeded";
import { useScopedBranches } from "@/hooks/useBranches";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BookingScanner from "./BookingScanner";
import ReviewFollowUpPanel from "./ReviewFollowUpPanel";
import PickupActions, { PickupBadge } from "./PickupActions";
import { useUserRole } from "@/hooks/useUserRole";
import EditBookingDialog from "./EditBookingDialog";
import DeleteBookingDialog from "./DeleteBookingDialog";
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
}

const PAY_METHOD_OPTIONS = [
  { value: "cash", label: "Tunai", icon: Banknote },
  { value: "transfer", label: "Transfer Bank", icon: CreditCard },
  { value: "qris", label: "QRIS", icon: QrCode },
];

const PAY_STATUS_OPTIONS = [
  { value: "unpaid", label: "Belum Lunas" },
  { value: "pending", label: "Menunggu" },
  { value: "pay_later", label: "Bayar di Tempat" },
  { value: "failed", label: "Gagal" },
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
  const { isStaff } = useUserRole();
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

  // Load existing payment_method per booking from payments table
  useEffect(() => {
    if (bookings.length === 0) return;
    const ids = bookings.map((b) => b.id);
    supabase.from("payments").select("booking_id,payment_method").in("booking_id", ids).then(({ data }) => {
      if (!data) return;
      const m: Record<string, string> = {};
      data.forEach((r: any) => { if (r.payment_method) m[r.booking_id] = r.payment_method; });
      // Fresh DB data wins over stale local cache so webhook/admin-elsewhere updates reflect.
      setPayMethodMap((prev) => ({ ...prev, ...m }));
    });
  }, [bookings.length]);

  const setPaymentMethod = async (booking: Booking, method: string) => {
    setPayMethodMap((prev) => ({ ...prev, [booking.id]: method }));
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
              icon: "/favicon.ico",
            });
          }
          // Add to list if matches current filters
          setBookings((prev) => [newBooking, ...prev]);
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
                icon: "/favicon.ico",
              });
            }
          }
          setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [toast]);

  const updateStatus = async (id: string, newStatus: string) => {
    if (busyId) return;
    // Rule: status check_in / in_progress / completed hanya bisa di tanggal booking
    const target = bookings.find((b) => b.id === id);
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

  const approveCancellation = async (id: string) => {
    if (busyId) return;
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
      return (
        <Button
          size="sm"
          onClick={() => setPayDialog({ id: booking.id, amount: Number(booking.service_price ?? 0), status: booking.status, service: booking.service_name })}
          className="gap-1 h-8 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white"
        >
          <CreditCard className="h-3.5 w-3.5" /> Bayar Sekarang
        </Button>
      );
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
        <Button
          size="sm"
          disabled={busy || !dateReached}
          onClick={() => updateStatus(booking.id, "in_progress")}
          className="gap-1 h-8 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
        >
          {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
          Mulai Dikerjakan
        </Button>
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
        className={`rounded-lg border bg-card border-l-4 ${borderColor} ${overdue ? "bg-red-500/5" : ""} p-3 hover:shadow-sm transition-shadow`}
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {format(parseISO(booking.booking_date), "dd MMM", { locale: idLocale })} · {booking.booking_time}
            </div>
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
              {creator && (
                <>
                  <span>·</span>
                  <span className="truncate">{creator.text}</span>
                  {creator.isStaff && (
                    <Badge variant="outline" className="h-3.5 px-1 text-[9px] border-primary/40 text-primary">Staff</Badge>
                  )}
                </>
              )}
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
                      className="inline-flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 ml-1"
                      aria-label="Lihat catatan pelanggan"
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                      <Info className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-xs">
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

        {/* Footer row: primary CTA + secondary controls */}
        <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-2 flex-wrap">
          {renderPrimaryCTA(booking)}
          <Select value={booking.status} onValueChange={(v) => updateStatus(booking.id, v)} disabled={busy}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => {
                const lockedComplete = s.value === "completed" && booking.payment_status !== "paid";
                return (
                  <SelectItem key={s.value} value={s.value} disabled={lockedComplete}>
                    <div className="flex items-center gap-2"><s.icon className="h-3.5 w-3.5" />{s.label}</div>
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
              <Select value={booking.payment_status === "paid" ? "paid" : booking.payment_status === "pending" ? "pending" : "unpaid"} onValueChange={(v) => setPaymentStatus(booking, v)} disabled={busy}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAY_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
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
        <FilterBar
          search={{
            placeholder: "Cari nama, telepon, plat, layanan...",
            value: searchQuery,
            onChange: setSearchQuery,
          }}
          timeline={{ value: timeline, onChange: setTimeline, label: "Tgl Dibuat" }}
          chips={[
            {
              key: "action_needed",
              label: "⚡ Perlu Aksi",
              value: "action_needed",
              active: onlyActionNeeded,
              onClick: () => setOnlyActionNeeded((v) => !v),
              count: bookings.filter((b) => isActionNeeded("booking", b)).length,
            },
            {
              key: "cancel_req", label: "🚫 Pembatalan", value: "cancel_req",
              active: onlyCancelRequest,
              onClick: () => setOnlyCancelRequest((v) => !v),
              count: bookings.filter((b) => b.cancel_requested && b.status !== "cancelled").length,
            },
            {
              key: "unpaid", label: "💸 Belum Bayar", value: "unpaid",
              active: onlyUnpaid,
              onClick: () => setOnlyUnpaid((v) => !v),
              count: bookings.filter((b) => b.payment_status !== "paid").length,
            },
            {
              key: "pickup", label: "🚗 Pickup Aktif", value: "pickup",
              active: onlyPickup,
              onClick: () => setOnlyPickup((v) => !v),
              count: bookings.filter((b) => b.pickup_status && b.pickup_status !== "idle").length,
            },
            { key: "all", label: "Semua", value: "all", active: statusFilter === "all", onClick: () => setStatusFilter("all") },
            ...STATUS_OPTIONS.map((s) => ({
              key: s.value, label: s.label, value: s.value,
              active: statusFilter === s.value, onClick: () => setStatusFilter(s.value),
            })),
          ]}
          dropdowns={[
            {
              key: "branch", label: "Cabang", value: branchFilter,
              onChange: isLocked ? () => {} : setBranchFilter,
              disabled: isLocked,
              options: isLocked
                ? branches.map((b) => ({ label: b.name, value: b.slug }))
                : [
                    { label: "Semua", value: "all" },
                    ...branches.map((b) => ({ label: b.name, value: b.slug })),
                  ],
            },
            {
              key: "customer", label: "Pelanggan", value: customerFilter,
              onChange: setCustomerFilter,
              options: [{ label: "Semua", value: "all" }, ...customerOptions],
            },
            {
              key: "pay_status", label: "Bayar", value: paymentStatusFilter,
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
              key: "pay_method", label: "Metode", value: paymentMethodFilter,
              onChange: setPaymentMethodFilter,
              options: [
                { label: "Semua", value: "all" },
                { label: "Tunai", value: "cash" },
                { label: "Transfer", value: "transfer" },
                { label: "QRIS", value: "qris" },
              ],
            },
            {
              key: "location", label: "Lokasi", value: locationFilter,
              onChange: setLocationFilter,
              options: [
                { label: "Semua", value: "all" },
                { label: "Bengkel", value: "workshop" },
                { label: "Pickup", value: "pickup" },
              ],
            },
          ]}
          rangeFilters={[
            {
              key: "price", label: "Nominal", value: priceRange,
              onChange: setPriceRange, prefix: "Rp",
            },
          ]}
          resultCount={filtered.length}
          onReset={() => {
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
                      onPayNow={() => setPayDialog({ id: booking.id, amount: Number(booking.service_price ?? 0), status: booking.status, service: booking.service_name })}
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
    </>
  );
};

export default BookingsManager;
