import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Star, Bell, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import ManualReviewDialog, { ManualReviewBooking } from "./ManualReviewDialog";
import ReviewReminderSettings from "./ReviewReminderSettings";
import { openWhatsApp as launchWhatsApp } from "@/lib/whatsapp";

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
  customer_submitted?: boolean;
}

const DEFAULT_TEMPLATE = `Halo {name} 👋\n\nTerima kasih sudah menggunakan layanan *{service}* di *Sahabat Stroban Service*.\n\nMohon luangkan waktu sebentar untuk memberi rating & tanggapan Anda di link berikut:\n{link}\n\nAtau Anda boleh balas pesan ini langsung. Tanggapan Anda sangat berarti bagi kami 🙏`;

const generateToken = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
  ).replace(/-/g, "").slice(0, 24);

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
      .select("id,customer_name,customer_phone,service_name,user_id,updated_at,review_reminder_due_at,branch,review_submission_token")
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

  const openWhatsApp = async (b: PendingBooking) => {
    setWaBusy(b.id);
    try {
      // Ensure a unique review token exists for this booking
      let token = b.review_submission_token;
      if (!token) {
        token = generateToken();
        const { error: upErr } = await supabase
          .from("bookings")
          .update({ review_submission_token: token })
          .eq("id", b.id);
        if (upErr) {
          // fallback: use short token even if persistence failed (won't open form)
          console.warn("Failed to persist review token", upErr);
        } else {
          setItems((prev) =>
            prev.map((it) => (it.id === b.id ? { ...it, review_submission_token: token } : it)),
          );
        }
      }

      // Load admin-editable template from app_settings
      const { data: tplRow } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "review_reminder_template")
        .maybeSingle();
      const tpl = (tplRow?.value as any) || {};
      const rawMessage: string = tpl.message || DEFAULT_TEMPLATE;
      const includeLink: boolean = tpl.include_link !== false;

      // Selalu gunakan www domain (apex bengkelstroban.com tidak melayani SPA deep routes)
      const origin = "https://www.bengkelstroban.com";
      const link = token ? `${origin}/review/${token}` : "";

      let message = rawMessage
        .split("{name}").join(b.customer_name || "Pelanggan")
        .split("{service}").join(b.service_name || "servis")
        .split("{branch}").join(b.branch || "Sahabat Stroban Service")
        .split("{link}").join(link);

      // If template doesn't reference {link} but link should be included, append it
      if (includeLink && link && !rawMessage.includes("{link}")) {
        message = `${message}\n\n${link}`;
      }

      launchWhatsApp({ phone: b.customer_phone, text: message });
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
              {items.map((b) => (
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
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.service_name} • Selesai {format(new Date(b.updated_at), "dd MMM HH:mm")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openWhatsApp(b)}
                      disabled={waBusy === b.id}
                      className="gap-1.5"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WA
                    </Button>
                    <Button size="sm" onClick={() => openReview(b)} className="gap-1.5">
                      <Star className="h-3.5 w-3.5" /> Input Review
                    </Button>
                  </div>
                </div>
              ))}
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