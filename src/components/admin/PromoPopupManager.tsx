import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Image as ImageIcon, Plus, Pencil, Trash2, Eye, Upload, Loader2, BarChart3 } from "lucide-react";
import PromoPopupDialog from "@/components/PromoPopupDialog";
import type { PromoPopup, PopupAudience, PopupFrequency } from "@/hooks/usePromoPopups";

type EventCounts = Record<string, { impression: number; cta_click: number; cta_secondary_click: number; dismiss: number }>;

const FREQ_LABEL: Record<PopupFrequency, string> = {
  every_visit: "Setiap kunjungan",
  once_per_session: "Sekali per sesi",
  daily: "Sekali per hari",
  weekly: "Sekali per minggu",
  once_ever: "Sekali saja",
};
const AUD_LABEL: Record<PopupAudience, string> = {
  all: "Semua",
  guest: "Tamu (belum login)",
  authenticated: "User login",
};

const emptyDraft = {
  title: "",
  description: "",
  image_url: "",
  cta_label: "",
  cta_url: "",
  cta_secondary_label: "",
  cta_secondary_url: "",
  audience: "all" as PopupAudience,
  frequency: "daily" as PopupFrequency,
  starts_at: "",
  ends_at: "",
  show_countdown: false,
  priority: 0,
  is_active: true,
  display_pages: "/",
};

