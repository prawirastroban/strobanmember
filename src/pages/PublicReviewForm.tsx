import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookingInfo {
  booking_id: string;
  customer_name: string;
  service_name: string;
  branch: string | null;
  already_submitted: boolean;
}

export default function PublicReviewForm() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_review_booking_info", { _token: token });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setNotFound(true);
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        setInfo(row as BookingInfo);
        if ((row as BookingInfo).already_submitted) setDone(true);
      }
      setLoading(false);
    })();
  }, [token]);

  const submit = async () => {
    if (!token) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_customer_review", {
      _token: token,
      _rating: rating,
      _review_text: text,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Gagal mengirim", description: error.message, variant: "destructive" });
      return;
    }
    const res = data as any;
    if (!res?.ok) {
      const map: Record<string, string> = {
        invalid_token: "Link tidak valid atau sudah kadaluarsa.",
        invalid_rating: "Rating harus 1-5.",
        already_submitted: "Review sudah pernah dikirim. Terima kasih!",
      };
      toast({ title: "Tidak bisa diproses", description: map[res?.error] || res?.error, variant: "destructive" });
      if (res?.error === "already_submitted") setDone(true);
      return;
    }
    setDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-lg font-semibold">Link tidak valid</p>
            <p className="text-sm text-muted-foreground">
              Link review ini tidak ditemukan atau sudah tidak berlaku.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <p className="text-lg font-semibold">Terima kasih! 🙏</p>
            <p className="text-sm text-muted-foreground">
              Tanggapan Anda sudah kami terima dan akan kami gunakan untuk meningkatkan layanan.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">Bagaimana pengalaman Anda?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="text-center text-sm">
            <p className="font-medium">{info?.customer_name}</p>
            <p className="text-muted-foreground">
              {info?.service_name}{info?.branch ? ` • ${info.branch}` : ""}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-center">Berikan rating</p>
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${n} bintang`}
                >
                  <Star
                    className={`h-10 w-10 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Tanggapan / Keluhan (opsional)</p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Ceritakan pengalaman Anda..."
            />
          </div>

          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Kirim
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Sahabat Stroban Service • bengkelstroban.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
}