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
  Search, RefreshCw, Car, Clock, CheckCircle2, Wrench, Sparkles, Bell, XCircle,
} from "lucide-react";

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
  created_at: string;
  car_type: string | null;
  car_plate_number: string | null;
  branch: string | null;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", icon: Clock, color: "bg-muted" },
  { value: "confirmed", label: "Confirmed", icon: Bell, color: "bg-blue-500" },
  { value: "checked_in", label: "Checked In", icon: Car, color: "bg-yellow-500" },
  { value: "in_progress", label: "In Progress", icon: Wrench, color: "bg-orange-500" },
  { value: "finishing", label: "Finishing Up", icon: Sparkles, color: "bg-purple-500" },
  { value: "completed", label: "Completed", icon: CheckCircle2, color: "bg-green-500" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "bg-destructive" },
];

const BRANCHES = [
  { value: "bandung", label: "Bandung" },
  { value: "tasikmalaya", label: "Tasikmalaya" },
  { value: "cirebon", label: "Cirebon" },
  { value: "yogyakarta", label: "Yogyakarta" },
];

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "completed": return "default";
    case "in_progress":
    case "finishing": return "secondary";
    case "cancelled": return "destructive";
    default: return "outline";
  }
};

const BookingsManager = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const { toast } = useToast();

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

  const filtered = bookings.filter(
    (b) =>
      b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.car_plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
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

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No bookings found</TableCell></TableRow>
              ) : (
                filtered.map((booking) => (
                  <TableRow key={booking.id}>
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
                      <Badge variant={getStatusBadgeVariant(booking.status)}>
                        {STATUS_OPTIONS.find((s) => s.value === booking.status)?.label || booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={booking.status} onValueChange={(v) => updateStatus(booking.id, v)}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              <div className="flex items-center gap-2"><s.icon className="h-4 w-4" />{s.label}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingsManager;
