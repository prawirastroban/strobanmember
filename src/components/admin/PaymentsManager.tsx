import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreditCard, ChevronLeft, ChevronRight, Loader2, DollarSign, Clock, XCircle, CheckCircle2, Eye, FileText, User, Car, Calendar, Hash, ShieldCheck, Check, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import FilterBar from "./filters/FilterBar";
import { DEFAULT_TIMELINE, TimelineValue, getDateRange } from "@/utils/timelineFilter";
import { isActionNeeded, ACTION_BADGE_CLASS } from "@/lib/actionNeeded";

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
  // Per-row busy state to prevent double-click duplicate confirm/reject submissions.
  const [busyId, setBusyId] = useState<string | null>(null);

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
    setDetailLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("id,customer_name,customer_phone,customer_email,car_type,car_plate_number,service_name,booking_date,booking_time,status,branch")
      .eq("id", payment.booking_id)
      .maybeSingle();
    setBookingDetail(data as BookingDetail | null);
    setDetailLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { setPage(0); }, [statusFilter, methodFilter, search]);

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

      <FilterBar
        search={{
          placeholder: "Cari Order ID / Transaction ID...",
          value: search,
          onChange: setSearch,
        }}
        timeline={{ value: timeline, onChange: setTimeline, label: "Periode" }}
        chips={[
          {
            key: "action_needed",
            label: "⚡ Perlu Aksi",
            value: "action_needed",
            active: statusFilter === "pending",
            onClick: () => setStatusFilter(statusFilter === "pending" ? "all" : "pending"),
            count: pendingCount,
          },
          { key: "all", label: "Semua", value: "all", active: statusFilter === "all", onClick: () => setStatusFilter("all") },
          { key: "success", label: "Success", value: "success", active: statusFilter === "success", onClick: () => setStatusFilter("success") },
          { key: "pending", label: "Pending", value: "pending", active: statusFilter === "pending", onClick: () => setStatusFilter("pending") },
          { key: "failed", label: "Failed", value: "failed", active: statusFilter === "failed", onClick: () => setStatusFilter("failed") },
        ]}
        dropdowns={[
          {
            key: "method", label: "Metode", value: methodFilter, onChange: setMethodFilter,
            options: [
              { label: "Semua", value: "all" },
              { label: "Midtrans", value: "midtrans" },
              { label: "Cash", value: "cash" },
              { label: "Transfer", value: "transfer" },
              { label: "QRIS", value: "qris" },
              { label: "Bayar di Tempat", value: "pay_at_workshop" },
            ],
          },
        ]}
        rangeFilters={[
          {
            key: "amount", label: "Nominal", prefix: "Rp",
            value: [minAmount, maxAmount],
            onChange: ([mn, mx]) => { setMinAmount(mn); setMaxAmount(mx); },
          },
        ]}
        resultCount={totalCount}
        onReset={() => {
          setSearch(""); setStatusFilter("all"); setMethodFilter("all");
          setMinAmount(null); setMaxAmount(null); setTimeline(DEFAULT_TIMELINE);
        }}
      />

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
                        <TableCell>{statusBadge(p.payment_status)}</TableCell>
                        <TableCell className="font-mono text-xs">{p.booking_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
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

              <div className="flex flex-wrap justify-end gap-2 pt-2">
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
    </div>
  );
};

export default PaymentsManager;
