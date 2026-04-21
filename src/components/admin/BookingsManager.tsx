import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
import { Input } from "@/components/ui/input";
import {
  Search, RefreshCw, Car, Clock, CheckCircle2, Wrench, Bell, XCircle, ShieldCheck, AlertTriangle, Flame, Ban,
} from "lucide-react";
import { getBookingStatusMeta } from "@/lib/bookingStatus";
import {
  getBookingPriority, PRIORITY_META, PRIORITY_RANK, isConfirmOverdue,
} from "@/lib/bookingPriority";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  cancel_requested?: boolean;
  cancel_reason?: string | null;
  updated_at?: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Menunggu Pembayaran", icon: Clock },
  { value: "waiting_confirmation", label: "Menunggu Konfirmasi", icon: Bell },
  { value: "confirmed", label: "Dikonfirmasi", icon: CheckCircle2 },
  { value: "in_progress", label: "Sedang Dikerjakan", icon: Wrench },
  { value: "completed", label: "Selesai", icon: CheckCircle2 },
  { value: "cancelled", label: "Dibatalkan", icon: XCircle },
];

const BRANCHES = [
  { value: "bandung", label: "Bandung" },
  { value: "tasikmalaya", label: "Tasikmalaya" },
  { value: "cirebon", label: "Cirebon" },
  { value: "yogyakarta", label: "Yogyakarta" },
];

