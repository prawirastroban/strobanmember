import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Star, Bell, ChevronDown, ChevronUp, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import ManualReviewDialog, { ManualReviewBooking } from "./ManualReviewDialog";
import ReviewReminderSettings from "./ReviewReminderSettings";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PendingBooking {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  user_id: string;
  updated_at: string;
  review_reminder_due_at: string | null;
  branch: string | null;
  review_submission_token: string | null;
  review_reminder_sent_at: string | null;
  customer_submitted?: boolean;
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let p = raw.replace(/\D/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (p.startsWith("8")) p = "62" + p;
  if (!p.startsWith("62")) return null;
  if (p.length < 11 || p.length > 15) return null;
  if (!p.startsWith("628")) return null;
  const tail = p.slice(2);
  if (/^(\d)\1+$/.test(tail)) return null;
  if (tail.startsWith("000") || tail.startsWith("8000000")) return null;
  return p;
}

export default function ReviewFollowUpPanel() {
  const [items, setItems] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [active, setActive] = useState<ManualReviewBooking | null>(null);
  const [waBusy, setWaBusy] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("review_followup_collapsed") !== "false";
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("review_followup_collapsed", String(next)); } catch {}
      return next;
    });
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    // Booking yang selesai, belum di-dismiss.
    // Gunakan fallback status karena sebagian data lama belum sinkron ke service_status.
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id,customer_name,customer_phone,service_name,user_id,updated_at,review_reminder_due_at,branch,review_submission_token,review_reminder_sent_at")
      .or("service_status.eq.completed,status.eq.completed")
      .eq("review_reminder_dismissed", false)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error || !bookings) {
      setItems([]);
      setLoading(false);
      return;
    }
    // Exclude yang sudah punya review
    const ids = bookings.map((b) => b.id);
    const { data: reviews } = ids.length
      ? await supabase.from("booking_reviews").select("booking_id, follow_up_status, submitted_via").in("booking_id", ids)
      : { data: [] as any[] };
    // "reviewed" = finalised by admin (follow_up_status = 'completed')
    // Customer-submitted (pending_admin_review) tetap muncul, ditandai badge.
    const finalisedSet = new Set(
      (reviews || []).filter((r: any) => r.follow_up_status === "completed").map((r: any) => r.booking_id)
    );
    const customerSubmittedSet = new Set(
      (reviews || []).filter((r: any) => r.submitted_via === "customer_form" && r.follow_up_status !== "completed").map((r: any) => r.booking_id)
    );
    setItems(
      (bookings as any[])
        .filter((b) => !finalisedSet.has(b.id))
        .map((b) => ({ ...b, customer_submitted: customerSubmittedSet.has(b.id) }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Auto-refresh badge "sudah dijawab pelanggan" when reviews land via the public form
  useEffect(() => {
    const channel = supabase
      .channel("admin-booking-reviews")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_reviews" },
        () => fetchItems(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  const sendReviewWA = async (b: PendingBooking) => {
    setWaBusy(b.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-review-reminders", {
        body: { force: true, booking_ids: [b.id], limit: 1, throttle_ms: 0 },
      });
      if (error) throw error;
      const result = (data?.results || [])[0];
      if (result?.status === "sent") {
        const sentAt = new Date().toISOString();
        setItems((prev) => prev.map((it) => (it.id === b.id ? { ...it, review_reminder_sent_at: sentAt } : it)));
        toast.success("WA review terkirim", { description: `Pesan otomatis dikirim ke ${b.customer_name}` });
      } else if (result?.status === "skip_invalid_phone") {
        toast.error("Nomor WA tidak valid", { description: "Periksa nomor pelanggan." });
      } else if (result?.status === "skip_circuit_open") {
        toast.error("Pengiriman dihentikan", { description: "Device Fonnte mungkin di-block." });
      } else if (result?.status === "failed" || result?.status === "error") {
        toast.error("Gagal mengirim WA", { description: result?.error || "Coba lagi." });
      } else {
        toast.error("Pengiriman tidak diproses", { description: data?.hint || data?.message || "Tidak ada target." });
      }
    } catch (e: any) {
      toast.error("Gagal mengirim WA", { description: e?.message || String(e) });
    } finally {
      setWaBusy(null);
    }
  };

  const openReview = (b: PendingBooking) => {
    setActive({
      id: b.id, user_id: b.user_id, customer_name: b.customer_name, service_name: b.service_name,
    });
    setDialogOpen(true);
  };

  return (
    <>
      <Card className={`mb-4 ${items.length === 0 ? "border-border bg-muted/30" : "border-yellow-500/40 bg-yellow-500/5"}`}>
        <CardHeader className={collapsed ? "py-2" : "pb-3"}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 shrink-0 text-yellow-600" />
            <span className="truncate">Follow-up Review Pelanggan</span>
            <Badge variant="secondary" className="ml-1 shrink-0">{items.length}</Badge>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <ReviewReminderSettings />
              {items.length > 0 && (
              <Button
              size="sm"
              variant="ghost"
              onClick={toggleCollapsed}
              className="h-7 px-2 text-xs gap-1 whitespace-nowrap"
            >
              {collapsed ? (
                <>
                  <span className="hidden sm:inline">Tampilkan</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Sembunyikan</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              )}
              </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        {!collapsed && items.length > 0 && (
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <div className="space-y-2">
              {items.map((b) => {
                const phoneValid = !!normalizePhone(b.customer_phone);
                const alreadySent = !!b.review_reminder_sent_at;
                return (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-background border"
                >
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-medium text-sm flex items-center gap-1.5 flex-wrap">
                      {b.customer_name}
                      {b.customer_submitted && (
                        <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15 border-green-500/30 text-[10px] py-0 h-4">
                          📩 Sudah dijawab pelanggan
                        </Badge>
                      )}
                      {!b.customer_submitted && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 text-muted-foreground">
                          Belum review
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.service_name} • Selesai {format(new Date(b.updated_at), "dd MMM HH:mm")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alreadySent ? (
                      <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15 border-green-500/30 gap-1 h-7 px-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Terkirim · {format(new Date(b.review_reminder_sent_at!), "HH:mm")}
                      </Badge>
                    ) : !phoneValid ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button size="sm" variant="outline" disabled className="gap-1.5 opacity-60 cursor-not-allowed">
                                <MessageCircle className="h-3.5 w-3.5" /> WA
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Nomor WA tidak valid</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendReviewWA(b)}
                        disabled={waBusy === b.id}
                        className="gap-1.5"
                        title="Kirim template review otomatis via WhatsApp"
                      >
                        {waBusy === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                        Kirim WA
                      </Button>
                    )}
                    <Button size="sm" onClick={() => openReview(b)} className="gap-1.5">
                      <Star className="h-3.5 w-3.5" /> Input Review
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
        )}
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