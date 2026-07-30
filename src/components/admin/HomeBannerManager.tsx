import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BANNER_SETTINGS_KEY,
  DEFAULT_BANNER_SETTINGS,
  normalizeBannerSettings,
  type HomeBanner,
  type HomeBannerSettings,
} from "@/hooks/useHomeBanners";
import { Loader2, Upload, Trash2, Save, ArrowUp, ArrowDown, Plus, ImageIcon } from "lucide-react";

const BUCKET = "branding";
const FOLDER = "home-banners";
const ACCEPT = "image/png,image/jpeg,image/webp,image/avif,image/gif";

const HomeBannerManager = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [settings, setSettings] = useState<HomeBannerSettings>(DEFAULT_BANNER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [bannerRes, settingRes] = await Promise.all([
      supabase
        .from("home_banners")
        .select("id,image_url,title,subtitle,show_text,link_url,sort_order,is_active")
        .order("sort_order", { ascending: true }),
      supabase.from("app_settings").select("value").eq("key", BANNER_SETTINGS_KEY).maybeSingle(),
    ]);
    if (bannerRes.error) {
      toast({ title: "Gagal memuat banner", description: bannerRes.error.message, variant: "destructive" });
    }
    setBanners((bannerRes.data as HomeBanner[]) ?? []);
    setSettings(normalizeBannerSettings(settingRes.data?.value));
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format tidak didukung", description: "Pilih berkas gambar.", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Ukuran terlalu besar", description: "Maksimal 8 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${FOLDER}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const nextOrder = banners.length ? Math.max(...banners.map((b) => b.sort_order)) + 1 : 0;
      const { data, error } = await supabase
        .from("home_banners")
        .insert({ image_url: pub.publicUrl, sort_order: nextOrder, show_text: true, is_active: true })
        .select("id,image_url,title,subtitle,show_text,link_url,sort_order,is_active")
        .single();
      if (error) throw error;
      setBanners((prev) => [...prev, data as HomeBanner]);
      toast({ title: "Banner ditambahkan" });
    } catch (e) {
      toast({
        title: "Gagal mengunggah",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const patchLocal = (id: string, patch: Partial<HomeBanner>) =>
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= banners.length) return;
    const next = [...banners];
    [next[index], next[target]] = [next[target], next[index]];
    setBanners(next.map((b, i) => ({ ...b, sort_order: i })));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("home_banners").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      return;
    }
    setBanners((prev) => prev.filter((b) => b.id !== id));
    toast({ title: "Banner dihapus" });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const [i, b] of banners.entries()) {
        const { error } = await supabase
          .from("home_banners")
          .update({
            title: b.title?.trim() || null,
            subtitle: b.subtitle?.trim() || null,
            link_url: b.link_url?.trim() || null,
            show_text: b.show_text,
            is_active: b.is_active,
            sort_order: i,
          })
          .eq("id", b.id);
        if (error) throw error;
      }
      const { error: sErr } = await supabase
        .from("app_settings")
        .upsert([{ key: BANNER_SETTINGS_KEY, value: settings as unknown as Record<string, unknown> }], {
          onConflict: "key",
        });
      if (sErr) throw sErr;
      toast({ title: "Tersimpan", description: "Banner beranda berhasil diperbarui." });
      void load();
    } catch (e) {
      toast({
        title: "Gagal menyimpan",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const activeCount = banners.filter((b) => b.is_active).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Slider</CardTitle>
          <CardDescription>
            Atur perilaku banner otomatis di beranda. Banner aktif: {activeCount} — yang tampil dibatasi{" "}
            {settings.max_slides} slide.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <Label className="text-sm">Auto slide</Label>
              <p className="text-xs text-muted-foreground">Geser otomatis</p>
            </div>
            <Switch
              checked={settings.autoplay}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, autoplay: v }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interval">Durasi antar slide (detik)</Label>
            <Input
              id="interval"
              type="number"
              min={2}
              max={30}
              value={Math.round(settings.interval_ms / 1000)}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  interval_ms: Math.min(30, Math.max(2, Number(e.target.value) || 4)) * 1000,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max">Jumlah slide tampil</Label>
            <Input
              id="max"
              type="number"
              min={1}
              max={10}
              value={settings.max_slides}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  max_slides: Math.min(10, Math.max(1, Number(e.target.value) || 5)),
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle>Daftar Banner</CardTitle>
            <CardDescription>Unggah gambar (JPG, PNG, WebP, AVIF, GIF) maksimal 8 MB.</CardDescription>
          </div>
          <div className="shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-2">Tambah Banner</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
            </div>
          ) : banners.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Belum ada banner. Beranda memakai tampilan bawaan sampai banner ditambahkan.
              </p>
            </div>
          ) : (
            banners.map((b, i) => (
              <div key={b.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-44">
                    <img src={b.image_url} alt={b.title ?? "Banner"} className="h-full w-full object-cover" />
                    <Badge className="absolute left-1.5 top-1.5" variant="secondary">
                      #{i + 1}
                    </Badge>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Judul banner"
                        value={b.title ?? ""}
                        onChange={(e) => patchLocal(b.id, { title: e.target.value })}
                      />
                      <Input
                        placeholder="Subjudul"
                        value={b.subtitle ?? ""}
                        onChange={(e) => patchLocal(b.id, { subtitle: e.target.value })}
                      />
                    </div>
                    <Input
                      placeholder="Link tujuan (opsional), mis. /promo"
                      value={b.link_url ?? ""}
                      onChange={(e) => patchLocal(b.id, { link_url: e.target.value })}
                    />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={b.show_text}
                          onCheckedChange={(v) => patchLocal(b.id, { show_text: v })}
                        />
                        Tampilkan teks
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={b.is_active}
                          onCheckedChange={(v) => patchLocal(b.id, { is_active: v })}
                        />
                        Aktif
                      </label>
                      <div className="ml-auto flex items-center gap-1">
                        <Button size="icon" variant="outline" onClick={() => move(i, -1)} disabled={i === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => move(i, 1)}
                          disabled={i === banners.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => void remove(b.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void saveAll()} disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="ml-2">Simpan Perubahan</span>
        </Button>
      </div>
    </div>
  );
};

export default HomeBannerManager;