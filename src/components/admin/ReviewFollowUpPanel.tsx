import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Star, X, Bell } from "lucide-react";
import { format } from "date-fns";
import ManualReviewDialog, { ManualReviewBooking } from "./ManualReviewDialog";

interface PendingBooking {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  user_id: string;
  updated_at: string;
  review_reminder_due_at: string | null;
  branch: string | null;
}

export default function ReviewFollowUpPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [active, setActive] = useState<ManualReviewBooking | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    // Booking yang completed, belum di-dismiss
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id,customer_name,customer_phone,service_name,user_id,updated_at,review_reminder_due_at,branch")
      .eq("service_status", "completed")
      .eq("review_reminder_dismissed", false)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (!bookings) {
      setItems([]);
      setLoading(false);
      return;
    }
    // Exclude yang sudah punya review
    const ids = bookings.map((b) => b.id);
    const { data: reviews } = ids.length
      ? await supabase.from("booking_reviews").select("booking_id").in("booking_id", ids)
      : { data: [] as any[] };
    const reviewed = new Set((reviews || []).map((r: any) => r.booking_id));
    setItems((bookings as any[]).filter((b) => !reviewed.has(b.id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openWhatsApp = (b: PendingBooking) => {
    const phone = (b.customer_phone || "").replace(/\D/g, "").replace(/^0/, "62");
    const msg = encodeURIComponent(
      `Halo ${b.customer_name}, terima kasih sudah menggunakan layanan ${b.service_name} di Sahabat Stroban Service. Bagaimana pengalaman service Anda? Mohon tanggapannya 🙏`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const openReview = (b: PendingBooking) => {
    setActive({
      id: b.id, user_id: b.user_id, customer_name: b.customer_name, service_name: b.service_name,
    });
    setDialogOpen(true);
  };

  const dismiss = async (b: PendingBooking) => {
    const { error } = await supabase
      .from("bookings")
      .update({ review_reminder_dismissed: true })
      .eq("id", b.id);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== b.id));
  };

  if (!loading && items.length === 0) return null;

  return (
    <>
      <Card className="border-yellow-500/40 bg-yellow-500/5 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-yellow-600" />
            Follow-up Review Pelanggan
            <Badge variant="secondary" className="ml-1">{items.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <div className="space-y-2">
              {items.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-background border"
                >
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-medium text-sm">{b.customer_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.service_name} • Selesai {format(new Date(b.updated_at), "dd MMM HH:mm")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openWhatsApp(b)} className="gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" /> WA
                    </Button>
                    <Button size="sm" onClick={() => openReview(b)} className="gap-1.5">
                      <Star className="h-3.5 w-3.5" /> Input Review
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => dismiss(b)} aria-label="Skip">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ManualReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        booking={active}
        onSaved={fetchItems}
      />
    </>
  );
}