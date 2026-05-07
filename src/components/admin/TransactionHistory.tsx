import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Activity, Loader2, ChevronLeft, ChevronRight, FileText, Car, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import FilterBar from "./filters/FilterBar";
import { DEFAULT_TIMELINE, TimelineValue, getDateRange } from "@/utils/timelineFilter";
import { useBranches } from "@/hooks/useBranches";

interface TransactionRow {
  booking_id: string;
  customer_name: string;
  car_type: string | null;
  car_plate_number: string | null;
  service_name: string;
  service_type: string;
  service_price: number;
  booking_status: string;
  payment_status: string;
  payment_method: string | null;
  booking_date: string;
  created_at: string;
}

const formatIDR = (n: number) => (!n || n <= 0) ? "FREE" : `Rp ${n.toLocaleString("id-ID")}`;

const statusBadge = (status: string, type: "booking" | "payment") => {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500/20 text-emerald-400",
    confirmed: "bg-blue-500/20 text-blue-400",
    pending: "bg-primary/20 text-primary",
    failed: "bg-red-500/20 text-red-400",
    cancelled: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/20 text-emerald-400",
    paid: "bg-emerald-500/20 text-emerald-400",
    unpaid: "bg-primary/20 text-primary",
    pending_payment: "bg-primary/20 text-primary",
  };
  return <Badge variant="secondary" className={`${colors[status] || "bg-muted text-muted-foreground"} text-[10px]`}>{status}</Badge>;
};

const PAGE_SIZE = 25;

const TransactionHistory = () => {
  const navigate = useNavigate();
  const { isStaff } = useUserRole();
  const { branches } = useBranches();
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [timeline, setTimeline] = useState<TimelineValue>(DEFAULT_TIMELINE);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search 350ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const dateRange = useMemo(() => getDateRange(timeline), [timeline]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch bookings with their payment info
    let query = supabase
      .from("bookings")
      .select("id,customer_name,car_type,car_plate_number,service_name,service_type,service_price,status,payment_status,booking_date,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "all") {
      query = query.eq("payment_status", statusFilter);
    }
    if (branchFilter !== "all") {
      query = query.eq("branch", branchFilter);
    }
    query = query
      .gte("created_at", `${dateRange.start}T00:00:00`)
      .lte("created_at", `${dateRange.end}T23:59:59`);

    if (debouncedSearch.trim()) {
      const s = debouncedSearch.trim();
      query = query.or(`customer_name.ilike.%${s}%,service_name.ilike.%${s}%,car_plate_number.ilike.%${s}%`);
    }

    const { data: bookingsData, count } = await query;

    if (bookingsData) {
      // Get payment methods for these bookings
      const bookingIds = bookingsData.map((b: any) => b.id);
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("booking_id,payment_method")
        .in("booking_id", bookingIds);

      const paymentMap: Record<string, string> = {};
      (paymentsData || []).forEach((p: any) => { paymentMap[p.booking_id] = p.payment_method; });

      const mapped: TransactionRow[] = bookingsData.map((b: any) => ({
        booking_id: b.id,
        customer_name: b.customer_name,
        car_type: b.car_type,
        car_plate_number: b.car_plate_number,
        service_name: b.service_name,
        service_type: b.service_type,
        service_price: b.service_price,
        booking_status: b.status,
        payment_status: b.payment_status,
        payment_method: paymentMap[b.id] || null,
        booking_date: b.booking_date,
        created_at: b.created_at,
      }));
      setRows(mapped);
    }
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, statusFilter, branchFilter, debouncedSearch, dateRange.start, dateRange.end]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [statusFilter, branchFilter, debouncedSearch, dateRange.start, dateRange.end]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <FilterBar
        search={{
          placeholder: "Cari customer, service, plat...",
          value: search,
          onChange: setSearch,
        }}
        timeline={{ value: timeline, onChange: setTimeline, label: "Periode" }}
        chips={[
          { key: "all", label: "Semua", value: "all", active: statusFilter === "all", onClick: () => setStatusFilter("all") },
          { key: "paid", label: "Paid", value: "paid", active: statusFilter === "paid", onClick: () => setStatusFilter("paid") },
          { key: "success", label: "Success", value: "success", active: statusFilter === "success", onClick: () => setStatusFilter("success") },
          { key: "pending", label: "Pending", value: "pending", active: statusFilter === "pending", onClick: () => setStatusFilter("pending") },
          { key: "unpaid", label: "Unpaid", value: "unpaid", active: statusFilter === "unpaid", onClick: () => setStatusFilter("unpaid") },
          { key: "failed", label: "Failed", value: "failed", active: statusFilter === "failed", onClick: () => setStatusFilter("failed") },
        ]}
        dropdowns={[
          {
            key: "branch", label: "Cabang", value: branchFilter, onChange: setBranchFilter,
            options: [
              { label: "Semua", value: "all" },
              ...branches.map((b) => ({ label: b.name, value: b.slug })),
            ],
          },
        ]}
        resultCount={totalCount}
        onReset={() => {
          setSearch(""); setStatusFilter("all"); setBranchFilter("all"); setTimeline(DEFAULT_TIMELINE);
        }}
      />

      {/* Table */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Transaction History
            <Badge variant="outline" className="ml-auto text-xs">{totalCount} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Tidak ada transaksi ditemukan</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="overflow-x-auto admin-table-wrapper hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Kendaraan</TableHead>
                      <TableHead>Service / Produk</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead className="w-[80px]">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.booking_id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.booking_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{r.customer_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.car_type ? (
                            <span className="flex items-center gap-1"><Car className="h-3 w-3" />{r.car_type} {r.car_plate_number}</span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-sm">{r.service_name}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatIDR(Number(r.service_price))}</TableCell>
                        <TableCell>{statusBadge(r.payment_status, "payment")}</TableCell>
                        <TableCell>{statusBadge(r.booking_status, "booking")}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => navigate(`/invoice/${r.booking_id}`)}>
                            <FileText className="h-3 w-3" />
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="mobile-card-list md:hidden space-y-3">
                {rows.map((r) => (
                  <div key={r.booking_id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{r.customer_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(r.booking_date), "dd MMM yyyy")}
                        </p>
                      </div>
                      <p className="text-sm font-bold whitespace-nowrap">{formatIDR(Number(r.service_price))}</p>
                    </div>
                    <p className="text-xs line-clamp-2">{r.service_name}</p>
                    {r.car_type && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                        <Car className="h-3 w-3 shrink-0" />
                        <span className="truncate">{r.car_type} {r.car_plate_number}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {statusBadge(r.payment_status, "payment")}
                      {statusBadge(r.booking_status, "booking")}
                    </div>
                    <div className="flex items-center justify-end pt-2 border-t border-border/60">
                      <Button size="sm" variant="ghost" className="h-8 px-2 gap-1 text-xs" onClick={() => navigate(`/invoice/${r.booking_id}`)}>
                        <FileText className="h-3.5 w-3.5" /> Lihat Invoice
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">Halaman {page + 1} dari {totalPages || 1}</p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 gap-1">
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </Button>
                  <Button size="sm" variant="outline" disabled={(page + 1) >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 gap-1">
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionHistory;
