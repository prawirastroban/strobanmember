import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, FileText, RefreshCw, Pencil, Trash2 } from "lucide-react";

const CATEGORIES = [
  { value: "feature",      label: "✨ Fitur Baru" },
  { value: "fix",          label: "🔧 Perbaikan" },
  { value: "optimization", label: "⚡ Optimasi" },
  { value: "bugfix",       label: "🐞 Bug Fix" },
  { value: "security",     label: "🔒 Security" },
  { value: "reporting",    label: "📊 Reporting" },
  { value: "pwa",          label: "📱 PWA" },
  { value: "notification", label: "🔔 Notification" },
];

const PRIORITIES = ["low", "normal", "high", "critical"] as const;

interface Release {
  id: string;
  version: string;
  released_at: string;
  status: string;
  category: string[];
  title: string | null;
  summary: string | null;
  purpose: string | null;
  reason: string | null;
  impact: string | null;
  affected_modules: string[];
  priority: string;
  force_update: boolean;
}

const emptyDraft = {
  version: "",
  title: "",
  summary: "",
  purpose: "",
  reason: "",
  impact: "",
  affected_modules: "",
  priority: "normal",
  categories: [] as string[],
  status: "published",
};

const ReleaseNotesManager = () => {
  const [items, setItems] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Release | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ ...emptyDraft });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_releases")
      .select("*")
      .order("released_at", { ascending: false })
      .limit(50);
    if (error) toast.error("Gagal memuat: " + error.message);
    else setItems((data as Release[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft });
    setOpen(true);
  };

  const openEdit = (r: Release) => {
    setEditing(r);
    setDraft({
      version: r.version,
      title: r.title ?? "",
      summary: r.summary ?? "",
      purpose: r.purpose ?? "",
      reason: r.reason ?? "",
      impact: r.impact ?? "",
      affected_modules: (r.affected_modules ?? []).join(", "),
      priority: r.priority,
      categories: r.category ?? [],
      status: r.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.version.trim()) {
      toast.error("Versi wajib diisi");
      return;
    }
    const payload = {
      version: draft.version.trim(),
      title: draft.title || null,
      summary: draft.summary || null,
      purpose: draft.purpose || null,
      reason: draft.reason || null,
      impact: draft.impact || null,
      affected_modules: draft.affected_modules
        .split(",").map(s => s.trim()).filter(Boolean),
      priority: draft.priority,
      category: draft.categories,
      status: draft.status,
    };
    const { error } = editing
      ? await supabase.from("app_releases").update(payload).eq("id", editing.id)
      : await supabase.from("app_releases").insert(payload);
    if (error) toast.error("Gagal menyimpan: " + error.message);
    else {
      toast.success(editing ? "Release diperbarui" : "Release dibuat");
      setOpen(false);
      await load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus catatan rilis ini?")) return;
    const { error } = await supabase.from("app_releases").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Dihapus"); await load(); }
  };

  const toggleCategory = (val: string) => {
    setDraft(d => ({
      ...d,
      categories: d.categories.includes(val)
        ? d.categories.filter(c => c !== val)
        : [...d.categories, val],
    }));
  };

  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            Release Notes
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreate} className="bg-gradient-to-r from-red-500 to-yellow-400 text-white">
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Release" : "Tambah Release"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Versi</Label>
                      <Input value={draft.version} onChange={e => setDraft({ ...draft, version: e.target.value })} placeholder="2.4.0" className="font-mono" />
                    </div>
                    <div>
                      <Label>Prioritas</Label>
                      <Select value={draft.priority} onValueChange={v => setDraft({ ...draft, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Judul</Label>
                    <Input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Ringkasan</Label>
                    <Textarea value={draft.summary} onChange={e => setDraft({ ...draft, summary: e.target.value })} rows={2} />
                  </div>
                  <div>
                    <Label>Tujuan Perubahan</Label>
                    <Textarea value={draft.purpose} onChange={e => setDraft({ ...draft, purpose: e.target.value })} rows={2} />
                  </div>
                  <div>
                    <Label>Alasan Perubahan</Label>
                    <Textarea value={draft.reason} onChange={e => setDraft({ ...draft, reason: e.target.value })} rows={2} />
                  </div>
                  <div>
                    <Label>Dampak kepada User</Label>
                    <Textarea value={draft.impact} onChange={e => setDraft({ ...draft, impact: e.target.value })} rows={2} />
                  </div>
                  <div>
                    <Label>Modul Terpengaruh (pisah koma)</Label>
                    <Input value={draft.affected_modules} onChange={e => setDraft({ ...draft, affected_modules: e.target.value })} placeholder="Booking, Loyalty, Dashboard" />
                  </div>
                  <div>
                    <Label>Kategori</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {CATEGORIES.map(c => (
                        <button
                          type="button"
                          key={c.value}
                          onClick={() => toggleCategory(c.value)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition ${
                            draft.categories.includes(c.value)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 border-white/10 text-muted-foreground"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={draft.status} onValueChange={v => setDraft({ ...draft, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="rolled_back">Rolled Back</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                  <Button onClick={save} className="bg-gradient-to-r from-red-500 to-yellow-400 text-white">
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Memuat...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Belum ada catatan rilis.</p>
          ) : items.map(r => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">v{r.version}</span>
                    <Badge variant={r.status === "published" ? "default" : "secondary"} className="text-[10px]">
                      {r.status}
                    </Badge>
                    {r.force_update && <Badge variant="destructive" className="text-[10px]">Force</Badge>}
                    {r.priority !== "normal" && <Badge variant="outline" className="text-[10px]">{r.priority}</Badge>}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(r.released_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                  {r.title && <div className="text-sm font-medium mt-1">{r.title}</div>}
                  {r.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.summary}</p>}
                  {r.category?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {r.category.map(c => {
                        const meta = CATEGORIES.find(x => x.value === c);
                        return <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{meta?.label ?? c}</span>;
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReleaseNotesManager;