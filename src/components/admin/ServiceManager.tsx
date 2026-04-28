import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  GripVertical,
  Upload,
  X as XIcon,
} from "lucide-react";

const CATEGORIES = ["maintenance", "tires", "electrical", "ac", "body"];
const ICONS = [
  "Wrench", "Droplets", "ShieldCheck", "RotateCcw", "Car",
  "Zap", "Wind", "ThermometerSun", "Sparkles", "Settings",
];

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration: number;
  rating: number;
  reviews: number;
  badge: string | null;
  icon: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  booking_service_id: string | null;
  image_url: string | null;
}

const emptyService = {
  name: "",
  description: "",
  category: "maintenance",
  price: 0,
  duration: 60,
  rating: 5.0,
  reviews: 0,
  badge: "",
  icon: "Wrench",
  is_popular: false,
  is_active: true,
  sort_order: 0,
  booking_service_id: "",
  image_url: "",
};

const ServiceManager = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyService);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchServices = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setServices((data as Service[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const openCreate = () => {
    setEditingService(null);
    setForm({ ...emptyService, sort_order: services.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditingService(s);
    setForm({
      name: s.name,
      description: s.description || "",
      category: s.category,
      price: s.price,
      duration: s.duration,
      rating: s.rating,
      reviews: s.reviews,
      badge: s.badge || "",
      icon: s.icon,
      is_popular: s.is_popular,
      is_active: s.is_active,
      sort_order: s.sort_order,
      booking_service_id: s.booking_service_id || "",
      image_url: s.image_url || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      badge: form.badge || null,
      booking_service_id: form.booking_service_id || null,
      description: form.description || null,
      image_url: form.image_url || null,
    };

    if (editingService) {
      const { error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", editingService.id);
      if (error) {
        toast({ variant: "destructive", title: "Update failed", description: error.message });
        return;
      }
      toast({ title: "Service updated" });
    } else {
      const { error } = await supabase.from("services").insert(payload);
      if (error) {
        toast({ variant: "destructive", title: "Create failed", description: error.message });
        return;
      }
      toast({ title: "Service created" });
    }
    setDialogOpen(false);
    fetchServices();
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File terlalu besar", description: "Maksimal 5MB" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("service-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      toast({ variant: "destructive", title: "Upload gagal", description: upErr.message });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("service-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast({ title: "Gambar diunggah" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    } else {
      toast({ title: "Service deleted" });
      fetchServices();
    }
  };

  const toggleActive = async (s: Service) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    if (!error) {
      setServices((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x))
      );
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);

  return (
    <Card>
      <CardHeader className="space-y-3">
        {/* Page header — title row */}
        <div className="min-w-0">
          <CardTitle className="text-base md:text-2xl break-normal">
            Katalog Layanan
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Tambah, edit, atau hapus layanan yang tampil di katalog
          </CardDescription>
        </div>
        {/* Action row — buttons only, separate from title */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchServices}
            disabled={isLoading}
            className="h-9 w-9 p-0 shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openCreate} className="flex-1 md:flex-initial">
            <Plus className="h-4 w-4 mr-1" /> Tambah Layanan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* ── DESKTOP: existing table ── */}
        <div className="rounded-md border overflow-x-auto hidden md:block admin-table-wrapper">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No services yet
                  </TableCell>
                </TableRow>
              ) : (
                services.map((s) => (
                  <TableRow key={s.id} className={!s.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{s.category}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{formatPrice(s.price)}</TableCell>
                    <TableCell>{s.duration} min</TableCell>
                    <TableCell>{s.badge || "—"}</TableCell>
                    <TableCell>
                      <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── MOBILE: card list ── */}
        <div className="block md:hidden">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Belum ada layanan
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {services.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-lg border bg-card p-3 ${!s.is_active ? "opacity-60" : ""}`}
                  style={{ writingMode: "horizontal-tb" }}
                >
                  {/* Top row: name + active toggle */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={() => toggleActive(s)}
                      className="shrink-0"
                    />
                  </div>

                  {/* Meta row: category + badge */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
                      {s.category}
                    </Badge>
                    {s.badge && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {s.badge}
                      </Badge>
                    )}
                  </div>

                  {/* Info row: price + duration */}
                  <div className="flex items-center justify-between gap-2 text-xs mb-2">
                    <span className="font-mono font-medium text-[#E53935]">
                      {formatPrice(s.price)}
                    </span>
                    <span className="text-muted-foreground">{s.duration} min</span>
                  </div>

                  {/* Actions row */}
                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(s)}
                      className="flex-1 h-8 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(s.id)}
                      className="flex-1 h-8 text-xs text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Icon</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICONS.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price (IDR) *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Duration (minutes) *</Label>
                <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Rating</Label>
                <Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Reviews count</Label>
                <Input type="number" value={form.reviews} onChange={(e) => setForm({ ...form, reviews: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Badge text</Label>
                <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="e.g. Best Seller" />
              </div>
              <div className="grid gap-2">
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Booking Service ID</Label>
              <Input value={form.booking_service_id} onChange={(e) => setForm({ ...form, booking_service_id: e.target.value })} placeholder="e.g. oil-change" />
            </div>
            <div className="grid gap-2">
              <Label>Background Image (tampil di katalog)</Label>
              {form.image_url ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={form.image_url} alt="Service background" className="w-full h-32 object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image_url: "" })}
                    className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    aria-label="Hapus gambar"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/60 transition-colors bg-muted/30">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {uploading ? "Mengunggah..." : "Klik untuk upload gambar (max 5MB)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </label>
              )}
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="atau tempel URL gambar"
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_popular} onCheckedChange={(v) => setForm({ ...form, is_popular: v })} />
                <Label>Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <Button onClick={handleSave} disabled={!form.name} className="mt-2">
              {editingService ? "Save Changes" : "Create Service"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ServiceManager;
