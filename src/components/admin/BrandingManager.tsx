import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useBranding, FALLBACK_LOGO } from "@/hooks/useBranding";
import { Loader2, Upload, ImageIcon, Trash2, Save, Globe } from "lucide-react";
import { Sparkles, Lightbulb } from "lucide-react";

type Slot = "logo_light_url" | "logo_dark_url" | "favicon_url";

const SEO_RECOMMENDATIONS: { label: string; value: string }[] = [
  {
    label: "Servis mobil multi-kota",
    value:
      "Sahabat Stroban — bengkel servis mobil terpercaya di Bandung, Tasikmalaya, Cirebon & Yogyakarta. Booking online, pengingat servis berkala, dan poin loyalitas setiap kunjungan.",
  },
  {
    label: "Fokus loyalty & promo",
    value:
      "Servis mobil profesional dengan teknisi berpengalaman, suku cadang asli, dan program loyalty rewards. Nikmati promo, voucher, dan diskon eksklusif khusus member Sahabat Stroban.",
  },
  {
    label: "Ban & perawatan berkala",
    value:
      "Booking servis berkala, ganti oli, tune up, dan beli ban mobil online di Sahabat Stroban. Layanan cepat, transparan, dan bergaransi di Bandung, Tasikmalaya, Cirebon, dan Yogyakarta.",
  },
];

const SLOT_META: Record<Slot, { title: string; description: string; folder: string; accept: string }> = {
  logo_light_url: {
    title: "Logo Utama (Latar Terang)",
    description: "Tampil di halaman login, dashboard, dan area dengan latar terang. PNG transparan disarankan.",
    folder: "logo-light",
    accept: "image/png,image/jpeg,image/svg+xml,image/webp",
  },
  logo_dark_url: {
    title: "Logo Putih (Latar Gelap)",
    description: "Tampil di footer dan area dengan latar gelap. Sebaiknya logo putih/terang.",
    folder: "logo-dark",
    accept: "image/png,image/jpeg,image/svg+xml,image/webp",
  },
  favicon_url: {
    title: "Favicon",
    description: "Ikon kecil di tab browser & hasil pencarian Google. Format ICO, PNG, atau SVG (32x32 disarankan).",
    folder: "favicon",
    accept: "image/png,image/x-icon,image/svg+xml,image/vnd.microsoft.icon",
  },
};

