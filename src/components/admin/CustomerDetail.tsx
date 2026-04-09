import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, Car, User, Mail, Phone, CalendarCheck } from "lucide-react";
import EditCustomerDialog from "./EditCustomerDialog";
import AddVehicleDialog from "./AddVehicleDialog";
import QuickBookingDialog from "./QuickBookingDialog";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  customer_id: string | null;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  license_plate: string;
  tire_size: string | null;
  transmission: string | null;
  fuel_type: string | null;
  image_url: string | null;
  is_default: boolean;
}

interface Booking {
  id: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  branch: string | null;
  car_type: string | null;
}

const CustomerDetail = () => {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("—");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const fetchData = async () => {
    if (!customerId) return;
    setIsLoading(true);

    const [profileRes, vehiclesRes, bookingsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", customerId).single(),
      supabase.from("vehicles").select("*").eq("user_id", customerId),
      supabase.from("bookings").select("id, service_name, booking_date, booking_time, status, branch, car_type, customer_email").eq("user_id", customerId).order("booking_date", { ascending: false }).limit(10),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (bookingsRes.data) {
      setBookings(bookingsRes.data);
      if (bookingsRes.data[0]) setEmail(bookingsRes.data[0].customer_email);
    }

    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [customerId]);

  const deleteVehicle = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Vehicle deleted" });
      setDeleteTarget(null);
      fetchData();
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "confirmed": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "cancelled": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Customer not found.
        <Button variant="link" onClick={() => navigate("/dashboard/customers")}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/dashboard/customers")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Button>

      {/* Section A: Customer Info */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {profile.full_name || "Unnamed Customer"}
            </CardTitle>
            {profile.customer_id && (
              <CardDescription className="font-mono">{profile.customer_id}</CardDescription>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{profile.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{vehicles.length} vehicle(s)</span>
          </div>
        </CardContent>
      </Card>

      {/* Section B: Vehicles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vehicles</CardTitle>
          <Button size="sm" onClick={() => setShowAddVehicle(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Vehicle
          </Button>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted-foreground">No vehicle found</p>
              <Button variant="outline" onClick={() => setShowAddVehicle(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Vehicle
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Tire Size</TableHead>
                    <TableHead>Specs</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <p className="font-medium">{v.brand} {v.model}</p>
                        {v.year && <p className="text-xs text-muted-foreground">{v.year}</p>}
                        {v.is_default && <Badge variant="secondary" className="text-xs mt-1">Default</Badge>}
                      </TableCell>
                      <TableCell className="font-mono uppercase">{v.license_plate}</TableCell>
                      <TableCell>{v.tire_size || "—"}</TableCell>
                      <TableCell>
                        <p className="text-xs">{v.transmission || "—"} / {v.fuel_type || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(v)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section C: Recent Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Bookings</CardTitle>
          <Button size="sm" onClick={() => setShowBooking(true)} className="gap-2">
            <CalendarCheck className="h-4 w-4" /> Create Booking
          </Button>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No bookings yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.service_name}</TableCell>
                      <TableCell>{b.booking_date}</TableCell>
                      <TableCell>{b.booking_time}</TableCell>
                      <TableCell>{b.car_type || "—"}</TableCell>
                      <TableCell className="capitalize">{b.branch || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("capitalize", statusColor(b.status))}>
                          {b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditCustomerDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        customer={profile}
        onSaved={fetchData}
      />

      {customerId && (
        <AddVehicleDialog
          open={showAddVehicle}
          onOpenChange={setShowAddVehicle}
          customerId={customerId}
          onSaved={fetchData}
        />
      )}

      {customerId && (
        <QuickBookingDialog
          open={showBooking}
          onOpenChange={setShowBooking}
          customerId={customerId}
          customerName={profile.full_name || "Customer"}
          customerEmail={email}
          customerPhone={profile.phone || ""}
          onAddVehicle={() => {
            setShowBooking(false);
            setShowAddVehicle(true);
          }}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.brand} {deleteTarget?.model} ({deleteTarget?.license_plate}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteVehicle} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerDetail;
