import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, Car, CalendarCheck, User, Mail, Phone } from "lucide-react";

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

const emptyVehicleForm = {
  brand: "", model: "", year: "", license_plate: "",
  tire_size: "", transmission: "", fuel_type: "",
};

const CustomerDetail = () => {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("—");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Vehicle form
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const fetchData = async () => {
    if (!customerId) return;
    setIsLoading(true);

    const [profileRes, vehiclesRes, bookingsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", customerId).single(),
      supabase.from("vehicles").select("*").eq("user_id", customerId),
      supabase.from("bookings").select("customer_email").eq("user_id", customerId).limit(1),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (bookingsRes.data?.[0]) setEmail(bookingsRes.data[0].customer_email);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const openAddVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm(emptyVehicleForm);
    setShowVehicleDialog(true);
  };

  const openEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    setVehicleForm({
      brand: v.brand, model: v.model, year: v.year?.toString() || "",
      license_plate: v.license_plate, tire_size: v.tire_size || "",
      transmission: v.transmission || "", fuel_type: v.fuel_type || "",
    });
    setShowVehicleDialog(true);
  };

  const saveVehicle = async () => {
    if (!customerId || !vehicleForm.brand || !vehicleForm.model || !vehicleForm.license_plate) {
      toast({ variant: "destructive", title: "Please fill required fields" });
      return;
    }
    setSaving(true);

    const payload = {
      brand: vehicleForm.brand,
      model: vehicleForm.model,
      year: vehicleForm.year ? parseInt(vehicleForm.year) : null,
      license_plate: vehicleForm.license_plate,
      tire_size: vehicleForm.tire_size || null,
      transmission: vehicleForm.transmission || null,
      fuel_type: vehicleForm.fuel_type || null,
      user_id: customerId,
    };

    let error;
    if (editingVehicle) {
      ({ error } = await supabase.from("vehicles").update(payload).eq("id", editingVehicle.id));
    } else {
      ({ error } = await supabase.from("vehicles").insert(payload));
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: editingVehicle ? "Vehicle updated" : "Vehicle added" });
      setShowVehicleDialog(false);
      fetchData();
    }
    setSaving(false);
  };

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
        <Button variant="link" onClick={() => navigate("/admin/customers")}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate("/admin/customers")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Button>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {profile.full_name || "Unnamed Customer"}
          </CardTitle>
          {profile.customer_id && (
            <CardDescription className="font-mono">{profile.customer_id}</CardDescription>
          )}
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

      {/* Vehicles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vehicles</CardTitle>
          <Button size="sm" onClick={openAddVehicle}>
            <Plus className="h-4 w-4 mr-1" /> Add Vehicle
          </Button>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No vehicles registered.</p>
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
                          <Button size="icon" variant="ghost" onClick={() => openEditVehicle(v)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
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

      {/* Create Booking */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={() => navigate(`/booking?customer_id=${customerId}`)}
            className="gap-2"
          >
            <CalendarCheck className="h-4 w-4" /> Create Booking for Customer
          </Button>
        </CardContent>
      </Card>

      {/* Vehicle Dialog */}
      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {[
              { key: "brand", label: "Brand", required: true },
              { key: "model", label: "Model", required: true },
              { key: "year", label: "Year", required: false },
              { key: "license_plate", label: "License Plate", required: true },
              { key: "tire_size", label: "Tire Size", required: false },
              { key: "transmission", label: "Transmission", required: false },
              { key: "fuel_type", label: "Fuel Type", required: false },
            ].map((field) => (
              <div key={field.key} className="grid gap-2">
                <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                <Input
                  value={vehicleForm[field.key as keyof typeof vehicleForm]}
                  onChange={(e) => setVehicleForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.label}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowVehicleDialog(false)}>Cancel</Button>
            <Button onClick={saveVehicle} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingVehicle ? "Update" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
