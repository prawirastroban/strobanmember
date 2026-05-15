import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DEFAULT = {
  title: "Cara mendapatkan poin:",
  items: ["100 poin per kunjungan servis", "50 poin untuk referensi", "25 poin untuk ulasan"],
};

export const LoyaltyHowToEarnEditor = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState(DEFAULT.title);
  const [items, setItems] = useState<string[]>(DEFAULT.items);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "loyalty_how_to_earn")
        .maybeSingle();
      const v = (data?.value as { title?: string; items?: string[] } | null) || null;
      if (v) {
        setTitle(v.title || DEFAULT.title);
        setItems(Array.isArray(v.items) && v.items.length ? v.items : DEFAULT.items);
      }
      setLoading(false);
    })();
  }, []);

  const updateItem = (i: number, v: string) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? v : it)));
  const addItem = () => setItems((arr) => [...arr, ""]);
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const cleanItems = items.map((s) => s.trim()).filter(Boolean);
    if (!title.trim() || cleanItems.length === 0) {
      toast.error("Judul dan minimal 1 poin wajib diisi");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "loyalty_how_to_earn", value: { title: title.trim(), items: cleanItems }, updated_by: user?.id ?? null },
        { onConflict: "key" }
      );
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
    } else {
      setItems(cleanItems);
      toast.success("Klausul cara mendapatkan poin tersimpan");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Klausul "Cara Mendapatkan Poin"
        </CardTitle>
        <CardDescription>
          Tampil di halaman <span className="font-mono">/loyalty</span> pelanggan. Edit judul dan daftar poin di bawah.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Judul</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cara mendapatkan poin:" />
            </div>
            <div className="space-y-2">
              <Label>Daftar Poin</Label>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={it}
                      onChange={(e) => updateItem(i, e.target.value)}
                      placeholder={`Poin ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeItem(i)}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-4 w-4" /> Tambah Poin
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltyHowToEarnEditor;
