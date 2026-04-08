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
import { Plus, Pencil, Trash2, RefreshCw, Download, Upload } from "lucide-react";

interface Tire {
  id: string;
  brand: string;
  type: string;
  size: string;
  description: string | null;
  oem_compatibility: string[];
  image_url: string | null;
  is_active: boolean;
}

const emptyForm = {
  brand: "", type: "", size: "", description: "", oem_compatibility: "", image_url: "",
};

const InventoryDashboard = () => {
  const [tires, setTires] = useState<Tire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const oemArray = form.oem_compatibility.split(",").map((s) => s.trim()).filter(Boolean);
    const payload = {
      brand: form.brand, type: form.type, size: form.size,
      description: form.description || null,
      oem_compatibility: oemArray,
      image_url: form.image_url || null,
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

  // Excel: Download Template
  const downloadTemplate = () => {
    const headers = [["brand", "type", "size", "description", "oem_compatibility", "image_url"]];
    const example = [["Bridgestone", "Ecopia EP150", "185/65R15", "Fuel efficient tire", "Toyota Avanza, Honda Jazz", "https://example.com/img.jpg"]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);
    ws["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 30 }, { wch: 35 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tires");
    XLSX.writeFile(wb, "tire_template.xlsx");
  };

  // Excel: Upload & Bulk Insert
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

      const valid: typeof rows = [];
      const invalid: number[] = [];

      rows.forEach((row, i) => {
        if (row.brand && row.type && row.size) {
          valid.push(row);
        } else {
          invalid.push(i + 2); // +2 for header + 0-index
        }
      });

      if (valid.length === 0) {
        toast({ variant: "destructive", title: "No valid rows", description: "All rows are missing required fields (brand, type, size)." });
        setUploading(false);
        return;
      }

      const payload = valid.map((row) => ({
        brand: row.brand,
        type: row.type,
        size: row.size,
        description: row.description || null,
        oem_compatibility: row.oem_compatibility ? row.oem_compatibility.split(",").map((s) => s.trim()).filter(Boolean) : [],
        image_url: row.image_url || null,
      }));

      const { error } = await supabase.from("tires").insert(payload);
      if (error) {
        toast({ variant: "destructive", title: "Upload failed", description: error.message });
      } else {
        const msg = invalid.length > 0
          ? `${valid.length} tires added. ${invalid.length} rows skipped (rows: ${invalid.join(", ")}).`
          : `${valid.length} tires added successfully!`;
        toast({ title: "Upload complete", description: msg });
        fetchTires();
      }
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
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className={`h-4 w-4 mr-1 ${uploading ? "animate-spin" : ""}`} /> Upload Excel
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
                <TableRow><TableCell colSpan={6} className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : tires.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tires yet</TableCell></TableRow>
              ) : (
                tires.map((tire) => (
                  <TableRow key={tire.id}>
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
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit Tire" : "Add Tire"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Bridgestone" /></div>
              <div><Label>Type</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g. Ecopia EP150" /></div>
              <div><Label>Size</Label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 185/65R15" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Advantages of this tire..." rows={3} /></div>
              <div><Label>OEM Compatibility (comma-separated)</Label><Input value={form.oem_compatibility} onChange={(e) => setForm({ ...form, oem_compatibility: e.target.value })} placeholder="e.g. Toyota Avanza, Honda Jazz" /></div>
              <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
              <Button className="w-full" onClick={handleSave} disabled={!form.brand || !form.type || !form.size}>{editingId ? "Update" : "Add"} Tire</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default InventoryDashboard;
