import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Star } from "lucide-react";

export interface ManualReviewBooking {
  id: string;
  user_id?: string;
  customer_name: string;
  service_name: string;
}

interface ExistingReview {
  id: string;
  rating: number;
  review_text: string | null;
  service_quality: string;
  would_recommend: string;
  follow_up_method: string | null;
  internal_note: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: ManualReviewBooking | null;
  onSaved?: () => void;
}

export default function ManualReviewDialog({ open, onOpenChange, booking, onSaved }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<ExistingReview | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [quality, setQuality] = useState("puas");
  const [recommend, setRecommend] = useState("ya");
  const [method, setMethod] = useState("whatsapp");
  const [internalNote, setInternalNote] = useState("");

  useEffect(() => {
    if (!open || !booking) return;
    (async () => {
      const { data } = await supabase
        .from("booking_reviews")
        .select("*")
        .eq("booking_id", booking.id)
        .maybeSingle();
      if (data) {
        setExisting(data as any);
        setRating(data.rating);
        setReviewText(data.review_text || "");
        setQuality(data.service_quality);
        setRecommend(data.would_recommend);
        setMethod(data.follow_up_method || "whatsapp");
        setInternalNote(data.internal_note || "");
      } else {
        setExisting(null);
        setRating(5);
        setReviewText("");
        setQuality("puas");
        setRecommend("ya");
        setMethod("whatsapp");
        setInternalNote("");
      }
    })();
  }, [open, booking]);

  const save = async () => {
    if (!booking) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      booking_id: booking.id,
      user_id: booking.user_id,
      rating,
      review_text: reviewText.trim() || null,
      service_quality: quality,
      would_recommend: recommend,
      follow_up_method: method,
      follow_up_status: "completed",
      follow_up_at: new Date().toISOString(),
      internal_note: internalNote.trim() || null,
      created_by: user?.id,
    };
    const { error } = existing
      ? await supabase.from("booking_reviews").update(payload).eq("id", existing.id)
      : await supabase.from("booking_reviews").insert(payload);
    setLoading(false);
    if (error) {
      toast({ title: "Gagal menyimpan review", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: existing ? "Review diperbarui" : "Review tersimpan" });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Review Pelanggan" : "Input Review Pelanggan"}</DialogTitle>
          <DialogDescription>
            {booking?.customer_name} — {booking?.service_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Rating</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${n} bintang`}
                >
                  <Star
                    className={`h-8 w-8 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="rev-text">Tanggapan Pelanggan</Label>
            <Textarea
              id="rev-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tulis ulang tanggapan pelanggan..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Kualitas Layanan</Label>
            <RadioGroup value={quality} onValueChange={setQuality} className="flex gap-4 mt-2">
              {[
                { v: "puas", l: "Puas" },
                { v: "biasa", l: "Biasa" },
                { v: "kecewa", l: "Kecewa" },
              ].map((o) => (
                <div key={o.v} className="flex items-center gap-2">
                  <RadioGroupItem value={o.v} id={`q-${o.v}`} />
                  <Label htmlFor={`q-${o.v}`} className="font-normal cursor-pointer">{o.l}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label>Mau Merekomendasikan?</Label>
            <RadioGroup value={recommend} onValueChange={setRecommend} className="flex gap-4 mt-2">
              {[
                { v: "ya", l: "Ya" },
                { v: "tidak", l: "Tidak" },
                { v: "belum_yakin", l: "Belum Yakin" },
              ].map((o) => (
                <div key={o.v} className="flex items-center gap-2">
                  <RadioGroupItem value={o.v} id={`r-${o.v}`} />
                  <Label htmlFor={`r-${o.v}`} className="font-normal cursor-pointer">{o.l}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label>Metode Follow-up</Label>
            <RadioGroup value={method} onValueChange={setMethod} className="flex gap-4 mt-2">
              {[
                { v: "whatsapp", l: "WhatsApp" },
                { v: "phone", l: "Telepon" },
                { v: "in_person", l: "Langsung" },
              ].map((o) => (
                <div key={o.v} className="flex items-center gap-2">
                  <RadioGroupItem value={o.v} id={`m-${o.v}`} />
                  <Label htmlFor={`m-${o.v}`} className="font-normal cursor-pointer">{o.l}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="int-note">Catatan Internal (opsional)</Label>
            <Textarea
              id="int-note"
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Catatan internal tidak ditampilkan ke pelanggan"
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Batal</Button>
          <Button onClick={save} disabled={loading}>{loading ? "Menyimpan..." : "Simpan Review"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}