const BrandingManager = () => {
  const { branding, faviconUrl } = useBranding();
  const { toast } = useToast();
  const [brandName, setBrandName] = useState(branding.brand_name);
  const [siteTitle, setSiteTitle] = useState(branding.site_title ?? "");
  const [siteDescription, setSiteDescription] = useState(branding.site_description ?? "");
  const [uploadingSlot, setUploadingSlot] = useState<Slot | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [savingSite, setSavingSite] = useState(false);

  useEffect(() => {
    setBrandName(branding.brand_name);
    setSiteTitle(branding.site_title ?? "");
    setSiteDescription(branding.site_description ?? "");
  }, [branding.brand_name, branding.site_title, branding.site_description]);

  const handleUpload = async (slot: Slot, file: File) => {
    setUploadingSlot(slot);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${SLOT_META[slot].folder}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("branding")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: updateErr } = await supabase
        .from("app_branding")
        .update({ [slot]: publicUrl, updated_by: (await supabase.auth.getUser()).data.user?.id })
        .eq("id", 1);
      if (updateErr) throw updateErr;

      toast({ title: "Berhasil diunggah", description: SLOT_META[slot].title + " telah diperbarui." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal mengunggah", description: err.message });
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRemove = async (slot: Slot) => {
    try {
      const { error } = await supabase
        .from("app_branding")
        .update({ [slot]: null })
        .eq("id", 1);
      if (error) throw error;
      toast({ title: "Logo dihapus", description: "Aplikasi akan menggunakan logo bawaan." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal menghapus", description: err.message });
    }
  };

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("app_branding")
        .update({ brand_name: brandName.trim() || "Sahabat Stroban" })
        .eq("id", 1);
      if (error) throw error;
      toast({ title: "Nama brand disimpan" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: err.message });
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveSite = async () => {
    setSavingSite(true);
    try {
      const { error } = await supabase
        .from("app_branding")
        .update({
          site_title: siteTitle.trim() || null,
          site_description: siteDescription.trim() || null,
        })
        .eq("id", 1);
      if (error) throw error;
      toast({ title: "Pengaturan situs disimpan", description: "Judul tab browser & deskripsi diperbarui." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: err.message });
    } finally {
      setSavingSite(false);
    }
  };

  const previewTitle = siteTitle.trim() || `${brandName || "Sahabat Stroban"} - Servis Mobil & Loyalty Rewards`;
  const descLen = siteDescription.length;
  const descStatus =
    descLen === 0
      ? { tone: "text-muted-foreground", msg: "Belum diisi — Google akan memakai cuplikan otomatis." }
      : descLen < 120
      ? { tone: "text-amber-500", msg: `${descLen} karakter — tambahkan kata kunci & lokasi (ideal 120-160).` }
      : descLen <= 160
      ? { tone: "text-emerald-500", msg: `${descLen} karakter — panjang ideal untuk hasil pencarian.` }
      : descLen <= 200
      ? { tone: "text-amber-500", msg: `${descLen} karakter — sedikit terlalu panjang, Google bisa memotong.` }
      : { tone: "text-red-500", msg: `${descLen} karakter — terlalu panjang, akan terpotong di hasil pencarian.` };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Nama Brand</CardTitle>
          <CardDescription>Tampil di navbar, footer, dan judul halaman.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Sahabat Stroban"
            className="flex-1"
          />
          <Button onClick={handleSaveName} disabled={savingName}>
            {savingName ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> Tampilan di Browser & Mesin Pencari
          </CardTitle>
          <CardDescription>
            Atur judul yang muncul di tab browser dan deskripsi yang muncul di hasil pencarian Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Browser tab preview */}
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground mb-2">Pratinjau tab browser:</p>
            <div className="inline-flex items-center gap-2 max-w-full bg-background rounded-t-md border border-b-0 px-3 py-1.5 shadow-sm">
              {faviconUrl ? (
                <img src={faviconUrl} alt="favicon" className="h-3.5 w-3.5 object-contain shrink-0" />
              ) : (
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="text-xs font-medium truncate max-w-[260px]">{previewTitle}</span>
              <span className="text-muted-foreground text-xs">×</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-title">Judul Tab Browser</Label>
            <Input
              id="site-title"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder={`${brandName || "Sahabat Stroban"} - Servis Mobil & Loyalty Rewards`}
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              Kosongkan untuk pakai default. Maks 60 karakter agar tidak terpotong di Google.
            </p>
            <p className="text-[11px] text-amber-500/90">
              Catatan: perubahan judul muncul di tab browser saat aplikasi dibuka di domain publik (mis. bengkelstroban.com). Tab editor Lovable (lovable.dev) menampilkan nama project Lovable dan tidak bisa diubah dari sini.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Favicon yang tampil di hasil pencarian Google diambil dari file statis saat build. Setelah mengganti favicon di sini, lakukan Publish ulang agar Google & tampilan awal tab browser ikut diperbarui (Google bisa butuh beberapa hari untuk re-crawl).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-desc">Deskripsi Situs (SEO)</Label>
            <Textarea
              id="site-desc"
              rows={3}
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              placeholder="Bengkel mobil terpercaya dengan layanan servis lengkap, suku cadang asli, dan program loyalty rewards untuk pelanggan setia."
              maxLength={300}
            />
            <p className={`text-xs ${descStatus.tone}`}>{descStatus.msg}</p>

            {/* Rekomendasi SEO */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Tips menulis deskripsi SEO yang baik
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
                <li>Panjang ideal 120-160 karakter agar tidak terpotong di Google.</li>
                <li>Sebut layanan utama (servis berkala, ganti oli, tune up, ban).</li>
                <li>Sertakan lokasi cabang (Bandung, Tasikmalaya, Cirebon, Yogyakarta).</li>
                <li>Tambahkan benefit unik: loyalty rewards, booking online, garansi.</li>
                <li>Mulai dengan nama brand "Sahabat Stroban" untuk memperkuat brand recall.</li>
              </ul>
              <div className="pt-1 space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> Pakai rekomendasi siap pakai:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SEO_RECOMMENDATIONS.map((r) => (
                    <Button
                      key={r.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => setSiteDescription(r.value)}
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveSite} disabled={savingSite}>
            {savingSite ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan Pengaturan Situs
          </Button>
        </CardContent>
      </Card>

      {(Object.keys(SLOT_META) as Slot[]).map((slot) => {
        const meta = SLOT_META[slot];
        const url = branding[slot];
        const previewUrl = url || (slot === "logo_light_url" ? FALLBACK_LOGO : null);
        const isDarkPreview = slot === "logo_dark_url";
        return (
          <SlotCard
            key={slot}
            title={meta.title}
            description={meta.description}
            accept={meta.accept}
            previewUrl={previewUrl}
            isDarkPreview={isDarkPreview}
            uploading={uploadingSlot === slot}
            hasCustom={!!url}
            onUpload={(file) => handleUpload(slot, file)}
            onRemove={() => handleRemove(slot)}
          />
        );
      })}
    </div>
  );
};

interface SlotCardProps {
  title: string;
  description: string;
  accept: string;
  previewUrl: string | null;
  isDarkPreview: boolean;
  uploading: boolean;
  hasCustom: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

const SlotCard = ({ title, description, accept, previewUrl, isDarkPreview, uploading, hasCustom, onUpload, onRemove }: SlotCardProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`flex items-center justify-center h-32 rounded-lg border ${
            isDarkPreview ? "bg-foreground" : "bg-muted/40"
          }`}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={title} className="max-h-20 max-w-[80%] object-contain" />
          ) : (
            <div className="flex flex-col items-center text-muted-foreground gap-1">
              <ImageIcon className="h-6 w-6" />
              <span className="text-xs">Belum ada gambar</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading} size="sm">
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {hasCustom ? "Ganti" : "Unggah"}
          </Button>
          {hasCustom && (
            <Button onClick={onRemove} variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandingManager;