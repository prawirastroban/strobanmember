import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

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
}

const emptyForm = {
  brand: "",
  type: "",
  size: "",
  category: "Passenger",
  description: "",
  oem_compatibility: "",
  image_url: "",
  logo_url: "",
};

const TireManager = () => {
  const [tires, setTires] = useState<Tire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const fetchTires = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("tires")
      .select("*")
      .order("brand");
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setTires((data as Tire[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchTires(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (t: Tire) => {
    setEditingId(t.id);
    setForm({
      brand: t.brand,
      type: t.type,
      size: t.size,
      category: t.category || "Passenger",
      description: t.description || "",
      oem_compatibility: (t.oem_compatibility || []).join(", "),
      image_url: t.image_url || "",
      logo_url: t.logo_url || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const oemArray = form.oem_compatibility
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      brand: form.brand,
      type: form.type,
      size: form.size,
      category: form.category,
      description: form.description || null,
      oem_compatibility: oemArray,
      image_url: form.image_url || null,
      logo_url: form.logo_url || null,
    };

    if (editingId) {
      const { error } = await supabase.from("tires").update(payload).eq("id", editingId);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
        return;
      }
      toast({ title: "Tire updated" });
    } else {
      const { error } = await supabase.from("tires").insert(payload);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
        return;
      }
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
    const { error } = await supabase
      .from("tires")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (!error) {
      setTires((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, is_active: !x.is_active } : x))
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tire Catalog</CardTitle>
            <CardDescription>Manage your tire inventory</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchTires} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
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
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : tires.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No tires yet
                  </TableCell>
                </TableRow>
              ) : (
                tires.map((tire) => (
                  <TableRow key={tire.id}>
                    <TableCell className="font-medium">{tire.brand}</TableCell>
                    <TableCell>{tire.type}</TableCell>
                    <TableCell><Badge variant="outline">{tire.size}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {(tire.oem_compatibility || []).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Switch checked={tire.is_active} onCheckedChange={() => toggleActive(tire)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(tire)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete tire?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {tire.brand} {tire.type} from the catalog.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(tire.id)}>
                                Delete
                              </AlertDialogAction>
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

        {/* Add / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Tire" : "Add Tire"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Brand</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Bridgestone" />
              </div>
              <div>
                <Label>Type</Label>
                <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g. Ecopia EP150" />
              </div>
              <div>
                <Label>Size</Label>
                <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 185/65R15" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Advantages of this tire..." rows={3} />
              </div>
              <div>
                <Label>OEM Compatibility (comma-separated)</Label>
                <Input value={form.oem_compatibility} onChange={(e) => setForm({ ...form, oem_compatibility: e.target.value })} placeholder="e.g. Toyota Avanza, Honda Jazz, Suzuki Ertiga" />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
              </div>
              <Button className="w-full" onClick={handleSave} disabled={!form.brand || !form.type || !form.size}>
                {editingId ? "Update" : "Add"} Tire
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TireManager;
