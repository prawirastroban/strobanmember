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
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, Car, User, Mail, Phone, CalendarCheck, CreditCard, Wallet, FileText, History, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import EditCustomerDialog from "./EditCustomerDialog";
import AddVehicleDialog from "./AddVehicleDialog";
import QuickBookingDialog from "./QuickBookingDialog";
import AdminCashbackAdjustDialog from "./AdminCashbackAdjustDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useCashbackBalance, type CashbackLedgerRow } from "@/hooks/useCashbackBalance";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

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
  service_price: number;
}

interface PaymentRecord {
  id: string;
  booking_id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

const CustomerDetail = () => {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isStaff } = useUserRole();
  const { balance: cashbackBalance, history: cashbackHistory, refresh: refreshCashback } =
    useCashbackBalance(customerId);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("—");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [showCashbackDialog, setShowCashbackDialog] = useState(false);

  const fetchData = async () => {
    if (!customerId) return;
    setIsLoading(true);

    const [profileRes, vehiclesRes, bookingsRes, paymentsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", customerId).single(),
      supabase.from("vehicles").select("*").eq("user_id", customerId),
      supabase.from("bookings").select("id, service_name, service_price, booking_date, booking_time, status, branch, car_type, customer_email").eq("user_id", customerId).order("booking_date", { ascending: false }).limit(10),
      supabase.from("payments").select("*").eq("user_id", customerId).order("created_at", { ascending: false }).limit(10),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (bookingsRes.data) {
      setBookings(bookingsRes.data as Booking[]);
      if (bookingsRes.data[0]) setEmail(bookingsRes.data[0].customer_email);
    }
    if (paymentsRes.data) setPayments(paymentsRes.data as PaymentRecord[]);

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
      case "pending": return "bg-primary/10 text-primary border-primary/20";
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

      {/* Quick cross-module links */}
      {customerId && (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to={`/dashboard/history?tab=bookings&customer=${customerId}`}>
              <CalendarCheck className="h-3.5 w-3.5" /> Semua Booking
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to={`/dashboard/history?tab=payments&customer=${customerId}`}>
              <CreditCard className="h-3.5 w-3.5" /> Riwayat Bayar
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to={`/dashboard/history?tab=loyalty&customer=${customerId}`}>
              <History className="h-3.5 w-3.5" /> Loyalty
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to={`/dashboard/history?tab=referral&customer=${customerId}`}>
              <History className="h-3.5 w-3.5" /> Referral
            </Link>
          </Button>
        </div>
      )}

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
                    <TableRow
                      key={b.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => navigate(`/invoice/${b.id}`)}
                      title="Buka invoice"
                    >
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

      {/* Section D: Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No payments yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => p.booking_id && navigate(`/invoice/${p.booking_id}`)}
                      title="Buka invoice"
                    >
                      <TableCell className="text-sm">{format(new Date(p.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell className="font-medium">Rp {Number(p.amount).toLocaleString("id-ID")}</TableCell>
                      <TableCell className="capitalize">{p.payment_method}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          p.payment_status === "success" ? "bg-emerald-500/20 text-emerald-400" :
                          p.payment_status === "pending" ? "bg-primary/20 text-primary" :
                          "bg-red-500/20 text-red-400"
                        }>
                          {p.payment_status}
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

      {/* Section E: Cashback Wallet */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> Saldo Cashback
            </CardTitle>
            <CardDescription>
              Saldo saat ini:{" "}
              <span className="font-semibold text-foreground">
                Rp {Number(cashbackBalance).toLocaleString("id-ID")}
              </span>
            </CardDescription>
          </div>
          {isStaff && (
            <Button size="sm" onClick={() => setShowCashbackDialog(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Sesuaikan Saldo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {cashbackHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">Belum ada riwayat.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Berlaku s/d</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashbackHistory.map((r: CashbackLedgerRow) => {
                    const isOut = r.type === "debit" || r.type === "expire";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          {format(new Date(r.created_at), "dd MMM yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">{r.type}</Badge>
                        </TableCell>
                        <TableCell className={cn(
                          "font-medium",
                          isOut ? "text-destructive" : "text-emerald-500",
                        )}>
                          {isOut ? "-" : "+"} Rp {Number(r.amount).toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{r.description || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.expires_at ? format(new Date(r.expires_at), "dd MMM yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      {customerId && (
        <AdminCashbackAdjustDialog
          open={showCashbackDialog}
          onOpenChange={setShowCashbackDialog}
          customerId={customerId}
          customerName={profile.full_name || undefined}
          currentBalance={cashbackBalance}
          onSaved={refreshCashback}
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
