import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Banknote, QrCode, FileCheck2, Plus, Trash2, Pencil, ExternalLink, CheckCircle2, XCircle, Loader2, Eye, Copy, Download, FileText } from "lucide-react";

const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url);

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch_label: string | null;
  logo_url: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
}
interface QrisRow {
  id: string;
  label: string;
  qris_image_url: string;
  merchant_name: string;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  branch: string | null;
}
interface ProofRow {
  id: string;
  booking_id: string;
  user_id: string;
  method: string;
  sender_name: string;
  sender_bank: string | null;
  transfer_amount: number;
  transfer_date: string;
  proof_url: string;
  status: string;
  reject_reason: string | null;
  created_at: string;
  notes: string | null;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

/* ========= Bank Accounts Tab ========= */
const BankAccountsTab = () => {
  const [items, setItems] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BankAccount> | null>(null);
  const [open, setOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("manual_payment_accounts").select("*").order("sort_order");
    setItems((data as BankAccount[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const startNew = () => { setEditing({ is_active: true, sort_order: items.length }); setLogoFile(null); setOpen(true); };
  const startEdit = (it: BankAccount) => { setEditing(it); setLogoFile(null); setOpen(true); };

  const save = async () => {
    if (!editing) return;
    if (!editing.bank_name || !editing.account_number || !editing.account_holder) {
      toast.error("Bank, no rek, atas nama wajib diisi");
      return;
    }
    let logo_url = editing.logo_url ?? null;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop() || "png";
      const path = `bank-logos/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-assets").upload(path, logoFile, { upsert: true, contentType: logoFile.type });
      if (upErr) { toast.error("Upload logo gagal: " + upErr.message); return; }
      logo_url = supabase.storage.from("payment-assets").getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      bank_name: editing.bank_name,
      account_number: editing.account_number,
      account_holder: editing.account_holder,
      branch_label: editing.branch_label ?? null,
      notes: editing.notes ?? null,
      logo_url,
      is_active: editing.is_active ?? true,
      sort_order: editing.sort_order ?? 0,
    };
    const { error } = editing.id
      ? await supabase.from("manual_payment_accounts").update(payload).eq("id", editing.id)
      : await supabase.from("manual_payment_accounts").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan");
    setOpen(false); setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("Hapus rekening ini?")) return;
    const { error } = await supabase.from("manual_payment_accounts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Dihapus"); load(); }
  };

  const toggleActive = async (it: BankAccount) => {
    const { error } = await supabase.from("manual_payment_accounts").update({ is_active: !it.is_active }).eq("id", it.id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="gap-2"><Plus className="h-4 w-4" /> Tambah Rekening</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit Rekening" : "Tambah Rekening"}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div><Label>Nama Bank *</Label><Input value={editing?.bank_name ?? ""} onChange={(e) => setEditing({ ...editing, bank_name: e.target.value })} /></div>
              <div><Label>No Rekening *</Label><Input value={editing?.account_number ?? ""} onChange={(e) => setEditing({ ...editing, account_number: e.target.value })} /></div>
              <div><Label>Atas Nama *</Label><Input value={editing?.account_holder ?? ""} onChange={(e) => setEditing({ ...editing, account_holder: e.target.value })} /></div>
              <div><Label>Cabang / Label</Label><Input value={editing?.branch_label ?? ""} onChange={(e) => setEditing({ ...editing, branch_label: e.target.value })} /></div>
              <div><Label>Catatan</Label><Textarea rows={2} value={editing?.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div><Label>Logo (opsional)</Label><Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} /></div>
              <div className="flex items-center justify-between">
                <Label>Aktif</Label>
                <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
              <div><Label>Urutan</Label><Input type="number" value={editing?.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Simpan</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : items.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Belum ada rekening.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {items.map((it) => (
            <Card key={it.id}>
              <CardContent className="py-3 flex items-center gap-3">
                {it.logo_url ? <img src={it.logo_url} alt="" className="h-10 w-10 object-contain rounded" /> :
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs font-bold">{it.bank_name.slice(0, 3)}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{it.bank_name} {it.branch_label && <span className="text-muted-foreground font-normal">· {it.branch_label}</span>}</p>
                  <p className="font-mono text-sm">{it.account_number} <span className="text-muted-foreground">· a.n {it.account_holder}</span></p>
                </div>
                <Switch checked={it.is_active} onCheckedChange={() => toggleActive(it)} />
                <Button size="sm" variant="ghost" onClick={() => startEdit(it)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => del(it.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

/* ========= QRIS Tab ========= */
const QrisTab = () => {
  const [items, setItems] = useState<QrisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<QrisRow> | null>(null);
  const [open, setOpen] = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [branches, setBranches] = useState<{ slug: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: br }] = await Promise.all([
      supabase.from("manual_payment_qris").select("*").order("sort_order"),
      supabase.from("branches").select("slug,name").eq("is_active", true).order("sort_order"),
    ]);
    setItems((data as QrisRow[]) || []);
    setBranches((br as { slug: string; name: string }[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing?.label || !editing?.merchant_name) { toast.error("Label & merchant wajib"); return; }
    let qris_image_url = editing.qris_image_url;
    if (imgFile) {
      const ext = imgFile.name.split(".").pop() || "png";
      const path = `qris/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-assets").upload(path, imgFile, { upsert: true, contentType: imgFile.type });
      if (upErr) { toast.error(upErr.message); return; }
      qris_image_url = supabase.storage.from("payment-assets").getPublicUrl(path).data.publicUrl;
    }
    if (!qris_image_url) { toast.error("Upload gambar QRIS"); return; }
    const payload = {
      label: editing.label, merchant_name: editing.merchant_name,
      qris_image_url, notes: editing.notes ?? null,
      is_active: editing.is_active ?? true, sort_order: editing.sort_order ?? 0,
      branch: editing.branch ?? null,
    };
    const { error } = editing.id
      ? await supabase.from("manual_payment_qris").update(payload).eq("id", editing.id)
      : await supabase.from("manual_payment_qris").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan"); setOpen(false); setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("Hapus QRIS ini?")) return;
    const { error } = await supabase.from("manual_payment_qris").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const toggleActive = async (it: QrisRow) => {
    const { error } = await supabase.from("manual_payment_qris").update({ is_active: !it.is_active }).eq("id", it.id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing({ is_active: true, sort_order: items.length }); setImgFile(null); setOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Tambah QRIS
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit QRIS" : "Tambah QRIS"}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div><Label>Label *</Label><Input value={editing?.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></div>
              <div><Label>Nama Merchant *</Label><Input value={editing?.merchant_name ?? ""} onChange={(e) => setEditing({ ...editing, merchant_name: e.target.value })} /></div>
              <div>
                <Label>Cabang</Label>
                <Select value={editing?.branch ?? "__all__"} onValueChange={(v) => setEditing({ ...editing, branch: v === "__all__" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Semua cabang" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua cabang</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Gambar QRIS {editing?.id ? "(opsional, ganti)" : "*"}</Label><Input type="file" accept="image/*" onChange={(e) => setImgFile(e.target.files?.[0] ?? null)} />
                {editing?.qris_image_url && <img src={editing.qris_image_url} alt="" className="h-24 mt-2 object-contain" />}</div>
              <div><Label>Catatan</Label><Textarea rows={2} value={editing?.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div className="flex items-center justify-between"><Label>Aktif</Label>
                <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Simpan</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : items.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Belum ada QRIS.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((it) => (
            <Card key={it.id}>
              <CardContent className="py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <img src={it.qris_image_url} alt="" className="h-20 w-20 object-contain rounded border" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{it.merchant_name}</p>
                    <p className="text-xs text-muted-foreground">{it.label}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant={it.is_active ? "default" : "secondary"}>{it.is_active ? "Aktif" : "Nonaktif"}</Badge>
                      <Badge variant="outline" className="capitalize">
                        {it.branch ? (branches.find(b => b.slug === it.branch)?.name || it.branch) : "Semua cabang"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <Switch checked={it.is_active} onCheckedChange={() => toggleActive(it)} />
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(it); setImgFile(null); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(it.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

/* ========= Proofs Review Tab ========= */
const ProofsReviewTab = () => {
  const [items, setItems] = useState<ProofRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewerProof, setViewerProof] = useState<ProofRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("manual_payment_proofs").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems((data as ProofRow[]) || []);
    setLoading(false);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setBusy(id);
    const { data, error } = await supabase.rpc("approve_manual_payment_proof", { _proof_id: id });
    setBusy(null);
    const res = data as { success: boolean; error?: string } | null;
    if (error || !res?.success) { toast.error(error?.message || res?.error || "Gagal"); return; }
    toast.success("Disetujui"); load();
  };

  const reject = async () => {
    if (!rejectFor) return;
    setBusy(rejectFor);
    const { data, error } = await supabase.rpc("reject_manual_payment_proof", { _proof_id: rejectFor, _reason: rejectReason || null });
    setBusy(null);
    const res = data as { success: boolean; error?: string } | null;
    if (error || !res?.success) { toast.error(error?.message || res?.error || "Gagal"); return; }
    toast.success("Ditolak"); setRejectFor(null); setRejectReason(""); load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)} className="capitalize">{s}</Button>
        ))}
      </div>
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : items.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Tidak ada bukti.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map((p) => (
            <Card key={p.id}>
              <CardContent className="py-3 flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => setViewerProof(p)} className="shrink-0 group">
                  {isPdfUrl(p.proof_url) ? (
                    <div className="h-24 w-24 rounded border flex flex-col items-center justify-center text-xs gap-1 bg-muted/40 group-hover:bg-muted">
                      <FileText className="h-6 w-6 text-muted-foreground" /> PDF
                    </div>
                  ) : (
                    <img src={p.proof_url} alt="proof" className="h-24 w-24 object-cover rounded border group-hover:opacity-80 transition" />
                  )}
                </button>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="capitalize">{p.method}</Badge>
                    <Badge className={
                      p.status === "pending" ? "bg-amber-500/20 text-amber-700" :
                      p.status === "approved" ? "bg-emerald-500/20 text-emerald-700" :
                      "bg-red-500/20 text-red-700"
                    }>{p.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("id-ID")}</span>
                  </div>
                  <p className="text-sm"><span className="text-muted-foreground">Pengirim:</span> <strong>{p.sender_name}</strong> {p.sender_bank && `(${p.sender_bank})`}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Nominal:</span> <strong>{formatIDR(p.transfer_amount)}</strong> · {p.transfer_date}</p>
                  <p className="text-xs text-muted-foreground">Booking: <a href={`/dashboard/bookings`} className="underline">{p.booking_id.slice(0, 8)}…</a></p>
                  {p.notes && <p className="text-xs">Catatan: {p.notes}</p>}
                  {p.status === "rejected" && p.reject_reason && <p className="text-xs text-red-600">Ditolak: {p.reject_reason}</p>}
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setViewerProof(p)} className="gap-1">
                      <Eye className="h-3.5 w-3.5" /> Lihat
                    </Button>
                    {p.status === "pending" && (
                      <>
                        <Button size="sm" disabled={busy === p.id} onClick={() => approve(p.id)} className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Setujui
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setRejectFor(p.id); setRejectReason(""); }} className="gap-1">
                          <XCircle className="h-3.5 w-3.5" /> Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alasan Penolakan</DialogTitle></DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="cth. Nominal tidak sesuai" rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Batal</Button>
            <Button variant="destructive" onClick={reject}>Tolak Bukti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewerProof} onOpenChange={(o) => !o && setViewerProof(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Bukti Pembayaran · {viewerProof?.sender_name}</DialogTitle>
          </DialogHeader>
          {viewerProof && (
            isPdfUrl(viewerProof.proof_url) ? (
              <iframe src={viewerProof.proof_url} title="Bukti PDF" className="w-full h-[75vh] rounded border" />
            ) : (
              <img src={viewerProof.proof_url} alt="Bukti" className="w-full max-h-[75vh] object-contain rounded" />
            )
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <div className="text-xs text-muted-foreground truncate flex-1">
              {viewerProof?.proof_url}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={async () => {
                if (!viewerProof) return;
                try { await navigator.clipboard.writeText(viewerProof.proof_url); toast.success("URL disalin"); }
                catch { toast.error("Gagal menyalin"); }
              }}>
                <Copy className="h-3.5 w-3.5" /> Salin URL
              </Button>
              <Button variant="outline" size="sm" className="gap-1" asChild>
                <a href={viewerProof?.proof_url} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              </Button>
              <Button variant="outline" size="sm" className="gap-1" asChild>
                <a href={viewerProof?.proof_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Tab baru
                </a>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ManualPaymentManager = () => {
  return (
    <Tabs defaultValue="proofs" className="space-y-4">
      <TabsList>
        <TabsTrigger value="proofs" className="gap-1"><FileCheck2 className="h-4 w-4" /> Bukti Transfer</TabsTrigger>
        <TabsTrigger value="banks" className="gap-1"><Banknote className="h-4 w-4" /> Rekening Bank</TabsTrigger>
        <TabsTrigger value="qris" className="gap-1"><QrCode className="h-4 w-4" /> QRIS</TabsTrigger>
      </TabsList>
      <TabsContent value="proofs"><ProofsReviewTab /></TabsContent>
      <TabsContent value="banks"><BankAccountsTab /></TabsContent>
      <TabsContent value="qris"><QrisTab /></TabsContent>
    </Tabs>
  );
};

export default ManualPaymentManager;