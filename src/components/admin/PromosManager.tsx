import { useState, useEffect, useMemo } from "react";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Megaphone, Plus, Pencil, Trash2, RefreshCw, Tag, Users, Calendar,
} from "lucide-react";

interface Promo {
  id: string;
  title: string;
  description: string | null;
  badge: string | null;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_claims: number | null;
  claims_count: number;
  voucher_prefix: string;
  starts_at: string;
  ends_at: string | null;
  terms: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  applicable_categories?: string[] | null;
}

const emptyForm = {
  title: "",
  description: "",
  badge: "",
  discount_type: "percentage",
  discount_value: 0,
  min_purchase: 0,
  max_claims: "",
  voucher_prefix: "PROMO",
  starts_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  ends_at: "",
  terms: "",
  image_url: "",
  is_active: true,
  sort_order: 0,
  applicable_categories: [] as string[],
};

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const PromosManager = () => {
  const { toast } = useToast();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Gagal memuat promo", description: error.message, variant: "destructive" });
    } else {
      setPromos((data as Promo[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const active = promos.filter(
      (p) => p.is_active && new Date(p.starts_at).getTime() <= now &&
        (!p.ends_at || new Date(p.ends_at).getTime() >= now),
    ).length;
    const totalClaims = promos.reduce((s, p) => s + p.claims_count, 0);
    return { total: promos.length, active, totalClaims };
  }, [promos]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Promo) => {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description ?? "",
      badge: p.badge ?? "",
      discount_type: p.discount_type,
      discount_value: Number(p.discount_value),
      min_purchase: Number(p.min_purchase),
      max_claims: p.max_claims == null ? "" : String(p.max_claims),
      voucher_prefix: p.voucher_prefix,
      starts_at: format(new Date(p.starts_at), "yyyy-MM-dd'T'HH:mm"),
      ends_at: p.ends_at ? format(new Date(p.ends_at), "yyyy-MM-dd'T'HH:mm") : "",
      terms: p.terms ?? "",
      image_url: p.image_url ?? "",
      is_active: p.is_active,
      sort_order: p.sort_order,
      applicable_categories: p.applicable_categories ?? [],
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Judul wajib diisi", variant: "destructive" });
      return;
    }
    if (form.discount_value < 0) {
      toast({ title: "Nilai diskon tidak boleh negatif", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      badge: form.badge.trim() || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_purchase: Number(form.min_purchase),
      max_claims: form.max_claims === "" ? null : Number(form.max_claims),
      voucher_prefix: form.voucher_prefix.trim().toUpperCase() || "PROMO",
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      terms: form.terms.trim() || null,
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      applicable_categories: form.applicable_categories,
    };

    const { error } = editing
      ? await supabase.from("promos").update(payload).eq("id", editing.id)
      : await supabase.from("promos").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Promo diperbarui" : "Promo dibuat" });
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (p: Promo) => {
    const { error } = await supabase
      .from("promos")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) {
      toast({ title: "Gagal mengubah status", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: !p.is_active ? "Promo diaktifkan" : "Promo dinonaktifkan" });
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("promos").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Promo dihapus" });
    load();
  };

  const renderDiscount = (p: Promo) => {
    if (p.discount_type === "percentage") return `${p.discount_value}%`;
    if (p.discount_type === "fixed") return formatIDR(Number(p.discount_value));
    if (p.discount_type === "free_service") return "Gratis";
    return `${p.discount_value}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Promo</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Megaphone className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktif Sekarang</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <Tag className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Klaim</p>
                <p className="text-2xl font-bold">{stats.totalClaims}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Pengelola Promo</CardTitle>
            <CardDescription>
              Kelola promo & voucher yang tampil di halaman <code>/promo</code> untuk pelanggan.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Promo Baru
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Memuat...</div>
          ) : promos.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Belum ada promo. Klik "Promo Baru" untuk membuat.
            </div>
          ) : (
            <>
            {/* Desktop table */}
            <div className="overflow-x-auto admin-table-wrapper hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Diskon</TableHead>
                    <TableHead>Klaim</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Aktif</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {p.badge ? (
                            <Badge variant="secondary" className="mr-1 text-[10px]">{p.badge}</Badge>
                          ) : null}
                          {p.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{renderDiscount(p)}</Badge>
                        <div className="text-[11px] text-muted-foreground mt-1 capitalize">
                          {p.discount_type.replace("_", " ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {p.claims_count}
                          {p.max_claims != null && (
                            <span className="text-muted-foreground"> / {p.max_claims}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{p.voucher_prefix}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(p.starts_at), "d MMM yyyy")}
                        </div>
                        <div className="text-muted-foreground">
                          {p.ends_at ? `s/d ${format(new Date(p.ends_at), "d MMM yyyy")}` : "Tanpa batas"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(p.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="block md:hidden space-y-3">
              {promos.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border bg-card p-3 space-y-2 overflow-hidden"
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <p className="text-sm font-semibold leading-snug min-w-0 flex-1 break-words">
                      {p.title}
                    </p>
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={() => toggleActive(p)}
                      className="shrink-0"
                    />
                  </div>

                  {/* Badges row — wrap, never overlap title */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.badge && (
                      <Badge variant="secondary" className="text-[10px]">
                        {p.badge}
                      </Badge>
                    )}
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {renderDiscount(p)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {p.discount_type.replace("_", " ")}
                    </span>
                  </div>

                  {/* Description */}
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                      {p.description}
                    </p>
                  )}

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div>
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Klaim</p>
                      <p className="font-medium">
                        {p.claims_count}
                        {p.max_claims != null && (
                          <span className="text-muted-foreground"> / {p.max_claims}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {p.voucher_prefix}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Periode</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {format(new Date(p.starts_at), "d MMM yyyy")}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {p.ends_at
                          ? `s/d ${format(new Date(p.ends_at), "d MMM yyyy")}`
                          : "Tanpa batas"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/60">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(p)}
                      className="h-8 px-2 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(p.id)}
                      className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Promo" : "Promo Baru"}</DialogTitle>
            <DialogDescription>
              Atur penawaran yang akan tampil di halaman /promo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Judul *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Diskon Servis Berkala 30%"
              />
            </div>

            <div className="grid gap-2">
              <Label>Deskripsi</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi singkat promo..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Tipe Diskon</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => setForm({ ...form, discount_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Persentase (%)</SelectItem>
                    <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                    <SelectItem value="free_service">Layanan Gratis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Nilai Diskon</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Min. Transaksi (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.min_purchase}
                  onChange={(e) => setForm({ ...form, min_purchase: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Maks. Klaim (kosong = tak terbatas)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.max_claims}
                  onChange={(e) => setForm({ ...form, max_claims: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Mulai</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Berakhir (opsional)</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Prefix Voucher</Label>
                <Input
                  value={form.voucher_prefix}
                  onChange={(e) => setForm({ ...form, voucher_prefix: e.target.value })}
                  placeholder="PROMO"
                />
              </div>
              <div className="grid gap-2">
                <Label>Badge (opsional)</Label>
                <Input
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  placeholder="HOT, BARU, dll"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>URL Gambar (opsional)</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Syarat & Ketentuan</Label>
              <Textarea
                rows={3}
                value={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
                placeholder="• Berlaku untuk semua cabang\n• Tidak dapat digabung dengan promo lain"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="grid gap-2">
                <Label>Urutan Tampil</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-3 pb-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(c) => setForm({ ...form, is_active: c })}
                />
                <Label>Aktif</Label>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Berlaku untuk Kategori Layanan</Label>
              <p className="text-xs text-muted-foreground">
                Pilih kategori yang dapat menggunakan voucher ini di booking. Kosong = berlaku semua layanan.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {SERVICE_CATEGORIES.map((cat) => {
                  const checked = form.applicable_categories.includes(cat.value);
                  return (
                    <button
                      type="button"
                      key={cat.value}
                      onClick={() => {
                        const next = checked
                          ? form.applicable_categories.filter((c) => c !== cat.value)
                          : [...form.applicable_categories, cat.value];
                        setForm({ ...form, applicable_categories: next });
                      }}
                      className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                        checked
                          ? "bg-primary/15 border-primary text-foreground"
                          : "bg-muted/30 border-border hover:bg-muted/50"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] font-bold ${checked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                          {checked ? "✓" : ""}
                        </span>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Menyimpan..." : editing ? "Simpan" : "Buat Promo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus promo ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak bisa dibatalkan. Voucher yang sudah diklaim pelanggan tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PromosManager;
