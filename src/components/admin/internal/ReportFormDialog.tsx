import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import type { InternalReport } from "./InternalReports";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: InternalReport | null;
  onSaved: () => void;
}

const ReportFormDialog = ({ open, onOpenChange, editing, onSaved }: Props) => {
  const { user } = useAuth();
  const { isStaff, isAdmin, isAdminCabang } = useUserRole();
  const { toast } = useToast();

  const [category, setCategory] = useState<"bug" | "revisi" | "masukan">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setCategory(editing.category);
        setTitle(editing.title);
        setDescription(editing.description || "");
        setPageUrl(editing.page_url || "");
        setImageUrl(editing.image_url);
      } else {
        setCategory("bug");
        setTitle("");
        setDescription("");
        setPageUrl(typeof window !== "undefined" ? window.location.pathname : "");
        setImageUrl(null);
      }
    }
  }, [open, editing]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("internal-reports").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast({ title: "Upload gagal", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("internal-reports").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({ title: "Judul wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    const roleLabel = isStaff ? "Owner" : isAdmin ? "CS" : isAdminCabang ? "Admin Cabang" : "Internal";
    const reporterName = (user.user_metadata?.full_name as string) || user.email || "Internal";

    if (editing) {
      const { error } = await supabase
        .from("internal_reports" as any)
        .update({
          category,
          title: title.trim(),
          description: description.trim(),
          page_url: pageUrl.trim() || null,
          image_url: imageUrl,
        })
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("internal_reports" as any).insert({
        reporter_id: user.id,
        reporter_name: reporterName,
        reporter_role: roleLabel,
        source: "internal",
        category,
        title: title.trim(),
        description: description.trim(),
        page_url: pageUrl.trim() || null,
        image_url: imageUrl,
      });
      if (error) {
        toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    toast({ title: editing ? "Report diperbarui" : "Report dikirim" });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Report" : "Tambah Report"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="revisi">Revisi</SelectItem>
                <SelectItem value="masukan">Masukan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Judul</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ringkasan singkat" />
          </div>
          <div className="space-y-1.5">
            <Label>Catatan / Deskripsi</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan masalah, langkah reproduksi, atau saran..."
              rows={4}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Halaman terkait (opsional)</Label>
            <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="/dashboard/..." />
          </div>
          <div className="space-y-1.5">
            <Label>Gambar / Screenshot (opsional)</Label>
            {imageUrl ? (
              <div className="relative inline-block">
                <img src={imageUrl} alt="" className="max-h-40 rounded-md border" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                  aria-label="Hapus"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-md cursor-pointer hover:bg-muted/40 text-sm">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>{uploading ? "Mengunggah..." : "Pilih gambar"}</span>
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
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportFormDialog;