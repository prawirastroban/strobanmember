import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = [
  { value: "umum", label: "Pertanyaan Umum" },
  { value: "booking", label: "Masalah Booking" },
  { value: "pembayaran", label: "Pembayaran / Refund" },
  { value: "servis", label: "Hasil Servis / Garansi" },
  { value: "akun", label: "Akun & Data Pribadi" },
  { value: "lainnya", label: "Lainnya" },
];

const ContactComplaintForm = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [category, setCategory] = useState("umum");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim() || (!phone.trim() && !email.trim())) {
      toast.error("Mohon lengkapi nama, pesan, dan minimal salah satu kontak (telepon/email).");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from("customer_complaints").insert({
      user_id: user?.id ?? null,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      category,
      message: message.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Gagal mengirim pengaduan: " + error.message);
      return;
    }
    toast.success("Pengaduan terkirim. Tim kami akan menindaklanjuti maksimal 2x24 jam.");
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-xl border bg-muted/30 p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />
        <p className="font-medium">Terima kasih, pengaduan Anda telah kami terima.</p>
        <p className="text-sm text-muted-foreground mt-1">Tim akan menghubungi Anda melalui kontak yang diberikan.</p>
        <Button variant="outline" className="mt-4" onClick={() => { setDone(false); setMessage(""); }}>Kirim pengaduan lain</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cc-name">Nama Lengkap *</Label>
          <Input id="cc-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="cc-cat">Kategori</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="cc-cat"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="cc-phone">No. WhatsApp</Label>
          <Input id="cc-phone" placeholder="08xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cc-email">Email</Label>
          <Input id="cc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="cc-msg">Pesan / Rincian Pengaduan *</Label>
        <Textarea id="cc-msg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
      </div>
      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Kirim Pengaduan
      </Button>
      <p className="text-xs text-muted-foreground">Dengan mengirim, Anda menyetujui data kontak Anda diproses oleh tim kami sesuai Kebijakan Privasi.</p>
    </form>
  );
};

export default ContactComplaintForm;