import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, RefreshCw, Download, Upload, ImageIcon, X } from "lucide-react";

interface Tire {
  id: string;
  brand: string;
  type: string;
  size: string;
  category: string;
  description: string | null;
  oem_compatibility: string[];
  image_url: string | null;
  logo_url: string | null;
  is_active: boolean;
  click_count: number;
}

const emptyForm = {
  brand: "", type: "", size: "", description: "", oem_compatibility: "", image_url: "", logo_url: "",
};

const BUCKET = "tire-images";

const uploadImage = async (file: File, folder: string): Promise<string | null> => {
  const ext = file.name.split(".").pop();
  const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
};

const InventoryDashboard = () => {
  const [tires, setTires] = useState<Tire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchTires = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("tires").select("*").order("brand");
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setTires((data as Tire[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchTires(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (t: Tire) => {
    setEditingId(t.id);
    setForm({
      brand: t.brand, type: t.type, size: t.size,
      description: t.description || "",
      oem_compatibility: (t.oem_compatibility || []).join(", "),
      image_url: t.image_url || "",
      logo_url: t.logo_url || "",
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "image_url" | "logo_url") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setter = field === "image_url" ? setUploadingImage : setUploadingLogo;
    setter(true);
    try {
      const folder = field === "image_url" ? "products" : "logos";
      const url = await uploadImage(file, folder);
      if (url) setForm((prev) => ({ ...prev, [field]: url }));
      toast({ title: "Gambar berhasil diunggah" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload gagal", description: err.message });
    }
    setter(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    const oemArray = form.oem_compatibility.split(",").map((s) => s.trim()).filter(Boolean);
    const payload = {
      brand: form.brand, type: form.type, size: form.size,
      description: form.description || null,
      oem_compatibility: oemArray,
      image_url: form.image_url || null,
      logo_url: form.logo_url || null,
    };
    if (editingId) {
      const { error } = await supabase.from("tires").update(payload).eq("id", editingId);
      if (error) { toast({ variant: "destructive", title: "Error", description: error.message }); return; }
      toast({ title: "Tire updated" });
    } else {
      const { error } = await supabase.from("tires").insert(payload);
      if (error) { toast({ variant: "destructive", title: "Error", description: error.message }); return; }
      toast({ title: "Tire added" });
    }
    setDialogOpen(false);
    fetchTires();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tires").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Tire deleted" });
      setTires((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const toggleActive = async (t: Tire) => {
    const { error } = await supabase.from("tires").update({ is_active: !t.is_active }).eq("id", t.id);
    if (!error) {
      setTires((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: !x.is_active } : x)));
    }
  };

  const downloadTemplate = () => {
    const headers = [["id", "brand", "type", "size", "category", "description", "oem_compatibility", "image_url", "logo_url", "click_count"]];
    const example = [["", "Bridgestone", "Ecopia EP150", "185/65R15", "Passenger", "Fuel efficient tire", "Toyota Avanza, Honda Jazz", "", "", "0"]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);
    ws["!cols"] = [{ wch: 38 }, { wch: 15 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 30 }, { wch: 35 }, { wch: 40 }, { wch: 40 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tires");
    XLSX.writeFile(wb, "tire_template.xlsx");
  };

  const downloadAllData = () => {
    if (tires.length === 0) {
      toast({ variant: "destructive", title: "No data", description: "Tidak ada data untuk di-export." });
      return;
    }
    const rows = tires.map((t) => ({
      id: t.id,
      brand: t.brand,
      type: t.type,
      size: t.size,
      category: t.category || "Passenger",
      description: t.description || "",
      oem_compatibility: (t.oem_compatibility || []).join(", "),
      image_url: t.image_url || "",
      logo_url: t.logo_url || "",
      click_count: t.click_count ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 38 }, { wch: 15 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 30 }, { wch: 35 }, { wch: 40 }, { wch: 40 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tires");
    XLSX.writeFile(wb, `tire_inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Export berhasil", description: `${rows.length} data ban berhasil di-download.` });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const failedRows: string[] = [];

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

      if (rows.length === 0) {
        toast({ variant: "destructive", title: "File kosong", description: "Tidak ada data yang bisa di-import." });
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Fetch existing tires for secondary matching
      const { data: existingTires } = await supabase.from("tires").select("id, brand, type, size");
      const existingById = new Map<string, boolean>();
      const existingByKey = new Map<string, string>();
      (existingTires || []).forEach((t: { id: string; brand: string; type: string; size: string }) => {
        existingById.set(t.id, true);
        const key = `${t.brand.trim().toLowerCase()}|${t.type.trim().toLowerCase()}|${t.size.trim().toLowerCase()}`;
        existingByKey.set(key, t.id);
      });

      const BATCH_SIZE = 50;
      const toInsert: Record<string, unknown>[] = [];
      const toUpdate: { id: string; payload: Record<string, unknown> }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const brand = (row.brand || "").trim();
        const type = (row.type || "").trim();
        const size = (row.size || "").trim();

        if (!brand || !type || !size) {
          failed++;
          failedRows.push(`Baris ${i + 2}: brand/type/size kosong`);
          continue;
        }

        const oemArray = row.oem_compatibility
          ? String(row.oem_compatibility).split(",").map((s) => s.trim()).filter(Boolean)
          : [];

        const payload: Record<string, unknown> = {
          brand,
          type,
          size,
          category: (row.category || "Passenger").trim(),
          description: row.description ? String(row.description).trim() : null,
          oem_compatibility: oemArray,
          image_url: row.image_url ? String(row.image_url).trim() : null,
          logo_url: row.logo_url ? String(row.logo_url).trim() : null,
        };

        const rowId = (row.id || "").trim();
        const secondaryKey = `${brand.toLowerCase()}|${type.toLowerCase()}|${size.toLowerCase()}`;

        if (rowId && existingById.has(rowId)) {
          // Update by id
          if (row.click_count !== undefined && row.click_count !== "") {
            payload.click_count = parseInt(String(row.click_count), 10) || 0;
          }
          toUpdate.push({ id: rowId, payload });
        } else if (!rowId && existingByKey.has(secondaryKey)) {
          // Secondary match: brand+type+size
          const matchedId = existingByKey.get(secondaryKey)!;
          if (row.click_count !== undefined && row.click_count !== "") {
            payload.click_count = parseInt(String(row.click_count), 10) || 0;
          }
          toUpdate.push({ id: matchedId, payload });
        } else {
          // Insert new — always set click_count default
          payload.click_count = (row.click_count !== undefined && row.click_count !== "")
            ? parseInt(String(row.click_count), 10) || 0
            : 0;
          // Preserve original id if provided
          if (rowId) {
            payload.id = rowId;
          }
          toInsert.push(payload);
        }
      }

      // Batch updates
      for (const item of toUpdate) {
        const { error } = await supabase.from("tires").update(item.payload as never).eq("id", item.id);
        if (error) {
          failed++;
          failedRows.push(`Update ${item.id}: ${error.message}`);
        } else {
          updated++;
        }
      }

      // Batch inserts
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("tires").insert(batch as never);
        if (error) {
          failed += batch.length;
          failedRows.push(`Insert batch: ${error.message}`);
        } else {
          inserted += batch.length;
        }
      }

      const parts: string[] = [];
      if (updated > 0) parts.push(`${updated} diperbarui`);
      if (inserted > 0) parts.push(`${inserted} ditambahkan`);
      if (failed > 0) parts.push(`${failed} gagal`);

      toast({
        title: "Import selesai",
        description: parts.join(", ") + "." + (failedRows.length > 0 ? "\n" + failedRows.slice(0, 5).join("; ") : ""),
        variant: failed > 0 && inserted === 0 && updated === 0 ? "destructive" : undefined,
      });

      fetchTires();
    } catch (err: any) {
      toast({ variant: "destructive", title: "File error", description: err.message || "Could not read file" });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Tire Inventory</CardTitle>
            <CardDescription>Manage your tire catalog</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Template Excel
            </Button>
            <Button variant="outline" size="sm" onClick={downloadAllData}>
              <Download className="h-4 w-4 mr-1" /> Download All
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className={`h-4 w-4 mr-1 ${uploading ? "animate-spin" : ""}`} /> {uploading ? "Importing..." : "Upload Excel"}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
            <Button variant="outline" size="sm" onClick={fetchTires} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Tire
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>OEM</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : tires.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tires yet</TableCell></TableRow>
              ) : (
                tires.map((tire) => (
                  <TableRow key={tire.id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {tire.image_url ? (
                          <img src={tire.image_url} alt={tire.brand} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{tire.brand}</TableCell>
                    <TableCell>{tire.type}</TableCell>
                    <TableCell><Badge variant="outline">{tire.size}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {(tire.oem_compatibility || []).join(", ") || "—"}
                    </TableCell>
                    <TableCell><Switch checked={tire.is_active} onCheckedChange={() => toggleActive(tire)} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(tire)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete tire?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently remove {tire.brand} {tire.type}.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(tire.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Edit Tire" : "Add Tire"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Bridgestone" /></div>
              <div><Label>Type</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g. Ecopia EP150" /></div>
              <div><Label>Size</Label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 185/65R15" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Advantages of this tire..." rows={3} /></div>
              <div><Label>OEM Compatibility (comma-separated)</Label><Input value={form.oem_compatibility} onChange={(e) => setForm({ ...form, oem_compatibility: e.target.value })} placeholder="e.g. Toyota Avanza, Honda Jazz" /></div>

              {/* Product Image */}
              <div className="space-y-2">
                <Label>Gambar Produk</Label>
                {form.image_url && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={form.image_url} alt="Product" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: "" })}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}>
                    <Upload className={`h-4 w-4 mr-1 ${uploadingImage ? "animate-spin" : ""}`} />
                    {uploadingImage ? "Uploading..." : "Upload Gambar"}
                  </Button>
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="Atau paste URL gambar..."
                    className="flex-1 text-xs"
                  />
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "image_url")} />
              </div>

              {/* Brand Logo */}
              <div className="space-y-2">
                <Label>Logo Brand</Label>
                {form.logo_url && (
                  <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center p-2">
                    <img src={form.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logo_url: "" })}
                      className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                    <Upload className={`h-4 w-4 mr-1 ${uploadingLogo ? "animate-spin" : ""}`} />
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </Button>
                  <Input
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="Atau paste URL logo..."
                    className="flex-1 text-xs"
                  />
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "logo_url")} />
              </div>

              <Button className="w-full" onClick={handleSave} disabled={!form.brand || !form.type || !form.size}>{editingId ? "Update" : "Add"} Tire</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default InventoryDashboard;