type Draft = typeof emptyDraft;

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}
function fromLocalInput(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

const PromoPopupManager = () => {
  const { toast } = useToast();
  const [list, setList] = useState<PromoPopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventCounts>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromoPopup | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState<PromoPopup | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PromoPopup | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_popups")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Gagal memuat", description: error.message, variant: "destructive" });
    } else {
      setList((data ?? []) as PromoPopup[]);
    }
    // Aggregate events
    const { data: ev } = await supabase
      .from("promo_popup_events")
      .select("popup_id, event_type");
    if (ev) {
      const counts: EventCounts = {};
      for (const row of ev as Array<{ popup_id: string; event_type: string }>) {
        if (!counts[row.popup_id]) {
          counts[row.popup_id] = { impression: 0, cta_click: 0, cta_secondary_click: 0, dismiss: 0 };
        }
        const k = row.event_type as keyof EventCounts[string];
        if (k in counts[row.popup_id]) counts[row.popup_id][k] += 1;
      }
      setEvents(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };
  const openEdit = (p: PromoPopup) => {
    setEditing(p);
    setDraft({
      title: p.title,
      description: p.description ?? "",
      image_url: p.image_url ?? "",
      cta_label: p.cta_label ?? "",
      cta_url: p.cta_url ?? "",
      cta_secondary_label: p.cta_secondary_label ?? "",
      cta_secondary_url: p.cta_secondary_url ?? "",
      audience: p.audience,
      frequency: p.frequency,
      starts_at: toLocalInput(p.starts_at),
      ends_at: toLocalInput(p.ends_at),
      show_countdown: p.show_countdown,
      priority: p.priority,
      is_active: p.is_active,
      display_pages: (p.display_pages ?? ["/"]).join(","),
    });
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("popup-images").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("popup-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      setDraft((d) => ({ ...d, image_url: signed.signedUrl }));
      toast({ title: "Gambar diunggah" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal upload";
      toast({ title: "Upload gagal", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast({ title: "Judul wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      image_url: draft.image_url.trim() || null,
      cta_label: draft.cta_label.trim() || null,
      cta_url: draft.cta_url.trim() || null,
      cta_secondary_label: draft.cta_secondary_label.trim() || null,
      cta_secondary_url: draft.cta_secondary_url.trim() || null,
      audience: draft.audience,
      frequency: draft.frequency,
      starts_at: fromLocalInput(draft.starts_at),
      ends_at: fromLocalInput(draft.ends_at),
      show_countdown: draft.show_countdown,
      priority: Number(draft.priority) || 0,
      is_active: draft.is_active,
      display_pages: draft.display_pages
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const op = editing
      ? supabase.from("promo_popups").update(payload).eq("id", editing.id)
      : supabase.from("promo_popups").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Pop-up diperbarui" : "Pop-up dibuat" });
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (p: PromoPopup, val: boolean) => {
    const { error } = await supabase.from("promo_popups").update({ is_active: val }).eq("id", p.id);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      setList((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: val } : x)));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("promo_popups").delete().eq("id", confirmDelete.id);
    if (error) {
      toast({ title: "Gagal hapus", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pop-up dihapus" });
      setConfirmDelete(null);
      load();
    }
  };

  const previewPopup: PromoPopup | null = useMemo(() => {
    if (!dialogOpen) return null;
    return {
      id: editing?.id ?? "preview",
      title: draft.title || "Judul pop-up",
      description: draft.description || null,
      image_url: draft.image_url || null,
      cta_label: draft.cta_label || null,
      cta_url: draft.cta_url || null,
      cta_secondary_label: draft.cta_secondary_label || null,
      cta_secondary_url: draft.cta_secondary_url || null,
      audience: draft.audience,
      frequency: draft.frequency,
      starts_at: fromLocalInput(draft.starts_at),
      ends_at: fromLocalInput(draft.ends_at),
      show_countdown: draft.show_countdown,
      priority: draft.priority,
      is_active: draft.is_active,
      display_pages: draft.display_pages.split(",").map((s) => s.trim()).filter(Boolean),
      created_at: editing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [dialogOpen, draft, editing]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" /> Pop-up Promo
            </CardTitle>
            <CardDescription>
              Atur pop-up yang muncul saat pengunjung membuka website. Bisa atur target audiens, frekuensi tampil, jadwal, countdown, dan tracking klik.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Pop-up Baru
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Belum ada pop-up. Klik "Pop-up Baru" untuk membuat kampanye pertama.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Audiens</TableHead>
                    <TableHead>Frekuensi</TableHead>
                    <TableHead>Jadwal</TableHead>
                    <TableHead className="text-right">Impresi</TableHead>
                    <TableHead className="text-right">Klik</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead>Aktif</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((p) => {
                    const e = events[p.id] ?? { impression: 0, cta_click: 0, cta_secondary_click: 0, dismiss: 0 };
                    const clicks = e.cta_click + e.cta_secondary_click;
                    const ctr = e.impression > 0 ? ((clicks / e.impression) * 100).toFixed(1) + "%" : "—";
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {p.image_url && (
                              <img src={p.image_url} alt="" className="h-9 w-9 rounded object-cover" />
                            )}
                            <div>
                              <div className="font-medium">{p.title}</div>
                              <div className="text-xs text-muted-foreground">Prio {p.priority}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{AUD_LABEL[p.audience]}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{FREQ_LABEL[p.frequency]}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.starts_at ? new Date(p.starts_at).toLocaleString("id-ID") : "—"}<br />
                          s/d {p.ends_at ? new Date(p.ends_at).toLocaleString("id-ID") : "∞"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{e.impression}</TableCell>
                        <TableCell className="text-right tabular-nums">{clicks}</TableCell>
                        <TableCell className="text-right tabular-nums">{ctr}</TableCell>
                        <TableCell>
                          <Switch checked={p.is_active} onCheckedChange={(v) => toggleActive(p, v)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setPreviewing(p)} title="Preview">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(p)} title="Hapus">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pop-up" : "Pop-up Baru"}</DialogTitle>
            <DialogDescription>Semua field opsional kecuali Judul.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label>Judul *</Label>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div>
                <Label>Gambar (rekomendasi 1000×600)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="URL gambar (opsional)"
                    value={draft.image_url}
                    onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(f);
                      }}
                    />
                    <span className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload
                    </span>
                  </label>
                </div>
                {draft.image_url && (
                  <img src={draft.image_url} alt="" className="mt-2 max-h-32 rounded object-cover" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Label tombol utama</Label>
                  <Input value={draft.cta_label} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} />
                </div>
                <div>
                  <Label>Link tombol utama</Label>
                  <Input placeholder="/promo atau https://..." value={draft.cta_url} onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })} />
                </div>
                <div>
                  <Label>Label tombol kedua</Label>
                  <Input value={draft.cta_secondary_label} onChange={(e) => setDraft({ ...draft, cta_secondary_label: e.target.value })} />
                </div>
                <div>
                  <Label>Link tombol kedua</Label>
                  <Input value={draft.cta_secondary_url} onChange={(e) => setDraft({ ...draft, cta_secondary_url: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Audiens</Label>
                  <Select value={draft.audience} onValueChange={(v) => setDraft({ ...draft, audience: v as PopupAudience })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(AUD_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Frekuensi</Label>
                  <Select value={draft.frequency} onValueChange={(v) => setDraft({ ...draft, frequency: v as PopupFrequency })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(FREQ_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mulai</Label>
                  <Input type="datetime-local" value={draft.starts_at} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} />
                </div>
                <div>
                  <Label>Berakhir</Label>
                  <Input type="datetime-local" value={draft.ends_at} onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="block">Tampilkan countdown</Label>
                  <p className="text-xs text-muted-foreground">Butuh tanggal "Berakhir"</p>
                </div>
                <Switch checked={draft.show_countdown} onCheckedChange={(v) => setDraft({ ...draft, show_countdown: v })} />
              </div>
              <div>
                <Label>Prioritas (angka lebih besar tampil duluan)</Label>
                <Input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Halaman tampil (pisahkan koma)</Label>
                <Input
                  placeholder="/"
                  value={draft.display_pages}
                  onChange={(e) => setDraft({ ...draft, display_pages: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">Default <code>/</code> (homepage). Kosongkan untuk semua halaman.</p>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>Aktif</Label>
                <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {previewPopup && (
              <Button variant="outline" onClick={() => setPreviewing(previewPopup)}>
                <Eye className="h-4 w-4 mr-1" /> Preview
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      {previewing && (
        <PromoPopupDialog
          popup={previewing}
          open={!!previewing}
          onClose={() => setPreviewing(null)}
          onCtaClick={() => { /* noop in preview */ }}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pop-up?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.title}" akan dihapus permanen beserta riwayat eventnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" /> Ringkasan Analytics
          </CardTitle>
          <CardDescription>Total event semua kampanye</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["impression", "cta_click", "cta_secondary_click", "dismiss"] as const).map((k) => {
              const total = Object.values(events).reduce((acc, e) => acc + e[k], 0);
              const labels: Record<typeof k, string> = {
                impression: "Impresi",
                cta_click: "Klik CTA Utama",
                cta_secondary_click: "Klik CTA Kedua",
                dismiss: "Ditutup",
              };
              return (
                <div key={k} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{labels[k]}</div>
                  <div className="text-2xl font-bold tabular-nums">{total}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromoPopupManager;