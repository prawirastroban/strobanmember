import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Activity, Loader2, Search, ChevronLeft, ChevronRight, FileText, Car, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

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

const formatIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

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
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

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

    if (search.trim()) {
      query = query.or(`customer_name.ilike.%${search.trim()}%,service_name.ilike.%${search.trim()}%,car_plate_number.ilike.%${search.trim()}%`);
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
  }, [page, statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [statusFilter, search]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari customer, service, plat..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Payment Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
              <div className="overflow-x-auto">
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
