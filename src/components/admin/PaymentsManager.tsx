import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreditCard, ChevronLeft, ChevronRight, Loader2, DollarSign, Clock, XCircle, CheckCircle2, Eye, FileText, User, Car, Calendar, Hash, ShieldCheck, Check, X, RefreshCw, MessageCircle, AlertTriangle, Receipt, Download, Copy as CopyIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import FilterBarV2, { type QuickChip, type ActiveChip } from "./filters/FilterBarV2";
import { DEFAULT_TIMELINE, TimelineValue, getDateRange, isTimelineDefault, TIMELINE_PRESETS } from "@/utils/timelineFilter";
import { useFilterPresets } from "@/hooks/useFilterPresets";
import { isActionNeeded, ACTION_BADGE_CLASS } from "@/lib/actionNeeded";
import { openWhatsApp } from "@/lib/whatsapp";
import TransferProofButton from "./keuangan/TransferProofButton";

interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  midtrans_order_id?: string | null;
  midtrans_transaction_id?: string | null;
  verified_by_webhook?: boolean;
  webhook_received_at?: string | null;
  updated_at?: string;
}

interface BookingDetail {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  car_type: string | null;
  car_plate_number: string | null;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  branch: string | null;
}

const PAGE_SIZE = 20;

const statusBadge = (status: string) => {
  switch (status) {
    case "success": return <Badge className="bg-emerald-500/20 text-emerald-400 gap-1"><CheckCircle2 className="h-3 w-3" />Success</Badge>;
    case "pending": return <Badge className="bg-primary/20 text-primary gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
    case "failed": return <Badge className="bg-red-500/20 text-red-400 gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const formatIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const PaymentsManager = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusHandledRef = useRef(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [timeline, setTimeline] = useState<TimelineValue>(DEFAULT_TIMELINE);
  const [minAmount, setMinAmount] = useState<number | null>(null);
  const [maxAmount, setMaxAmount] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [bookingDetail, setBookingDetail] = useState<BookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Manual transfer/QRIS proof for the selected payment
  type ProofRow = { id: string; proof_url: string; method: string; sender_name: string; sender_bank: string | null; transfer_amount: number; transfer_date: string; status: string; notes: string | null; created_at: string };
  const [proof, setProof] = useState<ProofRow | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofViewerOpen, setProofViewerOpen] = useState(false);
  // Per-row busy state to prevent double-click duplicate confirm/reject submissions.
  const [busyId, setBusyId] = useState<string | null>(null);
  // Busy state for Midtrans status sync (gateway lookup)
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Debounce search 350ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const dateRange = useMemo(() => getDateRange(timeline), [timeline]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("payments")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "all") query = query.eq("payment_status", statusFilter);
    if (methodFilter !== "all") query = query.eq("payment_method", methodFilter);
    if (minAmount !== null) query = query.gte("amount", minAmount);
    if (maxAmount !== null) query = query.lte("amount", maxAmount);
    query = query
      .gte("created_at", `${dateRange.start}T00:00:00`)
      .lte("created_at", `${dateRange.end}T23:59:59`);
    if (debouncedSearch.trim()) {
      const s = debouncedSearch.trim();
      query = query.or(`midtrans_order_id.ilike.%${s}%,midtrans_transaction_id.ilike.%${s}%`);
    }

    const { data, count } = await query;
    const list = (data as Payment[]) || [];
    // Sort action-needed (pending) to the top of the current page
    list.sort((a, b) => {
      const ap = isActionNeeded("payment", a) ? 0 : 1;
      const bp = isActionNeeded("payment", b) ? 0 : 1;
      return ap - bp;
    });
    setPayments(list);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, statusFilter, methodFilter, minAmount, maxAmount, debouncedSearch, dateRange.start, dateRange.end]);

  useEffect(() => { setPage(0); }, [statusFilter, methodFilter, minAmount, maxAmount, debouncedSearch, dateRange.start, dateRange.end]);

  const isManual = (m: string) => m !== "midtrans";

  // === Filter helpers ======================================================
  const { presets, save: savePreset, remove: removePreset } = useFilterPresets("payments");
  const resetAll = () => {
    setSearch(""); setStatusFilter("all"); setMethodFilter("all");
    setMinAmount(null); setMaxAmount(null); setTimeline(DEFAULT_TIMELINE);
  };
  const isActive =
    !!search || statusFilter !== "all" || methodFilter !== "all" ||
    minAmount !== null || maxAmount !== null || !isTimelineDefault(timeline);

  const renderFilterBar = () => {
    const tlLabel = TIMELINE_PRESETS.find((p) => p.value === timeline.preset)?.label || timeline.preset;
    const quickChips: QuickChip[] = [
      { key: "today", label: "Hari Ini", active: timeline.preset === "today",
        onClick: () => setTimeline({ preset: timeline.preset === "today" ? "this_month" : "today" }) },
      { key: "this_week", label: "Minggu Ini", active: timeline.preset === "this_week",
        onClick: () => setTimeline({ preset: timeline.preset === "this_week" ? "this_month" : "this_week" }) },
      { key: "this_month", label: "Bulan Ini", active: timeline.preset === "this_month",
        onClick: () => setTimeline({ preset: "this_month" }) },
      { key: "pending", label: "⚡ Pending", active: statusFilter === "pending",
        onClick: () => setStatusFilter(statusFilter === "pending" ? "all" : "pending"),
        count: pendingCount },
      { key: "success", label: "Success", active: statusFilter === "success",
        onClick: () => setStatusFilter(statusFilter === "success" ? "all" : "success") },
      { key: "failed", label: "Failed", active: statusFilter === "failed",
        onClick: () => setStatusFilter(statusFilter === "failed" ? "all" : "failed") },
    ];
    const activeChips: ActiveChip[] = [
      !isTimelineDefault(timeline) && {
        key: "timeline", label: tlLabel, onRemove: () => setTimeline(DEFAULT_TIMELINE),
      },
      statusFilter !== "all" && {
        key: "status", label: `Status: ${statusFilter}`, onRemove: () => setStatusFilter("all"),
      },
      methodFilter !== "all" && {
        key: "method", label: `Metode: ${methodFilter}`, onRemove: () => setMethodFilter("all"),
      },
      (minAmount !== null || maxAmount !== null) && {
        key: "amount", label: `Nominal: ${minAmount ?? "0"} – ${maxAmount ?? "∞"}`,
        onRemove: () => { setMinAmount(null); setMaxAmount(null); },
      },
    ].filter(Boolean) as ActiveChip[];
    const payload = () => ({
      search, timeline,
      dropdowns: { status: statusFilter, method: methodFilter },
      ranges: { amount: [minAmount, maxAmount] as [number | null, number | null] },
    });
    const apply = (p: any) => {
      if (!p) return;
      if (typeof p.search === "string") setSearch(p.search);
      if (p.timeline) setTimeline(p.timeline);
      if (p.dropdowns?.status) setStatusFilter(p.dropdowns.status);
      if (p.dropdowns?.method) setMethodFilter(p.dropdowns.method);
      if (p.ranges?.amount) { setMinAmount(p.ranges.amount[0]); setMaxAmount(p.ranges.amount[1]); }
    };
    return (
      <FilterBarV2
        search={{ placeholder: "Cari Order ID, Transaction ID, no invoice...", value: search, onChange: setSearch }}
        quickChips={quickChips}
        activeChips={activeChips}
        resultCount={totalCount}
        isActive={isActive}
        onReset={resetAll}
        advanced={{
          badge: activeChips.length,
          timeline: { value: timeline, onChange: setTimeline },
          dropdowns: [
            {
              key: "status", label: "Status Pembayaran", value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { label: "Semua", value: "all" },
                { label: "Success", value: "success" },
                { label: "Pending", value: "pending" },
                { label: "Failed", value: "failed" },
              ],
            },
            {
              key: "method", label: "Metode Pembayaran", value: methodFilter,
              onChange: setMethodFilter,
              options: [
                { label: "Semua", value: "all" },
                { label: "Midtrans", value: "midtrans" },
                { label: "Cash", value: "cash" },
                { label: "Transfer", value: "transfer" },
                { label: "QRIS", value: "qris" },
                { label: "Bayar di Tempat", value: "pay_at_workshop" },
              ],
            },
          ],
          ranges: [{
            key: "amount", label: "Nominal", prefix: "Rp",
            value: [minAmount, maxAmount],
            onChange: ([mn, mx]) => { setMinAmount(mn); setMaxAmount(mx); },
          }],
          presets: presets.map((p) => ({ id: p.id, name: p.name })),
          onApplyPreset: (id) => { const p = presets.find((x) => x.id === id); if (p) apply(p.payload); },
          onSavePreset: async (name) => { await savePreset(name, payload()); },
          onDeletePreset: async (id) => { await removePreset(id); },
        }}
      />
    );
  };
  const isMidtrans = (m: string) => m === "midtrans" || m === "midtrans_test";

  // For Midtrans pending payments admin cannot manually confirm — instead they
  // should sync status from the gateway (in case webhook missed) or contact
  // the customer to remind/cancel.
  const handleSyncMidtrans = async (payment: Payment) => {
    if (syncingId) return;
    setSyncingId(payment.id);
    const { data, error } = await supabase.functions.invoke("midtrans-recover-pending");
    setSyncingId(null);
    if (error) {
      toast.error("Gagal cek status: " + error.message);
      return;
    }
    const result = (data as { results?: Array<{ payment_id: string; recovered: boolean; message: string }> } | null)?.results
      ?.find((r) => r.payment_id === payment.id);
    if (result?.recovered) {
      toast.success("Status diperbarui: pembayaran sukses ✅");
    } else {
      toast.info(`Status Midtrans: ${result?.message || "masih pending"}`);
    }
    fetchPayments();
  };

  const handleMarkFailed = async (payment: Payment) => {
    if (busyId) return;
    if (!window.confirm("Tandai pembayaran ini sebagai GAGAL? Booking akan dibatalkan.")) return;
    setBusyId(payment.id);
    const { error: pErr } = await supabase
      .from("payments")
      .update({ payment_status: "failed" })
      .eq("id", payment.id);
    if (!pErr) {
      await supabase
        .from("bookings")
        .update({ payment_status: "failed", status: "cancelled" })
        .eq("id", payment.booking_id);
    }
    setBusyId(null);
    if (pErr) {
      toast.error("Gagal: " + pErr.message);
      return;
    }
    toast.success("Pembayaran ditandai gagal & booking dibatalkan.");
    fetchPayments();
    if (selectedPayment?.id === payment.id) setSelectedPayment(null);
  };

  const handleContactCustomer = async (payment: Payment) => {
    // Try to use already loaded booking detail, else fetch quickly
    let phone = bookingDetail?.customer_phone;
    let name = bookingDetail?.customer_name;
    if (!phone || selectedPayment?.id !== payment.id) {
      const { data } = await supabase
        .from("bookings")
        .select("customer_name,customer_phone")
        .eq("id", payment.booking_id)
        .maybeSingle();
      phone = (data as { customer_phone?: string } | null)?.customer_phone;
      name = (data as { customer_name?: string } | null)?.customer_name;
    }
    if (!phone) {
      toast.error("Nomor customer tidak ditemukan.");
      return;
    }
    const msg =
      `Halo ${name || "Customer"}, kami dari Bengkel Mobil Stroban Service. ` +
      `Pembayaran Anda sebesar ${formatIDR(Number(payment.amount))} masih berstatus *PENDING* di Midtrans. ` +
      `Mohon segera selesaikan pembayaran agar booking dapat kami konfirmasi. Terima kasih 🙏`;
    openWhatsApp({ phone, text: msg });
  };

  const handleConfirm = async (payment: Payment) => {
    if (busyId) return;
    setBusyId(payment.id);
    const { data, error } = await supabase.rpc("confirm_manual_payment", { _payment_id: payment.id });
    setBusyId(null);
    if (error || (data && !(data as { success: boolean }).success)) {
      const msg = (data as { error?: string })?.error || error?.message || "Gagal";
      toast.error("Gagal konfirmasi: " + msg);
      return;
    }
    toast.success("Pembayaran dikonfirmasi. Booking dipindah ke menunggu konfirmasi bengkel.");
    fetchPayments();
    if (selectedPayment?.id === payment.id) setSelectedPayment(null);
  };

  const handleReject = async (payment: Payment) => {
    if (busyId) return;
    const reason = window.prompt("Alasan penolakan (opsional):") || undefined;
    setBusyId(payment.id);
    const { data, error } = await supabase.rpc("reject_manual_payment", { _payment_id: payment.id, _reason: reason });
    setBusyId(null);
    if (error || (data && !(data as { success: boolean }).success)) {
      const msg = (data as { error?: string })?.error || error?.message || "Gagal";
      toast.error("Gagal menolak: " + msg);
      return;
    }
    toast.success("Pembayaran ditolak. Customer telah diberitahu.");
    fetchPayments();
    if (selectedPayment?.id === payment.id) setSelectedPayment(null);
  };

  const openDetail = async (payment: Payment) => {
    setSelectedPayment(payment);
    setBookingDetail(null);
    setProof(null);
    setDetailLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("id,customer_name,customer_phone,customer_email,car_type,car_plate_number,service_name,booking_date,booking_time,status,branch")
      .eq("id", payment.booking_id)
      .maybeSingle();
    setBookingDetail(data as BookingDetail | null);
    setDetailLoading(false);
    // Fetch latest manual payment proof for this booking (transfer/qris)
    setProofLoading(true);
    const { data: pr } = await supabase
      .from("manual_payment_proofs")
      .select("id,proof_url,method,sender_name,sender_bank,transfer_amount,transfer_date,status,notes,created_at")
      .eq("booking_id", payment.booking_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setProof((pr as ProofRow | null) ?? null);
    setProofLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { setPage(0); }, [statusFilter, methodFilter, search]);

  // Auto-open payment detail when deep-linked via ?booking=<id> or ?payment=<id>
  useEffect(() => {
    if (focusHandledRef.current) return;
    const focusBooking = searchParams.get("booking");
    const focusPayment = searchParams.get("payment");
    if (!focusBooking && !focusPayment) return;
    if (loading) return;
    const match =
      (focusPayment && payments.find((p) => p.id === focusPayment)) ||
      (focusBooking && payments.find((p) => p.booking_id === focusBooking));
    const clearParams = () => {
      const next = new URLSearchParams(searchParams);
      next.delete("booking");
      next.delete("payment");
      setSearchParams(next, { replace: true });
    };
    focusHandledRef.current = true;
    (async () => {
      if (match) {
        openDetail(match);
      } else {
        // Not on current page — fetch directly by booking/payment id.
        let q = supabase.from("payments").select("*");
        if (focusPayment) q = q.eq("id", focusPayment);
        else if (focusBooking) q = q.eq("booking_id", focusBooking);
        const { data } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (data) openDetail(data as Payment);
        else toast.info("Pembayaran tidak ditemukan.");
      }
      clearParams();
    })();
  }, [payments, loading, searchParams, setSearchParams]);

  // KPIs
  const totalRevenue = payments.filter(p => p.payment_status === "success").reduce((s, p) => s + Number(p.amount), 0);
  const pendingCount = payments.filter(p => p.payment_status === "pending").length;
  const failedCount = payments.filter(p => p.payment_status === "failed").length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15"><DollarSign className="h-5 w-5 text-emerald-400" /></div>
            <div><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-lg font-bold">{formatIDR(totalRevenue)}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15"><Clock className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold">{pendingCount}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/15"><XCircle className="h-5 w-5 text-red-400" /></div>
            <div><p className="text-xs text-muted-foreground">Failed</p><p className="text-lg font-bold">{failedCount}</p></div>
          </CardContent>
        </Card>
      </div>

      {renderFilterBar()}

      {/* Table */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> All Payments
            <Badge variant="outline" className="ml-auto text-xs">{totalCount} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="overflow-x-auto admin-table-wrapper hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Booking ID</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(p.created_at), "dd MMM yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">{formatIDR(Number(p.amount))}</TableCell>
                        <TableCell className="capitalize">{p.payment_method}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {statusBadge(p.payment_status)}
                            {isActionNeeded("payment", p) && (
                              <span className={ACTION_BADGE_CLASS}>⚡ Perlu Aksi</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.booking_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TransferProofButton bookingId={p.booking_id} paymentMethod={p.payment_method} />
                            {isManual(p.payment_method) && p.payment_status === "pending" && (
                              <>
                                <Button size="sm" variant="ghost" disabled={busyId === p.id} className="h-8 gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={() => handleConfirm(p)}>
                                  <Check className="h-3.5 w-3.5" /> Konfirmasi
                                </Button>
                                <Button size="sm" variant="ghost" disabled={busyId === p.id} className="h-8 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10" onClick={() => handleReject(p)}>
                                  <X className="h-3.5 w-3.5" /> Tolak
                                </Button>
                              </>
                            )}
                            {isMidtrans(p.payment_method) && p.payment_status === "pending" && (
                              <>
                                <Button size="sm" variant="ghost" disabled={syncingId === p.id} className="h-8 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-500/10" onClick={() => handleSyncMidtrans(p)}>
                                  {syncingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Cek Status
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={() => handleContactCustomer(p)}>
                                  <MessageCircle className="h-3.5 w-3.5" /> Hubungi
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => openDetail(p)}>
                              <Eye className="h-3.5 w-3.5" /> Detail
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="mobile-card-list md:hidden space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{formatIDR(Number(p.amount))}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(p.created_at), "dd MMM yyyy HH:mm")}
                        </p>
                      </div>
                      {statusBadge(p.payment_status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <Badge variant="outline" className="capitalize">{p.payment_method}</Badge>
                      <span className="font-mono text-muted-foreground">#{p.booking_id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/60">
                      <TransferProofButton bookingId={p.booking_id} paymentMethod={p.payment_method} />
                      {isManual(p.payment_method) && p.payment_status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" disabled={busyId === p.id} className="h-8 px-2 gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={() => handleConfirm(p)}>
                            <Check className="h-3.5 w-3.5" /> OK
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busyId === p.id} className="h-8 px-2 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10" onClick={() => handleReject(p)}>
                            <X className="h-3.5 w-3.5" /> Tolak
                          </Button>
                        </>
                      )}
                      {isMidtrans(p.payment_method) && p.payment_status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" disabled={syncingId === p.id} className="h-8 px-2 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-500/10" onClick={() => handleSyncMidtrans(p)}>
                            {syncingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Cek
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={() => handleContactCustomer(p)}>
                            <MessageCircle className="h-3.5 w-3.5" /> WA
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 px-2 gap-1 text-xs" onClick={() => openDetail(p)}>
                        <Eye className="h-3.5 w-3.5" /> Detail
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">Page {page + 1} of {totalPages || 1}</p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 gap-1">
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </Button>
                  <Button size="sm" variant="outline" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)} className="h-8 gap-1">
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Detail Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => { if (!open) { setSelectedPayment(null); setBookingDetail(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Payment Detail
            </DialogTitle>
            <DialogDescription>Rincian lengkap pembayaran & booking terkait</DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Payment Info</p>
                  {statusBadge(selectedPayment.payment_status)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Amount</p>
                    <p className="font-bold text-base">{formatIDR(Number(selectedPayment.amount))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" />Method</p>
                    <p className="font-medium capitalize">{selectedPayment.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Created</p>
                    <p className="font-medium">{format(new Date(selectedPayment.created_at), "dd MMM yyyy HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Webhook Verified</p>
                    <p className="font-medium">{selectedPayment.verified_by_webhook ? "✅ Yes" : "❌ No"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" />Payment ID</p>
                    <p className="font-mono text-xs break-all">{selectedPayment.id}</p>
                  </div>
                  {selectedPayment.midtrans_order_id && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Midtrans Order ID</p>
                      <p className="font-mono text-xs break-all">{selectedPayment.midtrans_order_id}</p>
                    </div>
                  )}
                  {selectedPayment.midtrans_transaction_id && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Midtrans Transaction ID</p>
                      <p className="font-mono text-xs break-all">{selectedPayment.midtrans_transaction_id}</p>
                    </div>
                  )}
                  {selectedPayment.webhook_received_at && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Webhook Received At</p>
                      <p className="text-xs">{format(new Date(selectedPayment.webhook_received_at), "dd MMM yyyy HH:mm:ss")}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Booking Info</p>
                {detailLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : !bookingDetail ? (
                  <p className="text-sm text-muted-foreground italic">Booking tidak ditemukan</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Customer</p>
                      <p className="font-medium">{bookingDetail.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{bookingDetail.customer_phone} · {bookingDetail.customer_email}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Service</p>
                      <p className="font-medium">{bookingDetail.service_name}</p>
                    </div>
                    {bookingDetail.car_type && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Car className="h-3 w-3" />Vehicle</p>
                        <p className="font-medium">{bookingDetail.car_type} {bookingDetail.car_plate_number}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Booking Date</p>
                      <p className="font-medium">{format(new Date(bookingDetail.booking_date), "dd MMM yyyy")} · {bookingDetail.booking_time}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Booking Status</p>
                      <Badge variant="outline" className="capitalize">{bookingDetail.status}</Badge>
                    </div>
                    {bookingDetail.branch && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Branch</p>
                        <p className="font-medium">{bookingDetail.branch}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bukti Transfer / QRIS */}
              {(proofLoading || proof) && (
                <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1">
                      <Receipt className="h-3.5 w-3.5" /> Bukti Pembayaran
                    </p>
                    {proof && (
                      <Badge variant="outline" className="capitalize text-xs">
                        {proof.method} · {proof.status}
                      </Badge>
                    )}
                  </div>
                  {proofLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                  ) : proof ? (
                    <div className="flex gap-3 items-start">
                      <button
                        type="button"
                        onClick={() => setProofViewerOpen(true)}
                        className="flex-shrink-0 group"
                        title="Lihat bukti"
                      >
                        {/\.pdf(\?|$)/i.test(proof.proof_url) ? (
                          <div className="h-24 w-24 rounded border border-border/60 bg-muted/40 flex items-center justify-center group-hover:opacity-80 transition">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                        ) : (
                          <img src={proof.proof_url} alt="Bukti transfer" className="h-24 w-24 object-cover rounded border border-border/60 group-hover:opacity-80 transition" />
                        )}
                      </button>
                      <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Pengirim</p>
                          <p className="font-medium">{proof.sender_name}{proof.sender_bank ? ` · ${proof.sender_bank}` : ""}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Nominal</p>
                          <p className="font-medium">{formatIDR(Number(proof.transfer_amount))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tanggal Transfer</p>
                          <p className="font-medium">{format(new Date(proof.transfer_date), "dd MMM yyyy")}</p>
                        </div>
                        {proof.notes && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Catatan</p>
                            <p className="font-medium whitespace-pre-wrap">{proof.notes}</p>
                          </div>
                        )}
                        <div className="col-span-2">
                          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setProofViewerOpen(true)}>
                            <Eye className="h-3.5 w-3.5" /> Lihat Bukti
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                {isMidtrans(selectedPayment.payment_method) && selectedPayment.payment_status === "pending" && (
                  <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex gap-2 items-start">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-300">Pembayaran Midtrans masih PENDING</p>
                      <p>Admin tidak dapat mengonfirmasi manual. Rekomendasi aksi:</p>
                      <ol className="list-decimal pl-4 space-y-0.5">
                        <li><b>Cek Status Midtrans</b> — tarik status terbaru dari gateway (jika webhook gagal).</li>
                        <li><b>Hubungi via WA</b> — ingatkan customer menyelesaikan pembayaran.</li>
                        <li><b>Tandai Gagal</b> — jika customer batal/expired, booking akan dibatalkan.</li>
                      </ol>
                    </div>
                  </div>
                )}
                {isManual(selectedPayment.payment_method) && selectedPayment.payment_status === "pending" && (
                  <>
                    <Button variant="outline" disabled={busyId === selectedPayment.id} onClick={() => handleReject(selectedPayment)} className="gap-2 text-red-600 border-red-500/30 hover:bg-red-500/10">
                      <X className="h-4 w-4" /> Tolak Pembayaran
                    </Button>
                    <Button onClick={() => handleConfirm(selectedPayment)} disabled={busyId === selectedPayment.id} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Check className="h-4 w-4" /> Konfirmasi Lunas
                    </Button>
                  </>
                )}
                {isMidtrans(selectedPayment.payment_method) && selectedPayment.payment_status === "pending" && (
                  <>
                    <Button variant="outline" disabled={busyId === selectedPayment.id} onClick={() => handleMarkFailed(selectedPayment)} className="gap-2 text-red-600 border-red-500/30 hover:bg-red-500/10">
                      <X className="h-4 w-4" /> Tandai Gagal
                    </Button>
                    <Button variant="outline" onClick={() => handleContactCustomer(selectedPayment)} className="gap-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10">
                      <MessageCircle className="h-4 w-4" /> Hubungi via WA
                    </Button>
                    <Button onClick={() => handleSyncMidtrans(selectedPayment)} disabled={syncingId === selectedPayment.id} className="gap-2 bg-blue-600 hover:bg-blue-700">
                      {syncingId === selectedPayment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Cek Status Midtrans
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => { setSelectedPayment(null); setBookingDetail(null); }}>
                  Tutup
                </Button>
                {bookingDetail && (
                  <Button onClick={() => { navigate(`/invoice/${bookingDetail.id}`); setSelectedPayment(null); }} className="gap-2">
                    <FileText className="h-4 w-4" /> Lihat Invoice
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Proof viewer */}
      <Dialog open={proofViewerOpen} onOpenChange={setProofViewerOpen}>
        <DialogContent className="max-w-4xl bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Bukti Pembayaran
            </DialogTitle>
            <DialogDescription>
              {proof ? `${proof.method.toUpperCase()} · ${proof.sender_name}` : ""}
            </DialogDescription>
          </DialogHeader>
          {proof && (
            <div className="space-y-3">
              {/\.pdf(\?|$)/i.test(proof.proof_url) ? (
                <iframe src={proof.proof_url} title="Bukti PDF" className="w-full h-[70vh] rounded border border-border/60" />
              ) : (
                <img src={proof.proof_url} alt="Bukti" className="w-full max-h-[70vh] object-contain rounded border border-border/60" />
              )}
              <p className="text-[11px] text-muted-foreground break-all font-mono">{proof.proof_url}</p>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(proof.proof_url); toast.success("URL disalin"); }
                    catch { toast.error("Gagal menyalin"); }
                  }}
                >
                  <CopyIcon className="h-3.5 w-3.5" /> Salin URL
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-1">
                  <a href={proof.proof_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </Button>
                <Button asChild size="sm" className="gap-1">
                  <a href={proof.proof_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3.5 w-3.5" /> Buka Tab Baru
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsManager;
