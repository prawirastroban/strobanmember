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
import { CurrencyInput } from "@/components/ui/currency-input";
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
  Settings2,
  Check,
  PlayCircle,
  Image as ImageIcon,
} from "lucide-react";
import ServiceIcon from "./ServiceIcon";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  media_urls: { url: string; type: "image" | "video" }[] | null;
  show_on_home: boolean;
  home_sort_order: number;
  home_color: string | null;
}

interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

interface IconRow {
  id: string;
  key: string;
  kind: "lucide" | "emoji" | "image";
  value: string;
  label: string | null;
  sort_order: number;
  is_active: boolean;
}

/** Build the value stored in services.icon from an IconRow */
const iconRowToServiceValue = (row: IconRow) => {
  if (row.kind === "emoji") return `emoji:${row.value}`;
  if (row.kind === "image") return `image:${row.value}`;
  return row.value; // lucide → bare name, backward compatible
};

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
  media_urls: [] as { url: string; type: "image" | "video" }[],
  show_on_home: false,
  home_sort_order: 0,
  home_color: "",
};

const ServiceManager = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [icons, setIcons] = useState<IconRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyService);
  const [uploading, setUploading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const { toast } = useToast();

  // Inline dialogs for editing dropdown options
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [iconManagerOpen, setIconManagerOpen] = useState(false);

  const fetchServices = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setServices((data as unknown as Service[]) || []);
    }
    setIsLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await (supabase as any)
      .from("service_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    setCategories((data as CategoryRow[]) || []);
  };

  const fetchIcons = async () => {
    const { data } = await (supabase as any)
      .from("service_icons")
      .select("*")
      .order("sort_order", { ascending: true });
    setIcons((data as IconRow[]) || []);
  };

  useEffect(() => {
    fetchServices();
    fetchCategories();
    fetchIcons();
  }, []);

  const openCreate = () => {
    setEditingService(null);
    const firstCat = categories[0]?.slug || "maintenance";
    setForm({ ...emptyService, category: firstCat, sort_order: services.length + 1 });
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
      media_urls: Array.isArray(s.media_urls) ? s.media_urls : [],
      show_on_home: !!s.show_on_home,
      home_sort_order: s.home_sort_order ?? 0,
      home_color: s.home_color || "",
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
      media_urls: form.media_urls || [],
      home_color: form.home_color?.trim() || null,
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

  const handleMediaUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    setUploadingMedia(true);
    const uploaded: { url: string; type: "image" | "video" }[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File terlalu besar",
          description: `${file.name} melebihi 25MB`,
        });
        continue;
      }
      const isVideo = file.type.startsWith("video/");
      const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      const path = `media/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("service-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        toast({
          variant: "destructive",
          title: "Upload gagal",
          description: upErr.message,
        });
        continue;
      }
      const { data } = supabase.storage.from("service-images").getPublicUrl(path);
      uploaded.push({ url: data.publicUrl, type: isVideo ? "video" : "image" });
    }
    setForm((f) => ({ ...f, media_urls: [...(f.media_urls || []), ...uploaded] }));
    setUploadingMedia(false);
    if (uploaded.length > 0) toast({ title: `${uploaded.length} media diunggah` });
  };

  const removeMedia = (idx: number) => {
    setForm((f) => ({
      ...f,
      media_urls: (f.media_urls || []).filter((_, i) => i !== idx),
    }));
  };

  const moveMedia = (idx: number, dir: -1 | 1) => {
    setForm((f) => {
      const arr = [...(f.media_urls || [])];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...f, media_urls: arr };
    });
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

  // ── Drag-to-reorder ────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const persistReorder = async (next: Service[], prev: Service[]) => {
    // Only update rows whose sort_order actually changed
    const updates = next
      .map((s, i) => ({ id: s.id, sort_order: i + 1 }))
      .filter(({ id, sort_order }) => {
        const before = prev.find((p) => p.id === id);
        return !before || before.sort_order !== sort_order;
      });
    if (updates.length === 0) return;
    const results = await Promise.all(
      updates.map((u) =>
        supabase.from("services").update({ sort_order: u.sort_order }).eq("id", u.id)
      )
    );
    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) {
      setServices(prev); // rollback
      toast({
        variant: "destructive",
        title: "Gagal menyimpan urutan",
        description: firstErr.message,
      });
    } else {
      toast({ title: "Urutan diperbarui" });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = services.findIndex((s) => s.id === active.id);
    const newIndex = services.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const prev = services;
    const next = arrayMove(services, oldIndex, newIndex).map((s, i) => ({
      ...s,
      sort_order: i + 1,
    }));
    setServices(next);
    persistReorder(next, prev);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);

  const activeCategories = categories.filter((c) => c.is_active);
  const activeIcons = icons.filter((i) => i.is_active);

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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
            <SortableContext
              items={services.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
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
                  <SortableServiceRow
                    key={s.id}
                    service={s}
                    formatPrice={formatPrice}
                    onEdit={() => openEdit(s)}
                    onDelete={() => handleDelete(s.id)}
                    onToggleActive={() => toggleActive(s)}
                  />
                ))
              )}
            </TableBody>
            </SortableContext>
            </DndContext>
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={services.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {services.map((s) => (
                    <SortableServiceCard
                      key={s.id}
                      service={s}
                      formatPrice={formatPrice}
                      onEdit={() => openEdit(s)}
                      onDelete={() => handleDelete(s.id)}
                      onToggleActive={() => toggleActive(s)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
                <div className="flex items-center justify-between">
                  <Label>Category *</Label>
                  <button
                    type="button"
                    onClick={() => setCatManagerOpen(true)}
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Settings2 className="h-3 w-3" /> Kelola
                  </button>
                </div>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeCategories.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Belum ada kategori</div>
                    ) : (
                      activeCategories.map((c) => (
                        <SelectItem key={c.slug} value={c.slug} className="capitalize">{c.label}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Icon</Label>
                  <button
                    type="button"
                    onClick={() => setIconManagerOpen(true)}
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Settings2 className="h-3 w-3" /> Kelola
                  </button>
                </div>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger>
                    <SelectValue>
                      <span className="inline-flex items-center gap-2">
                        <ServiceIcon icon={form.icon} className="h-4 w-4" size={16} />
                        <span className="truncate">{form.icon || "—"}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeIcons.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Belum ada ikon</div>
                    ) : (
                      activeIcons.map((i) => {
                        const stored = iconRowToServiceValue(i);
                        return (
                          <SelectItem key={i.id} value={stored}>
                            <span className="inline-flex items-center gap-2">
                              <ServiceIcon icon={stored} className="h-4 w-4" size={16} />
                              <span>{i.label || i.key}</span>
                            </span>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price (IDR) *</Label>
                <CurrencyInput value={form.price} onValueChange={(v) => setForm({ ...form, price: v ?? 0 })} />
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
            {/* Pin to Homepage settings */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Tampilkan di Homepage</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Pin layanan ini agar muncul sebagai tile di homepage (override kategori).
                  </p>
                </div>
                <Switch
                  checked={form.show_on_home}
                  onCheckedChange={(v) => setForm({ ...form, show_on_home: v })}
                />
              </div>
              {form.show_on_home && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Urutan Homepage</Label>
                    <Input
                      type="number"
                      value={form.home_sort_order}
                      onChange={(e) => setForm({ ...form, home_sort_order: Number(e.target.value) })}
                      placeholder="1, 2, 3, ..."
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Warna Tile (hex)</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.home_color || "#E53935"}
                        onChange={(e) => setForm({ ...form, home_color: e.target.value })}
                        className="h-9 w-10 rounded border border-border bg-transparent cursor-pointer"
                        aria-label="Pilih warna tile"
                      />
                      <Input
                        value={form.home_color}
                        onChange={(e) => setForm({ ...form, home_color: e.target.value })}
                        placeholder="#E53935 (kosong = default)"
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
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
            {/* Slideshow media (foto + video) */}
            <div className="grid gap-2">
              <Label>Slideshow Media (foto & video) — tampil di katalog</Label>
              <p className="text-[11px] text-muted-foreground -mt-1">
                Urutan media menentukan urutan slide. Format: JPG, PNG, MP4, WebM (max 25MB).
              </p>
              {form.media_urls && form.media_urls.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {form.media_urls.map((m, i) => (
                    <div
                      key={`${m.url}-${i}`}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                    >
                      {m.type === "video" ? (
                        <div className="relative w-full h-full">
                          <video
                            src={m.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                            <PlayCircle className="h-6 w-6 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute top-0.5 left-0.5 bg-background/85 rounded-md px-1 text-[9px] font-semibold uppercase">
                        {i + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/85 border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        aria-label="Hapus media"
                      >
                        <XIcon className="h-2.5 w-2.5" />
                      </button>
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => moveMedia(i, -1)}
                          disabled={i === 0}
                          className="h-5 w-5 rounded bg-background/85 border border-border text-[10px] disabled:opacity-30"
                          aria-label="Naikkan urutan"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMedia(i, 1)}
                          disabled={i === (form.media_urls?.length ?? 0) - 1}
                          className="h-5 w-5 rounded bg-background/85 border border-border text-[10px] disabled:opacity-30"
                          aria-label="Turunkan urutan"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex flex-col items-center justify-center gap-2 h-24 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/60 transition-colors bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  <PlayCircle className="h-4 w-4" />
                </div>
                <span className="text-xs text-muted-foreground text-center px-3">
                  {uploadingMedia
                    ? "Mengunggah..."
                    : "Klik untuk upload foto/video (bisa pilih beberapa)"}
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  disabled={uploadingMedia}
                  onChange={(e) => {
                    if (e.target.files) handleMediaUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
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

      <CategoryManagerDialog
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
        categories={categories}
        refresh={fetchCategories}
      />
      <IconManagerDialog
        open={iconManagerOpen}
        onOpenChange={setIconManagerOpen}
        icons={icons}
        refresh={fetchIcons}
      />
    </Card>
  );
};

export default ServiceManager;

/* ─────────────────────────────────────────
 * Sortable rows (desktop + mobile)
 * ───────────────────────────────────────── */
interface SortableRowProps {
  service: Service;
  formatPrice: (n: number) => string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

function SortableServiceRow({
  service: s,
  formatPrice,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: s.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "hsl(var(--muted))" : undefined,
  };
  return (
    <TableRow ref={setNodeRef} style={style} className={!s.is_active ? "opacity-50" : ""}>
      <TableCell>
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none p-1 -m-1 text-muted-foreground hover:text-foreground"
          aria-label="Geser untuk mengubah urutan"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
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
        <Switch checked={s.is_active} onCheckedChange={onToggleActive} />
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SortableServiceCard({
  service: s,
  formatPrice,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: s.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    writingMode: "horizontal-tb",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card p-3 ${!s.is_active ? "opacity-60" : ""} ${
        isDragging ? "shadow-lg ring-1 ring-primary/30" : ""
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none p-1 -m-1 text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
          aria-label="Tahan & geser untuk mengubah urutan"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
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
          onCheckedChange={onToggleActive}
          className="shrink-0"
        />
      </div>

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

      <div className="flex items-center justify-between gap-2 text-xs mb-2">
        <span className="font-mono font-medium text-[#E53935]">
          {formatPrice(s.price)}
        </span>
        <span className="text-muted-foreground">{s.duration} min</span>
      </div>

      <div className="flex gap-2 pt-2 border-t border-border/50">
        <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 h-8 text-xs">
          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="flex-1 h-8 text-xs text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
 * Category manager (inline editor)
 * ───────────────────────────────────────── */
function CategoryManagerDialog({
  open,
  onOpenChange,
  categories,
  refresh,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: CategoryRow[];
  refresh: () => void;
}) {
  const { toast } = useToast();
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    const slug = slugify(label) || `cat-${Date.now()}`;
    setBusy(true);
    const { error } = await (supabase as any).from("service_categories").insert({
      slug,
      label,
      sort_order: categories.length + 1,
    });
    setBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
      return;
    }
    setNewLabel("");
    refresh();
  };

  const handleRename = async (id: string) => {
    const label = (editing[id] || "").trim();
    if (!label) return;
    const { error } = await (supabase as any)
      .from("service_categories")
      .update({ label })
      .eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
      return;
    }
    setEditing((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kategori ini? Layanan yang sudah pakai kategori tetap tersimpan datanya.")) return;
    const { error } = await (supabase as any).from("service_categories").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
      return;
    }
    refresh();
  };

  const toggleActive = async (c: CategoryRow) => {
    await (supabase as any)
      .from("service_categories")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kelola Kategori</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Kategori baru, mis. Detailing"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={!newLabel.trim() || busy} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada kategori</p>
            )}
            {categories.map((c) => {
              const isEditing = editing[c.id] !== undefined;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-2 rounded-md border p-2 ${!c.is_active ? "opacity-60" : ""}`}
                >
                  {isEditing ? (
                    <Input
                      value={editing[c.id]}
                      onChange={(e) => setEditing((p) => ({ ...p, [c.id]: e.target.value }))}
                      className="h-8 text-sm"
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{c.slug}</p>
                    </div>
                  )}
                  <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                  {isEditing ? (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(c.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditing((p) => ({ ...p, [c.id]: c.label }))}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────
 * Icon manager (Lucide / emoji / image)
 * ───────────────────────────────────────── */
function IconManagerDialog({
  open,
  onOpenChange,
  icons,
  refresh,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  icons: IconRow[];
  refresh: () => void;
}) {
  const { toast } = useToast();
  const [kind, setKind] = useState<"lucide" | "emoji" | "image">("lucide");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Maksimal 2MB" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("service-icons")
      .upload(path, file, { upsert: false });
    if (upErr) {
      toast({ variant: "destructive", title: "Upload gagal", description: upErr.message });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("service-icons").getPublicUrl(path);
    setValue(data.publicUrl);
    setUploading(false);
  };

  const handleAdd = async () => {
    const v = value.trim();
    if (!v) return;
    const baseKey =
      kind === "lucide" ? v : (label.trim() || `${kind}-${Date.now()}`);
    const key = baseKey.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) || `icon-${Date.now()}`;
    const { error } = await (supabase as any).from("service_icons").insert({
      key,
      kind,
      value: v,
      label: label.trim() || (kind === "lucide" ? v : null),
      sort_order: icons.length + 1,
    });
    if (error) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
      return;
    }
    setValue("");
    setLabel("");
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus ikon ini?")) return;
    const { error } = await (supabase as any).from("service_icons").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
      return;
    }
    refresh();
  };

  const toggleActive = async (i: IconRow) => {
    await (supabase as any)
      .from("service_icons")
      .update({ is_active: !i.is_active })
      .eq("id", i.id);
    refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kelola Ikon</DialogTitle>
        </DialogHeader>

        {/* Add new icon */}
        <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
          <Label className="text-xs">Tambah ikon baru</Label>
          <div className="grid grid-cols-3 gap-1">
            {(["lucide", "emoji", "image"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setValue("");
                }}
                className={`text-xs py-1.5 rounded-md border capitalize transition ${
                  kind === k ? "bg-primary text-primary-foreground border-primary" : "bg-background"
                }`}
              >
                {k === "lucide" ? "Lucide" : k === "emoji" ? "Emoji" : "Gambar"}
              </button>
            ))}
          </div>

          {kind === "lucide" && (
            <Input
              placeholder="Nama ikon Lucide, mis. Wrench"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
          {kind === "emoji" && (
            <Input
              placeholder="Tempel emoji, mis. 🔧"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
          {kind === "image" && (
            <div className="space-y-1.5">
              {value ? (
                <div className="relative inline-block">
                  <img src={value} alt="" className="h-14 w-14 object-contain rounded border bg-white p-1" />
                  <button
                    type="button"
                    onClick={() => setValue("")}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border flex items-center justify-center"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-14 rounded border-2 border-dashed cursor-pointer text-xs text-muted-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Mengunggah…" : "Upload gambar (max 2MB)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                    }}
                  />
                </label>
              )}
              <Input
                placeholder="atau tempel URL gambar"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="text-xs"
              />
            </div>
          )}

          <Input
            placeholder="Label tampilan (opsional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />

          <div className="flex items-center gap-2 pt-1">
            {value && (
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                Pratinjau:
                <ServiceIcon
                  icon={
                    kind === "lucide"
                      ? value
                      : kind === "emoji"
                      ? `emoji:${value}`
                      : `image:${value}`
                  }
                  className="h-4 w-4"
                  size={18}
                />
              </div>
            )}
            <Button size="sm" className="ml-auto" onClick={handleAdd} disabled={!value.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-1.5 mt-2">
          {icons.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Belum ada ikon</p>
          )}
          {icons.map((i) => {
            const stored = iconRowToServiceValue(i);
            return (
              <div
                key={i.id}
                className={`flex items-center gap-2 rounded-md border p-2 ${!i.is_active ? "opacity-60" : ""}`}
              >
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <ServiceIcon icon={stored} className="h-4 w-4" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{i.label || i.key}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {i.kind} · {i.value.length > 30 ? i.value.slice(0, 30) + "…" : i.value}
                  </p>
                </div>
                <Switch checked={i.is_active} onCheckedChange={() => toggleActive(i)} />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleDelete(i.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
