import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Car, Star, ChevronRight, Loader2 } from "lucide-react";

interface Vehicle {
  id: string;
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

const DEFAULT_CAR_IMG = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=250&fit=crop";

const MyVehicles = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [tireSize, setTireSize] = useState("");

  const fetchVehicles = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setVehicles(data as Vehicle[]);
    if (error) console.error(error);
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, [user]);

  const resetForm = () => {
    setBrand(""); setModel(""); setYear(""); setLicensePlate("");
    setTransmission(""); setFuelType(""); setTireSize("");
  };

  const handleAdd = async () => {
    if (!user || !brand.trim() || !model.trim() || !licensePlate.trim()) {
      toast({ title: "Brand, Model, dan Plat Nomor wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vehicles").insert({
      user_id: user.id,
      brand: brand.trim(),
      model: model.trim(),
      year: year ? parseInt(year) : null,
      license_plate: licensePlate.trim().toUpperCase(),
      transmission: transmission || null,
      fuel_type: fuelType || null,
      tire_size: tireSize.trim() || null,
      is_default: vehicles.length === 0,
    });
    if (error) {
      toast({ title: "Gagal menambah kendaraan", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Kendaraan berhasil ditambahkan!" });
      resetForm();
      setShowAdd(false);
      fetchVehicles();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Kendaraan Saya</h1>
            <p className="text-muted-foreground text-sm mt-1">Kelola daftar kendaraan Anda</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah
          </Button>
        </div>

        {/* Vehicle List */}
        {vehicles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Car className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Belum ada kendaraan</h3>
              <p className="text-muted-foreground text-sm mb-4">Tambahkan kendaraan pertama Anda untuk mulai</p>
              <Button onClick={() => setShowAdd(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Tambah Kendaraan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {vehicles.map((v, i) => (
              <Card
                key={v.id}
                className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => navigate(`/my-vehicles/${v.id}`)}
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={v.image_url || DEFAULT_CAR_IMG}
                    alt={`${v.brand} ${v.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {v.is_default && (
                    <Badge className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm gap-1">
                      <Star className="h-3 w-3 fill-current" /> Utama
                    </Badge>
                  )}
                  <div className="absolute bottom-3 left-3 text-white">
                    <h3 className="font-bold text-lg leading-tight">{v.brand} {v.model}</h3>
                    {v.year && <p className="text-white/80 text-sm">{v.year}</p>}
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-0 font-mono">
                      {v.license_plate}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {v.transmission && <span>{v.transmission}</span>}
                    {v.fuel_type && <span>• {v.fuel_type}</span>}
                    {v.tire_size && <span>• {v.tire_size}</span>}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Vehicle Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Kendaraan Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Brand *</Label>
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Toyota" />
                </div>
                <div className="space-y-1.5">
                  <Label>Model *</Label>
                  <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Avanza" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tahun</Label>
                  <Input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} placeholder="2023" maxLength={4} />
                </div>
                <div className="space-y-1.5">
                  <Label>Plat Nomor *</Label>
                  <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value.toUpperCase())} placeholder="B 1234 ABC" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Transmisi</Label>
                  <Select value={transmission} onValueChange={setTransmission}>
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
                  <Select value={fuelType} onValueChange={setFuelType}>
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
              <div className="space-y-1.5">
                <Label>Ukuran Ban</Label>
                <Input value={tireSize} onChange={(e) => setTireSize(e.target.value)} placeholder="195/65 R15" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setShowAdd(false); }}>Batal</Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MyVehicles;
