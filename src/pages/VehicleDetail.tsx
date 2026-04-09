import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Star, Pencil, Trash2, Shield, Loader2,
  Gauge, Fuel, CircleDot, Disc3, Calendar, Car, Wrench, ShoppingBag
} from "lucide-react";

interface Vehicle {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number | null;
  license_plate: string;
  transmission: string | null;
  fuel_type: string | null;
  tire_size: string | null;
  oem_tire: string | null;
  image_url: string | null;
  is_default: boolean;
  last_service_date: string | null;
}

const DEFAULT_CAR_IMG = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=400&fit=crop";

const VehicleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editBrand, setEditBrand] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editPlate, setEditPlate] = useState("");
  const [editTransmission, setEditTransmission] = useState("");
  const [editFuel, setEditFuel] = useState("");
  const [editTireSize, setEditTireSize] = useState("");
  const [editOemTire, setEditOemTire] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

  useEffect(() => {
    const fetchVehicle = async () => {
      if (!user || !id) return;
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast({ title: "Kendaraan tidak ditemukan", variant: "destructive" });
        navigate("/my-vehicles", { replace: true });
        return;
      }
      // Owner check
      if ((data as Vehicle).user_id !== user.id) {
        toast({ title: "Akses ditolak", variant: "destructive" });
        navigate("/my-vehicles", { replace: true });
        return;
      }
      setVehicle(data as Vehicle);
      setLoading(false);
    };

    if (!authLoading) fetchVehicle();
  }, [id, user, authLoading]);

  const openEdit = () => {
    if (!vehicle) return;
    setEditBrand(vehicle.brand);
    setEditModel(vehicle.model);
    setEditYear(vehicle.year?.toString() || "");
    setEditPlate(vehicle.license_plate);
    setEditTransmission(vehicle.transmission || "");
    setEditFuel(vehicle.fuel_type || "");
    setEditTireSize(vehicle.tire_size || "");
    setEditOemTire(vehicle.oem_tire || "");
    setEditImageUrl(vehicle.image_url || "");
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!vehicle || !editBrand.trim() || !editModel.trim() || !editPlate.trim()) {
      toast({ title: "Brand, Model, dan Plat Nomor wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vehicles").update({
      brand: editBrand.trim(),
      model: editModel.trim(),
      year: editYear ? parseInt(editYear) : null,
      license_plate: editPlate.trim().toUpperCase(),
      transmission: editTransmission || null,
      fuel_type: editFuel || null,
      tire_size: editTireSize.trim() || null,
      oem_tire: editOemTire.trim() || null,
      image_url: editImageUrl.trim() || null,
    }).eq("id", vehicle.id);

    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Kendaraan berhasil diperbarui!" });
      // Refresh
      const { data } = await supabase.from("vehicles").select("*").eq("id", vehicle.id).single();
      if (data) setVehicle(data as Vehicle);
      setShowEdit(false);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!vehicle) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", vehicle.id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Kendaraan berhasil dihapus" });
      navigate("/my-vehicles", { replace: true });
    }
  };

  const handleSetDefault = async () => {
    if (!vehicle || !user) return;
    // Unset all defaults first
    await supabase.from("vehicles").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await supabase.from("vehicles").update({ is_default: true }).eq("id", vehicle.id);
    if (error) {
      toast({ title: "Gagal mengatur", description: error.message, variant: "destructive" });
    } else {
      setVehicle({ ...vehicle, is_default: true });
      toast({ title: "Dijadikan kendaraan utama!" });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!vehicle) return null;

  const infoItems = [
    { icon: Gauge, label: "Transmisi", value: vehicle.transmission },
    { icon: Fuel, label: "Bahan Bakar", value: vehicle.fuel_type },
    { icon: CircleDot, label: "Ukuran Ban", value: vehicle.tire_size },
    { icon: Disc3, label: "OEM Tire", value: vehicle.oem_tire },
    { icon: Calendar, label: "Servis Terakhir", value: vehicle.last_service_date || null },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-3xl pb-24 animate-[fadeSlideUp_0.5s_ease-out]">
        {/* Back Button */}
        <button
          onClick={() => navigate("/my-vehicles")}
          className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Kendaraan Saya
        </button>

        {/* Hero Card */}
        <div className="relative rounded-2xl overflow-hidden mb-6 shadow-xl group">
          <img
            src={vehicle.image_url || DEFAULT_CAR_IMG}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-56 sm:h-72 object-cover group-hover:scale-[1.02] transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          {/* Glass overlay info */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                  {vehicle.brand} {vehicle.model}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  {vehicle.year && (
                    <span className="text-white/80 text-sm">{vehicle.year}</span>
                  )}
                  {vehicle.is_default && (
                    <Badge className="bg-primary/80 backdrop-blur-sm gap-1 text-xs">
                      <Star className="h-3 w-3 fill-current" /> Utama
                    </Badge>
                  )}
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-white/15 backdrop-blur-md text-white border-0 font-mono text-base px-4 py-1.5 tracking-wider shadow-lg"
              >
                {vehicle.license_plate}
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <Button variant="outline" onClick={openEdit} className="gap-2 rounded-full hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all active:scale-95">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          {!vehicle.is_default && (
            <Button variant="outline" onClick={handleSetDefault} className="gap-2 rounded-full hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all active:scale-95">
              <Star className="h-4 w-4" /> Jadikan Utama
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all active:scale-95">
                <Trash2 className="h-4 w-4" /> Hapus
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Kendaraan?</AlertDialogTitle>
                <AlertDialogDescription>
                  Kendaraan "{vehicle.brand} {vehicle.model}" ({vehicle.license_plate}) akan dihapus permanen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Vehicle Information Grid */}
        <Card className="mb-6 border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" /> Informasi Kendaraan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {infoItems.map((item) => (
                <div
                  key={item.label}
                  className="group/card p-4 rounded-xl bg-muted/40 hover:bg-muted/70 border border-transparent hover:border-primary/10 transition-all duration-200 hover:-translate-y-0.5 cursor-default"
                >
                  <item.icon className="h-5 w-5 text-primary/70 mb-2 group-hover/card:scale-110 transition-transform" />
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-semibold text-sm mt-0.5 truncate">
                    {item.value || <span className="text-muted-foreground/50 font-normal">—</span>}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Service History Placeholder */}
        <Card className="mb-6 border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" /> Riwayat Servis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <Wrench className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">Belum ada riwayat servis</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Riwayat servis akan muncul di sini</p>
            </div>
          </CardContent>
        </Card>

        {/* Recommended Tires Placeholder */}
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" /> Rekomendasi Ban
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <CircleDot className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">Rekomendasi ban akan tersedia segera</p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                {vehicle.tire_size
                  ? `Berdasarkan ukuran ban: ${vehicle.tire_size}`
                  : "Tambahkan ukuran ban untuk melihat rekomendasi"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Kendaraan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Brand *</Label>
                  <Input value={editBrand} onChange={(e) => setEditBrand(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Model *</Label>
                  <Input value={editModel} onChange={(e) => setEditModel(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tahun</Label>
                  <Input value={editYear} onChange={(e) => setEditYear(e.target.value.replace(/\D/g, ""))} maxLength={4} />
                </div>
                <div className="space-y-1.5">
                  <Label>Plat Nomor *</Label>
                  <Input value={editPlate} onChange={(e) => setEditPlate(e.target.value.toUpperCase())} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Transmisi</Label>
                  <Select value={editTransmission} onValueChange={setEditTransmission}>
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manual">Manual</SelectItem>
                      <SelectItem value="Automatic">Automatic</SelectItem>
                      <SelectItem value="CVT">CVT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Bahan Bakar</Label>
                  <Select value={editFuel} onValueChange={setEditFuel}>
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bensin">Bensin</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="Electric">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ukuran Ban</Label>
                  <Input value={editTireSize} onChange={(e) => setEditTireSize(e.target.value)} placeholder="195/65 R15" />
                </div>
                <div className="space-y-1.5">
                  <Label>OEM Tire</Label>
                  <Input value={editOemTire} onChange={(e) => setEditOemTire(e.target.value)} placeholder="Bridgestone Ecopia" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>URL Gambar (opsional)</Label>
                <Input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEdit(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default VehicleDetail;
