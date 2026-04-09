import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, RefreshCw, Eye, Car, Pencil, Plus, CalendarCheck, MoreHorizontal } from "lucide-react";
import EditCustomerDialog from "./EditCustomerDialog";
import AddVehicleDialog from "./AddVehicleDialog";
import QuickBookingDialog from "./QuickBookingDialog";

interface CustomerRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  customer_id: string | null;
  email: string;
  vehicle_count: number;
}

const CustomerList = () => {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Dialog states
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null);
  const [addVehicleCustomerId, setAddVehicleCustomerId] = useState<string | null>(null);
  const [bookingCustomer, setBookingCustomer] = useState<CustomerRow | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, customer_id");
      if (profilesError) throw profilesError;

      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("user_id");
      if (vehiclesError) throw vehiclesError;

      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("user_id, customer_email");
      if (bookingsError) throw bookingsError;

      const emailMap = new Map<string, string>();
      bookings?.forEach((b) => {
        if (!emailMap.has(b.user_id)) emailMap.set(b.user_id, b.customer_email);
      });

      const vehicleCountMap = new Map<string, number>();
      vehicles?.forEach((v) => {
        vehicleCountMap.set(v.user_id, (vehicleCountMap.get(v.user_id) || 0) + 1);
      });

      const rows: CustomerRow[] = (profiles || []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        customer_id: p.customer_id,
        email: emailMap.get(p.id) || "—",
        vehicle_count: vehicleCountMap.get(p.id) || 0,
      }));

      setCustomers(rows);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const filtered = customers.filter((c) => {
    const matchesSearch =
      (c.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_id?.toLowerCase().includes(search.toLowerCase()) ?? false);

    if (filter === "with_vehicle") return matchesSearch && c.vehicle_count > 0;
    if (filter === "no_vehicle") return matchesSearch && c.vehicle_count === 0;
    return matchesSearch;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="with_vehicle">With Vehicle</SelectItem>
                <SelectItem value="no_vehicle">No Vehicle</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchCustomers} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Vehicles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.full_name || "—"}
                        {c.customer_id && (
                          <p className="text-xs text-muted-foreground font-mono">{c.customer_id}</p>
                        )}
                      </TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          {c.vehicle_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.vehicle_count > 0 ? (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                            Has Vehicle
                          </Badge>
                        ) : (
                          <Badge variant="destructive">No Vehicle</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/customers/${c.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> View Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditCustomer(c)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAddVehicleCustomerId(c.id)}>
                              <Plus className="h-4 w-4 mr-2" /> Add Vehicle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/customers/${c.id}`)}>
                              <Car className="h-4 w-4 mr-2" /> View Vehicles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setBookingCustomer(c)}>
                              <CalendarCheck className="h-4 w-4 mr-2" /> Create Booking
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <EditCustomerDialog
        open={!!editCustomer}
        onOpenChange={(open) => !open && setEditCustomer(null)}
        customer={editCustomer}
        onSaved={fetchCustomers}
      />

      {/* Add Vehicle Dialog */}
      {addVehicleCustomerId && (
        <AddVehicleDialog
          open={!!addVehicleCustomerId}
          onOpenChange={(open) => !open && setAddVehicleCustomerId(null)}
          customerId={addVehicleCustomerId}
          onSaved={fetchCustomers}
        />
      )}

      {/* Quick Booking Dialog */}
      {bookingCustomer && (
        <QuickBookingDialog
          open={!!bookingCustomer}
          onOpenChange={(open) => !open && setBookingCustomer(null)}
          customerId={bookingCustomer.id}
          customerName={bookingCustomer.full_name || "Customer"}
          customerEmail={bookingCustomer.email}
          customerPhone={bookingCustomer.phone || ""}
          onAddVehicle={() => {
            setBookingCustomer(null);
            setAddVehicleCustomerId(bookingCustomer.id);
          }}
        />
      )}
    </>
  );
};

export default CustomerList;
