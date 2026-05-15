import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, CheckCircle2, Bug, Wrench, Lightbulb } from "lucide-react";

type Category = "bug" | "revisi" | "masukan";

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface PublicFeedbackFormProps {
  onSubmitted?: () => void;
}

const PublicFeedbackForm = ({ onSubmitted }: PublicFeedbackFormProps = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [category, setCategory] = useState<Category>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const meta = (user.user_metadata || {}) as any;
      setName(meta.full_name || meta.name || "");
      setEmail(user.email || "");
      setPhone(meta.phone || "");
    }
  }, [user]);

  const handleFile = (f: File | null) => {
    if (!f) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: "Gambar terlalu besar", description: "Maksimal 5MB", variant: "destructive" });
      return;
    }
    setImageFile(f);
    const url = URL.createObjectURL(f);
    setImagePreview(url);
  };

  const submit = async () => {
    if (title.trim().length < 5) {
      toast({ title: "Judul terlalu pendek", description: "Minimal 5 karakter", variant: "destructive" });
      return;
    }
    if (description.trim().length < 10) {
      toast({ title: "Deskripsi terlalu pendek", description: "Minimal 10 karakter", variant: "destructive" });
      return;
    }
    if (!user) {
      if (!name.trim()) {
        toast({ title: "Nama wajib diisi", variant: "destructive" });
        return;
      }
      if (!email.trim() && !phone.trim()) {
        toast({ title: "Email atau nomor WA wajib diisi", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      let image_data_url: string | null = null;
      let image_mime: string | null = null;
      if (imageFile) {
        image_data_url = await fileToDataUrl(imageFile);
        image_mime = imageFile.type;
      }

      const { data, error } = await supabase.functions.invoke("submit-public-feedback", {
        body: {
          category,
          title: title.trim(),
          description: description.trim(),
          page_url: pageUrl.trim() || null,
          image_data_url,
          image_mime,
          reporter_name: name.trim() || undefined,
          reporter_email: email.trim() || undefined,
          reporter_phone: phone.trim() || undefined,
          user_agent: navigator.userAgent,
        },
      });

      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Gagal mengirim");
      }
      setDone(true);
      onSubmitted?.();
    } catch (e: any) {
      toast({ title: "Gagal mengirim", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setCategory("bug");
    setTitle("");
    setDescription("");
    setImageFile(null);
    setImagePreview(null);
    setDone(false);
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-8 text-center space-y-4">
        <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-semibold">Terima kasih!</h2>
        <p className="text-sm text-muted-foreground">
          Masukan Anda telah kami terima. Tim kami akan segera meninjau.
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={reset}>Kirim Laporan Lain</Button>
          <Button asChild><a href="/">Kembali ke Beranda</a></Button>
        </div>
      </div>
    );
  }

  const catIcons: Record<Category, any> = { bug: Bug, revisi: Wrench, masukan: Lightbulb };
  const Icon = catIcons[category];

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          Form Masukan & Laporan
        </h2>
        <p className="text-xs text-muted-foreground">
          Kami baca semua masukan. Untuk hal mendesak, hubungi WhatsApp{" "}
          <a className="text-primary underline" href="https://wa.me/628973700800" target="_blank" rel="noreferrer">
            +62 897-3700-800
          </a>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <Select value={category} onValueChange={(v: Category) => setCategory(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">🐞 Bug / Error</SelectItem>
              <SelectItem value="revisi">🔧 Revisi / Permintaan perubahan</SelectItem>
              <SelectItem value="masukan">💡 Masukan / Saran</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Halaman terkait (opsional)</Label>
          <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="/halaman-bermasalah" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Judul singkat <span className="text-destructive">*</span></Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Tombol pesan tidak bisa diklik"
          maxLength={120}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Detail keluhan / saran <span className="text-destructive">*</span></Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Jelaskan apa yang terjadi, langkah-langkahnya, atau masukan Anda..."
          rows={5}
          maxLength={2000}
        />
        <p className="text-[11px] text-muted-foreground">{description.length}/2000</p>
      </div>

      <div className="space-y-1.5">
        <Label>Lampirkan screenshot (opsional, max 5MB)</Label>
        {imagePreview ? (
          <div className="relative inline-block">
            <img src={imagePreview} alt="" className="max-h-40 rounded-md border" />
            <button
              type="button"
              onClick={() => handleFile(null)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
              aria-label="Hapus"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-md cursor-pointer hover:bg-muted/40 text-sm">
            <Upload className="h-4 w-4" />
            <span>Pilih gambar</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </label>
        )}
      </div>

      <div className="rounded-xl border border-border/40 p-3 bg-background/40 space-y-3">
        <div className="text-xs font-medium text-muted-foreground">
          {user ? "Identitas (otomatis dari akun Anda)" : "Identitas (wajib diisi)"}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Nama {!user && <span className="text-destructive">*</span>}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!!user} />
          </div>
          <div className="space-y-1.5">
            <Label>Email {!user && <span className="text-muted-foreground text-[11px]">(atau WA)</span>}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!user} />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp {!user && <span className="text-muted-foreground text-[11px]">(atau email)</span>}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!!user} placeholder="08xxxx" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={submit} disabled={submitting} className="gap-2">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Kirim Laporan
        </Button>
      </div>
    </div>
  );
};

export default PublicFeedbackForm;