const BookingsManager = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [now, setNow] = useState(() => new Date());
  const { toast } = useToast();

  // Tick every 30s so priority + overdue warnings refresh in real time
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    let query = supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false });

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (branchFilter !== "all") query = query.eq("branch", branchFilter);

    const { data, error } = await query;
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setBookings(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [statusFilter, branchFilter]);

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
    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } else {
      toast({ title: "Status updated" });
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)));
    }
  };

  const confirmBooking = async (id: string) => {
    const { data, error } = await supabase.rpc("confirm_booking", { _booking_id: id });
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
      prev.map((b) => (b.id === id ? { ...b, status: "confirmed", service_status: "in_progress" } : b))
    );
  };

  const approveCancellation = async (id: string) => {
    const { data, error } = await supabase.rpc("approve_booking_cancellation", { _booking_id: id });
    const r = data as { success?: boolean; error?: string } | null;
    if (error || !r?.success) {
      toast({ variant: "destructive", title: "Gagal", description: error?.message || r?.error });
      return;
    }
    toast({ title: "Pembatalan disetujui" });
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled", cancel_requested: false } : b)));
  };

  const rejectCancellation = async (id: string) => {
    const reason = window.prompt("Alasan penolakan (opsional):") || "";
    const { data, error } = await supabase.rpc("reject_booking_cancellation", { _booking_id: id, _reason: reason });
    const r = data as { success?: boolean; error?: string } | null;
    if (error || !r?.success) {
      toast({ variant: "destructive", title: "Gagal", description: error?.message || r?.error });
      return;
    }
    toast({ title: "Permintaan ditolak" });
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, cancel_requested: false, cancel_reason: null } : b)));
  };

  const filtered = bookings
    .filter(
      (b) =>
        b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.car_plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )
    .slice()
    .sort((a, b) => {
      // 1. Pending confirmation always at the top, newest first
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

  const waitingCount = bookings.filter((b) => b.status === "waiting_confirmation").length;
  const inProgress = bookings
    .filter((b) => b.status === "in_progress" || b.status === "confirmed")
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Bookings</CardTitle>
        <CardDescription>View and manage all customer service bookings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchBookings} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

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
            <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No bookings found</TableCell></TableRow>
              ) : (
                filtered.map((booking) => {
                  const priority = getBookingPriority(booking.status, booking.booking_date, booking.booking_time, now);
                  const overdue = isConfirmOverdue(booking.status, booking.created_at, now);
                  const pmeta = PRIORITY_META[priority];
                  return (
                  <TableRow key={booking.id} className={overdue ? "bg-red-500/5" : undefined}>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className={`${pmeta.badgeClass} gap-1 font-semibold text-[10px]`}>
                          {priority === "high" && <Flame className="h-3 w-3" />}
                          {pmeta.label}
                        </Badge>
                        {overdue && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 animate-pulse">
                            <AlertTriangle className="h-3 w-3" /> TERLAMBAT KONFIRMASI
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{booking.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
                      <p className="text-sm text-muted-foreground">{booking.customer_phone}</p>
                    </TableCell>
                    <TableCell><p className="font-medium capitalize">{booking.branch || "—"}</p></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1"><Car className="h-4 w-4 text-muted-foreground" /><p className="font-medium">{booking.car_type || "—"}</p></div>
                      <p className="text-sm text-muted-foreground uppercase font-mono">{booking.car_plate_number || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{booking.service_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{booking.service_type}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{format(new Date(booking.booking_date), "dd MMM yyyy")}</p>
                      <p className="text-sm text-muted-foreground">{booking.booking_time}</p>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const meta = getBookingStatusMeta(booking.status);
                        return (
                          <div className="space-y-1">
                            <Badge className={`${meta.badgeClass} border`}>{meta.label}</Badge>
                            <p className="text-[11px] text-muted-foreground max-w-[180px] leading-tight">{meta.description}</p>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        booking.payment_status === "paid" ? "bg-emerald-500/20 text-emerald-400" :
                        booking.payment_status === "pending_payment" ? "bg-primary/20 text-primary" :
                        booking.payment_status === "failed" ? "bg-red-500/20 text-red-400" :
                        "bg-muted text-muted-foreground"
                      }>
                        {booking.payment_status === "paid" ? "Paid" :
                         booking.payment_status === "pending_payment" ? "Pending" :
                         booking.payment_status === "failed" ? "Failed" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {booking.cancel_requested && booking.status !== "cancelled" && (
                          <div className="rounded-md border border-primary/40 bg-primary/10 p-2 text-xs space-y-1">
                            <div className="flex items-center gap-1 font-semibold text-primary dark:text-primary">
                              <Ban className="h-3 w-3" /> Request Pembatalan
                            </div>
                            {booking.cancel_reason && (
                              <p className="text-muted-foreground italic line-clamp-2">"{booking.cancel_reason}"</p>
                            )}
                            <div className="flex gap-1 pt-1">
                              <Button size="sm" variant="destructive" className="h-7 px-2 text-xs flex-1" onClick={() => approveCancellation(booking.id)}>
                                Setujui
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs flex-1" onClick={() => rejectCancellation(booking.id)}>
                                Tolak
                              </Button>
                            </div>
                          </div>
                        )}
                        {booking.status === "waiting_confirmation" &&
                          ["paid", "pay_later"].includes(booking.payment_status) && (
                            <Button
                              size="sm"
                              onClick={() => confirmBooking(booking.id)}
                              className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                            >
                              <ShieldCheck className="h-4 w-4" />
                              {booking.payment_status === "pay_later"
                                ? "Confirm (Bayar di Tempat)"
                                : "Confirm Booking"}
                            </Button>
                          )}
                        <Select value={booking.status} onValueChange={(v) => updateStatus(booking.id, v)}>
                          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                <div className="flex items-center gap-2"><s.icon className="h-4 w-4" />{s.label}</div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
          </TabsContent>

          <TabsContent value="in_progress">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inProgress.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Tidak ada servis yang sedang dikerjakan
                      </TableCell>
                    </TableRow>
                  ) : (
                    inProgress.map((b) => {
                      const meta = getBookingStatusMeta(b.status);
                      return (
                        <TableRow key={b.id}>
                          <TableCell>
                            <p className="font-medium">{b.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                          </TableCell>
                          <TableCell className="capitalize">{b.branch || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium">{b.car_type || "—"}</p>
                            </div>
                            <p className="text-xs text-muted-foreground uppercase font-mono">
                              {b.car_plate_number || "—"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{b.service_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{b.service_type}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{format(new Date(b.booking_date), "dd MMM yyyy")}</p>
                            <p className="text-xs text-muted-foreground">{b.booking_time}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${meta.badgeClass} border`}>{meta.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Select value={b.status} onValueChange={(v) => updateStatus(b.id, v)}>
                              <SelectTrigger className="w-[170px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    <div className="flex items-center gap-2">
                                      <s.icon className="h-4 w-4" />{s.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BookingsManager;
