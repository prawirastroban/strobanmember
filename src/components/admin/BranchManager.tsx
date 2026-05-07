import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Phone, MessageCircle, ImagePlus, Loader2 } from "lucide-react";
import { invalidateBranchesCache } from "@/hooks/useBranches";

interface Branch {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  hours: string;
  image_url: string | null;
  directions_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const empty: Omit<Branch, "id"> = {
  slug: "",
  name: "",
  address: "",
  phone: "",
  whatsapp: "628973700800",
  hours: "08:00 – 17:00 WIB",
  image_url: null,
  directions_url: null,
  sort_order: 0,
  is_active: true,
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function BranchManager() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<Omit<Branch, "id">>(empty);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("branches")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error("Gagal memuat cabang");
    setRows((data as Branch[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startNew = () => {
    setEditing(null);
    setForm({ ...empty, sort_order: rows.length + 1 });
    setOpen(true);
  };
  const startEdit = (b: Branch) => {
    setEditing(b);
    const { id, ...rest } = b;
    setForm(rest);
    setOpen(true);
  };

  const onUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `branches/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("service-images").upload(path, file, {
        cacheControl: "3600", upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("service-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast.success("Gambar diunggah");
    } catch (e: any) {
      toast.error(e.message || "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nama cabang wajib diisi"); return; }
    const slug = form.slug.trim() || slugify(form.name);
    const payload = { ...form, slug };
    setSaving(true);
    if (editing) {
      const { error } = await (supabase as any).from("branches").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Cabang diperbarui");
    } else {
      const { error } = await (supabase as any).from("branches").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Cabang ditambahkan");
    }
    setSaving(false);
    setOpen(false);
    invalidateBranchesCache();
    load();
  };

  const remove = async (b: Branch) => {
    if (!confirm(`Hapus cabang "${b.name}"?`)) return;
    const { error } = await (supabase as any).from("branches").delete().eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cabang dihapus");
    invalidateBranchesCache();
    load();
  };

  const toggleActive = async (b: Branch) => {
    const { error } = await (supabase as any)
      .from("branches").update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    invalidateBranchesCache();
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Pengaturan Cabang</CardTitle>
          <p className="text-xs text-muted-foreground">
            Konten ini muncul di halaman publik <span className="font-mono">/cabang</span>
          </p>
        </div>
        <Button size="sm" onClick={startNew}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Cabang
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Belum ada cabang</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((b) => (
              <div key={b.id} className="rounded-lg border bg-card overflow-hidden">
                <div className="aspect-[16/9] bg-muted overflow-hidden">
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImagePlus className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {b.name}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">{b.address}</p>
                    </div>
                    <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{b.phone || "—"}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{b.whatsapp || "—"}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(b)}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => remove(b)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Cabang" : "Tambah Cabang"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Cabang *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
                placeholder="Stroban Bandung"
              />
            </div>
            <div>
              <Label>Slug (untuk URL/booking)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                placeholder="bandung"
              />
            </div>
            <div>
              <Label>Alamat</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telepon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>WhatsApp (628…)</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Jam Operasional</Label>
              <Input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            </div>
            <div>
              <Label>Link Petunjuk Arah (Google Maps)</Label>
              <Input
                value={form.directions_url || ""}
                onChange={(e) => setForm({ ...form, directions_url: e.target.value })}
                placeholder="https://www.google.com/maps/dir/?api=1&destination=..."
              />
            </div>
            <div>
              <Label>Gambar Cabang</Label>
              {form.image_url && (
                <img src={form.image_url} alt="" className="mt-2 rounded-lg max-h-40 object-cover w-full" />
              )}
              <Input
                type="file" accept="image/*" className="mt-2"
                onChange={(e) => e.target.files?.[0] && onUploadImage(e.target.files[0])}
                disabled={uploading}
              />
              {uploading && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Mengunggah…
              </p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Urutan</Label>
                <Input type="number" value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <span className="text-sm">Aktif (tampil publik)</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving || uploading}>
              {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
