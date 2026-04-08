import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Search,
  RefreshCw,
  Car,
  Clock,
  CheckCircle2,
  Wrench,
  Sparkles,
  Bell,
  XCircle,
  CalendarCheck,
  LayoutGrid,
  Trophy,
  Gift,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import LoyaltyPointsManager from "@/components/admin/LoyaltyPointsManager";
import RewardsManager from "@/components/admin/RewardsManager";
import LoyaltyAnalytics from "@/components/admin/LoyaltyAnalytics";
import ServiceManager from "@/components/admin/ServiceManager";


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

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "completed":
      return "default";
    case "in_progress":
    case "finishing":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

const BRANCHES = [
  { value: "bandung", label: "Bandung" },
  { value: "tasikmalaya", label: "Tasikmalaya" },
  { value: "cirebon", label: "Cirebon" },
  { value: "yogyakarta", label: "Yogyakarta" },
];

const Admin = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const { toast } = useToast();

  const fetchBookings = async () => {
    setIsLoading(true);
    let query = supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (branchFilter !== "all") {
      query = query.eq("branch", branchFilter);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        variant: "destructive",
        title: "Error fetching bookings",
        description: error.message,
      });
    } else {
      setBookings(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, branchFilter]);

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Status updated",
        description: `Booking status changed to ${newStatus}`,
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    }
  };

  const filteredBookings = bookings.filter(
    (booking) =>
      booking.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.car_plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your business from one place
          </p>
        </div>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabsTrigger value="bookings" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
              <CalendarCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Bookings</span>
              <span className="sm:hidden">Book</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Services</span>
              <span className="sm:hidden">Svc</span>
            </TabsTrigger>
            <TabsTrigger value="tires" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
              <CircleDot className="h-4 w-4" />
              <span className="hidden sm:inline">Tires</span>
              <span className="sm:hidden">Tire</span>
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Loyalty</span>
              <span className="sm:hidden">Loyal</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Rewards</span>
              <span className="sm:hidden">Rwds</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: All Bookings */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>
                  View and manage all customer service bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or service..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Filter by branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {BRANCHES.map((branch) => (
                        <SelectItem key={branch.value} value={branch.value}>
                          {branch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchBookings} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
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
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : filteredBookings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No bookings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{booking.customer_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {booking.customer_email}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {booking.customer_phone}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium capitalize">{booking.branch || "—"}</p>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="flex items-center gap-1">
                                  <Car className="h-4 w-4 text-muted-foreground" />
                                  <p className="font-medium">{booking.car_type || "—"}</p>
                                </div>
                                <p className="text-sm text-muted-foreground uppercase font-mono">
                                  {booking.car_plate_number || "—"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{booking.service_name}</p>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {booking.service_type}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {format(new Date(booking.booking_date), "dd MMM yyyy")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {booking.booking_time}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(booking.status)}>
                                {STATUS_OPTIONS.find((s) => s.value === booking.status)?.label ||
                                  booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={booking.status}
                                onValueChange={(value) => updateBookingStatus(booking.id, value)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                      <div className="flex items-center gap-2">
                                        <status.icon className="h-4 w-4" />
                                        {status.label}
                                      </div>
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
          </TabsContent>

          {/* Tab 2: Service Catalog Manager */}
          <TabsContent value="services">
            <ServiceManager />
          </TabsContent>

          {/* Tab 3: Tire Catalog Manager */}
          <TabsContent value="tires">
            <TireManager />
          </TabsContent>

          {/* Tab 4: Loyalty Program */}
          <TabsContent value="loyalty" className="space-y-6">
            <LoyaltyAnalytics />
            <LoyaltyPointsManager />
          </TabsContent>

          {/* Tab 4: Rewards Management */}
          <TabsContent value="rewards">
            <RewardsManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
